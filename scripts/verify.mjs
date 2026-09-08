import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve, dirname, relative, join } from 'node:path';
import { createHash } from 'node:crypto';

const root = resolve(import.meta.dirname, '..');
const dist = join(root, 'dist');
const walk = async path => (await Promise.all((await readdir(path, { withFileTypes: true })).map(async entry => entry.isDirectory() ? walk(join(path, entry.name)) : [join(path, entry.name)]))).flat();
const files = await walk(dist);
const htmlFiles = files.filter(file => file.endsWith('.html'));
const errors = [];
let localReferences = 0;
let portfolioPages = 0;
async function targetExists(path) {
  try { const info = await stat(path); return info.isFile() || (info.isDirectory() && (await stat(join(path, 'index.html'))).isFile()); } catch { return false; }
}
for (const file of htmlFiles) {
  const html = await readFile(file, 'utf8');
  const name = relative(dist, file);
  if (!name.startsWith('projects/territories/') && !name.startsWith('demos/') && !name.startsWith('territories/')) {
    portfolioPages++;
    if (/<script\b/i.test(html.replace(/<script\b[^>]*data-site-theme[^>]*>[\s\S]*?<\/script>/gi, ""))) errors.push(`${name}: unexpected client script`);
    if (/(?:supabase\.co|clerk\.|\.netlify\/functions|localhost:|127\.0\.0\.1:)/i.test(html)) errors.push(`${name}: backend or local review dependency`);
  }
  for (const match of html.matchAll(/\b(?:href|src|data)\s*=\s*["']([^"']+)["']/g)) {
    const url = match[1].replaceAll('&amp;', '&');
    if (name.startsWith('projects/territories/') && url.includes('${')) continue; // Gallery templates are checked against their data paths below.
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(url)) continue;
    const [rawPath, fragment] = url.split('#');
    const cleanPath = decodeURIComponent(rawPath.split('?')[0]);
    const target = cleanPath ? (cleanPath.startsWith('/') ? resolve(dist, '.' + cleanPath) : resolve(dirname(file), cleanPath)) : file;
    if (!target.startsWith(dist)) { errors.push(`${name}: path escapes build: ${url}`); continue; }
    if (!(await targetExists(target))) errors.push(`${name}: missing ${url}`);
    else if (/^\/projects\/territories\/#style=[a-z0-9-]+$/.test(url)) {
      if (!(await targetExists(join(dist,'territories',fragment.slice(6),'index.html')))) errors.push(`${name}: unknown style ${url}`);
    } else if (fragment && !name.startsWith('projects/territories/')) {
      const targetFile = (await stat(target)).isDirectory() ? join(target, 'index.html') : target;
      if (targetFile.endsWith('.html')) {
        const content = await readFile(targetFile, 'utf8');
        if (!content.includes(`id="${decodeURIComponent(fragment)}"`) && !content.includes(`id='${decodeURIComponent(fragment)}'`)) errors.push(`${name}: missing anchor ${url}`);
      }
    }
    localReferences++;
  }
}
const territories = join(dist, 'projects/territories');
const territoryHtml = await readFile(join(territories, 'index.html'), 'utf8');
for (const removed of ['studio', 'typography', 'ux']) {
  assert.ok(!territoryHtml.includes(`id="section-${removed}"`), `Removed Territories view remains: ${removed}`);
  assert.ok(!territoryHtml.includes(`data-section="${removed}"`), `Removed Territories navigation remains: ${removed}`);
}
assert.ok(territoryHtml.includes('href="/projects/"'), 'Territories must retain a portfolio return link');
const paths = new Set([...territoryHtml.matchAll(/path:\s*['"](styles\/[^'"]+)['"]/g)].map(match => match[1]));
for (const path of paths) if (!(await targetExists(join(territories, path)))) errors.push(`Territories: missing ${path}`);
for (const file of files.filter(file => file.endsWith('.css'))) {
  const css = await readFile(file, 'utf8');
  for (const match of css.matchAll(/url\(["']?([^\s)'";]+)["']?\)/g)) {
    const url = match[1];
    if (/^(data:|https?:|#)/.test(url)) continue;
    const target = url.startsWith('/') ? resolve(dist, '.' + url) : resolve(dirname(file), url);
    if (!(await targetExists(target))) errors.push(`CSS: missing ${url}`);
  }
}
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
assert.equal(digest(await readFile(join(root, 'public/resume.pdf'))), digest(await readFile(join(dist, 'resume.pdf'))), 'Résumé changed in build');
assert.ok((await readFile(join(dist, 'index.html'), 'utf8')).includes('Territories'), 'Homepage must expose Territories');
assert.ok((await readFile(join(dist, 'media/index.html'), 'utf8')).includes('2026-09-04'), 'Case study date changed');
assert.ok((await readFile(join(dist, 'media/index.html'), 'utf8')).includes('2026-05-13'), 'May talk missing');
assert.equal(errors.length, 0, errors.join('\n'));
console.log(`Verified ${portfolioPages} portfolio/redirect pages, ${localReferences} local references, ${paths.size} Territories gallery assets, local font files, and the canonical résumé PDF. Only the small appearance control script is allowed in portfolio HTML; no backend dependency; interactive replicas use local browser scripts.`);

const emittedOriginals=files.filter(file=>relative(dist,file).startsWith('_astro/') && /\.(jpeg|jpg|avif)$/i.test(file));
assert.equal(emittedOriginals.length,0,'Archival originals leaked into build');
const media=JSON.parse(await readFile(join(root,'src/generated/media.json'),'utf8'));
for(const file of files.filter(f=>f.includes('/media/stories/'))){assert.ok(Object.values(media).some(m=>m.srcset.includes('/media/stories/'+file.split('/').pop())),`Unselected photo emitted: ${file}`);}
assert.ok(await targetExists(join(dist,'sw.js')),'Missing service-worker retirement');

assert.ok(!territoryHtml.includes('role="tablist"'), 'Territories view switcher remains');
