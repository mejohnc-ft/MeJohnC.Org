import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const base='public/projects/territories/';
const data=vm.runInNewContext(fs.readFileSync(base+'guide-data.js','utf8')+';guideData');
const html=fs.readFileSync(base+'index.html','utf8');
const taxonomy=html.slice(html.indexOf('const interfaceDesign = ['),html.indexOf('// Get all territories flat list'));
const ids=[...taxonomy.matchAll(/^\s*findT\('([^']+)'\)/gm)].map(m=>m[1]);
assert.equal(ids.length,50);
assert.equal(Object.keys(data).length,50);
const runtime=vm.createContext({document:{addEventListener(){}},guideData:data});
vm.runInContext(fs.readFileSync(base+'guide.js','utf8'),runtime);
for(const id of ids){
 const d=data[id];assert.ok(d,`${id}: missing editorial entry`);
 for(const field of ['overview','avoid','example','typeAdvice','referenceNote'])assert.ok(d[field]?.length>25,`${id}: incomplete ${field}`);
 for(const field of ['cues','steps'])assert.equal(d[field]?.length,3,`${id}: three distinct ${field} required`);
 assert.equal(new Set(d.steps).size,3,`${id}: duplicated recipe`);
 for(const color of Object.values(d.palette))assert.match(color,/^#[0-9a-f]{6}$/i);
 const palette=vm.runInContext(`guidePalette({id:${JSON.stringify(id)}})`,runtime);
 assert.ok(palette.ratio>=4.5&&palette.accentRatio>=4.5,`${id}: unsafe text pair`);
 if(d.timelineYear)assert.ok(d.source?.url,`${id}: historical placement requires source`);
 if(d.source)assert.equal(new URL(d.source.url).protocol,'https:');
}
for(const field of ['overview','example','avoid','typeAdvice'])assert.equal(new Set(ids.map(id=>data[id][field])).size,50,`Duplicated ${field}`);
console.log('Verified 50 unique guide definitions, recipes, examples, typography notes, source requirements, and 100 text contrast pairs.');
