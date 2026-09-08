import {readFile,readdir,mkdir,rm,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
const root=resolve(import.meta.dirname,'..');
const data=await readFile(join(root,'src/data/photo-galleries.ts'),'utf8');
const photos=JSON.parse(data.split(' = ')[1].split(';\nexport')[0]);
const galleries=JSON.parse(data.split(' = ')[2].trim().replace(/;$/,''));
const selected=[...new Set(Object.values(galleries).flat())];
const folder=join(root,'public/media/stories');
await rm(folder,{recursive:true,force:true});await mkdir(folder,{recursive:true});
const files=await readdir(join(root,'src/assets/stories'));const result={};
for(const key of selected){
 const name=files.find(n=>n.replace(/\.[^.]+$/,'')===key);if(!name)throw Error(`Missing image ${key}`);
 const input=await readFile(join(root,'src/assets/stories',name));const meta=await sharp(input).metadata();
 const rotated=[5,6,7,8].includes(meta.orientation);const width=rotated?meta.height:meta.width;const height=rotated?meta.width:meta.height;
 const sizes=[...new Set([400,800,1200,1800].map(n=>Math.min(n,width)))];const variants=[];
 for(const w of sizes){const output=await sharp(input).rotate().resize({width:w,withoutEnlargement:true}).webp({quality:w >= 1200 ? 78 : 72,effort:6}).toBuffer();const hash=createHash('sha256').update(output).digest('hex').slice(0,10);const file=`${key}-${w}-${hash}.webp`;await writeFile(join(folder,file),output);variants.push({width:w,src:`/media/stories/${file}`});}
 const owner=Object.entries(galleries).find(([path,keys])=>path.startsWith('/years/')&&keys.includes(key))?.[0]??Object.entries(galleries).find(([,keys])=>keys.includes(key))[0];
 result[key]={...photos[key],width,height,src:variants.find(v=>v.width>=800)?.src??variants.at(-1).src,thumb:variants[0].src,large:variants.at(-1).src,srcset:variants.map(v=>`${v.src} ${v.width}w`).join(', '),owner};
}
await mkdir(join(root,'src/generated'),{recursive:true});await writeFile(join(root,'src/generated/media.json'),JSON.stringify(result,null,2));
// Raster preview shared by general pages; years and projects get their own artwork.
const social=join(root,'public/social');await mkdir(social,{recursive:true});
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;');
async function card(name,title,img){const base=await sharp(Buffer.from(`<svg width="1200" height="630"><rect width="1200" height="630" fill="#f8f5ed"/><text x="65" y="100" font-size="30" fill="#3c6545">mejohnc.org</text><text x="65" y="200" font-size="45" fill="#303b31">${escape(title)}</text><text x="65" y="565" font-size="28" fill="#303b31">Jonathan Christensen</text></svg>`)).png().toBuffer();const composites=img?[{input:await sharp(img).resize(440,300,{fit:'cover'}).png().toBuffer(),left:695,top:260}]:[];await sharp(base).composite(composites).png().toFile(join(social,name+'.png'));}
await card('default','Tools, work, and life');
const index=await readFile(join(root,'src/pages/years/index.astro'),'utf8');const entries=JSON.parse(index.match(/const years = (\[.*?\]);/s)[1]);
for(const entry of entries)await card(entry.year,entry.year+' · Through the years',entry.photo?join(root,'public',result[entry.photo].thumb):undefined);
for(const slug of ['service-toolbox','client-toolbox','vantage'])await card(slug,slug.split('-').map(s=>s[0].toUpperCase()+s.slice(1)).join(' '),join(root,'public/demos/previews',slug+'.svg'));
console.log(`Prepared ${selected.length} selected photos; archival originals excluded.`);
// Small previews for Territories. Full images remain available on demand.
const territoryRoot=join(root,'public/projects/territories');const thumbs={};
async function walk(dir){const out=[];for(const e of await readdir(dir,{withFileTypes:true})){const p=join(dir,e.name);if(e.isDirectory())out.push(...await walk(p));else out.push(p);}return out;}
await mkdir(join(territoryRoot,'thumbs'),{recursive:true});
for(const file of await walk(join(territoryRoot,'styles'))){if(!/\.(png|jpe?g|webp|avif)$/i.test(file))continue;const key=file.slice(territoryRoot.length+1);const bytes=await sharp(file).rotate().resize({width:480,withoutEnlargement:true}).webp({quality:70}).toBuffer();const name=createHash('sha256').update(bytes).digest('hex').slice(0,16)+'.webp';await writeFile(join(territoryRoot,'thumbs',name),bytes);thumbs[key]='thumbs/'+name;}
await writeFile(join(territoryRoot,'thumbs.js'),'window.territoryThumbs='+JSON.stringify(thumbs)+';');
