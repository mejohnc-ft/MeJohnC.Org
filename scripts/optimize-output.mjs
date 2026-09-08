import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {transform} from 'esbuild';
export async function optimizeOutput(directory){
 const root=fileURLToPath(directory),walk=async dir=>(await Promise.all((await fs.readdir(dir,{withFileTypes:true})).map(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]))).flat();
 let files=await walk(root);const before=(await Promise.all(files.map(async f=>(await fs.stat(f)).size))).reduce((a,b)=>a+b,0);
 const htmlFiles=files.filter(f=>f.endsWith('.html'));const pages=new Map(await Promise.all(htmlFiles.map(async f=>[f,await fs.readFile(f,'utf8')])));
 // Existing public JPEG URLs remain usable; responsive displays use hashed WebP derivatives.
 const legacy=files.filter(f=>f.includes('/images/stories/')&&/\.jpe?g$/i.test(f));let removed=0;
 for(const f of legacy){const url='/'+path.relative(root,f),name=path.basename(f,path.extname(f));if(![...pages.values()].some(s=>s.includes(url))){await fs.unlink(f);removed++;continue;}
  const variants=[];for(const width of [400,800,1200,1800]){const data=await sharp(f).rotate().resize({width,withoutEnlargement:true}).webp({quality:78}).toBuffer();const hash=createHash('sha256').update(data).digest('hex').slice(0,12),out=`/media/legacy/${name}-${width}-${hash}.webp`;await fs.mkdir(path.join(root,'media/legacy'),{recursive:true});await fs.writeFile(path.join(root,out),data);variants.push({width,url:out});}
  for(const [page,html]of pages)pages.set(page,html.replace(/<img\b[^>]*>/g,tag=>tag.includes(`src="${url}"`)?tag.replace(`src="${url}"`,`src="${variants[1].url}" srcset="${variants.map(v=>`${v.url} ${v.width}w`).join(', ')}" sizes="(max-width:600px) 94vw, 780px"`):tag));
  // A bounded full view at the old URL, while originals remain in public/ and src/.
  const compact=await sharp(f).rotate().resize({width:1800,height:1800,fit:'inside',withoutEnlargement:true}).jpeg({quality:82,mozjpeg:true}).toBuffer();await fs.writeFile(f,compact);
 }
 const territoryFile=path.join(root,'projects/territories/index.html');let html=pages.get(territoryFile);const originalBytes=Buffer.byteLength(html);
 const referenced=new Set([...html.matchAll(/['"](styles\/[^'"\n]+\.(?:png|jpe?g|webp|avif))['"]/gi)].map(m=>m[1]));
 const territoryRoot=path.dirname(territoryFile),thumbFile=path.join(territoryRoot,'thumbs.js');const raw=await fs.readFile(thumbFile,'utf8');const thumbs=JSON.parse(raw.slice(raw.indexOf('=')+1).replace(/;\s*$/,''));const retained={};for(const [k,v]of Object.entries(thumbs))if(referenced.has(k))retained[k]=v;
 for(const f of files.filter(f=>f.startsWith(territoryRoot+'/styles/')&&/\.(png|jpe?g|webp|avif)$/i.test(f)))if(!referenced.has(path.relative(territoryRoot,f))){await fs.unlink(f);removed++;}
 const usedThumbs=new Set(Object.values(retained));for(const f of files.filter(f=>f.startsWith(territoryRoot+'/thumbs/')))if(!usedThumbs.has(path.relative(territoryRoot,f))){await fs.unlink(f);removed++;}
 await fs.writeFile(thumbFile,'window.territoryThumbs='+JSON.stringify(retained)+';');
 // Preserve global names across classic script blocks. Syntax/whitespace only.
 const blocks=[...html.matchAll(/<(script|style)(\s[^>]*)?>([\s\S]*?)<\/\1>/g)];
 for(const block of blocks){if(block[2]?.includes('src=')||!block[3].trim())continue;const result=await transform(block[3],{loader:block[1]==='style'?'css':'js',minifyWhitespace:true,minifySyntax:true,minifyIdentifiers:false,legalComments:'none',target:'es2022'});html=html.replace(block[0],`<${block[1]}${block[2]||''}>${result.code.replace(/<\/script/gi,'<\\/script')}</${block[1]}>`);}
 pages.set(territoryFile,html);for(const [f,s]of pages)await fs.writeFile(f,s);
 files=await walk(root);const after=(await Promise.all(files.map(async f=>(await fs.stat(f)).size))).reduce((a,b)=>a+b,0);
 console.log(`Output optimization: removed ${removed} unused images; ${(before/1048576).toFixed(1)} → ${(after/1048576).toFixed(1)} MiB. Territories HTML: ${Math.round(originalBytes/1024)} → ${Math.round(Buffer.byteLength(html)/1024)} KiB.`);
}
