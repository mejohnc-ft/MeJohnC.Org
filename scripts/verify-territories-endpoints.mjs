import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import {styles,catalog,version,contrast} from './territories/model.mjs';
import {shortlist} from '../public/territories/assets/selection.js';
import {scenarios,renderScenario} from '../public/territories/assets/scenarios.js';
const root=path.resolve(import.meta.dirname,'../dist');
const read=url=>fs.readFileSync(path.join(root,url),'utf8');
const built=JSON.parse(read('/territories/catalog.json'));
assert.deepEqual(built,catalog,'Published catalog has drifted from the source');
assert.equal(built.styles.length,50);
for(const s of styles){
 for(const [kind,url] of Object.entries(s.links)){assert.ok(fs.existsSync(path.join(root,url)),`${s.id}: broken ${kind} endpoint`);}
 const tokens=JSON.parse(read(s.links.tokens));assert.deepEqual(tokens,s.tokens,`${s.id}: token drift`);
 assert.equal(tokens.schemaVersion,version);assert.equal(tokens.styleId,s.id);
 assert.deepEqual(JSON.parse(read(s.links.versionedTokens)),tokens);
 assert.equal(read(s.links.guide),read(s.links.versionedGuide));
 assert.ok(contrast(tokens.color.surface,tokens.color.text)>=4.5);
 assert.ok(contrast(tokens.color.accent,tokens.color.onAccent)>=4.5);
 const page=read(s.links.page+'index.html');assert.ok(page.includes(s.links.tokens));assert.ok(page.includes(s.links.checks));
 const example=read(s.links.example+'index.html');
 for(const [key,value] of [['surface',tokens.color.surface],['text',tokens.color.text],['accent',tokens.color.accent],['on-accent',tokens.color.onAccent]])assert.ok(example.includes(`--${key}:${value}`),`${s.id}: example/token mismatch`);
 assert.ok(example.includes(renderScenario('internal-tool')),`${s.id}: sample content drift`);
 for(const project of Object.keys(scenarios)){const markup=renderScenario(project);assert.ok(markup.includes('id="sample-form"'));assert.ok(markup.includes('id="sample-empty"'));assert.ok(markup.includes('id="sample-message"'));}
}
let selections=0;
for(const project of Object.keys(scenarios))for(const tone of ['quiet','bold','any'])for(const density of ['compact','spacious','any'])for(const assets of ['simple','any']){
 const result=shortlist(built.styles,{project,tone,density,assets});assert.equal(result.length,3);assert.equal(new Set(result.map(x=>x.style.id)).size,3);assert.ok(result.every(x=>x.reasons.length));assert.ok(result[0].score>=result[1].score&&result[1].score>=result[2].score);selections++;
}
const focused=shortlist(built.styles,{project:'internal-tool',tone:'quiet',density:'compact',assets:'simple'});
assert.equal(focused[0].style.id,'utilitarian');assert.ok(focused.every(x=>x.style.profile.effort==='low'));
assert.ok(read('/territories/agent.md').includes('/territories/catalog.json'));
const zip=fs.readFileSync(path.join(root,'territories/territories-design.zip'));assert.equal(zip.readUInt32LE(0),0x04034b50);
console.log(`Verified 50 agent handoffs, versioned resource parity, example/token consistency, and ${selections} picker combinations.`);
