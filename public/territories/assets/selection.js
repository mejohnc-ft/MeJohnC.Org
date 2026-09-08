export function shortlist(styles,{project='portfolio',tone='any',density='any',assets='any'}={}){
 const ranked=styles.map((s,index)=>{const p=s.profile,reasons=[];let score=0;if(p.projects.includes(project)){score+=4;reasons.push(`A starting fit for ${project==='internal-tool'?'an internal tool':'a '+project}.`);}if(tone!=='any'&&p.tone===tone){score+=2;reasons.push(`${tone==='quiet'?'Quiet':'Bold'} visual emphasis.`);}if(density!=='any'&&p.density===density){score+=2;reasons.push(density==='compact'?'Keeps more information in view.':'Gives content more breathing room.');}if(assets==='simple'&&p.effort==='low'){score+=3;reasons.push('Starts with mostly standard CSS.');}else if(assets==='simple'&&p.effort==='high')score-=3;return {style:s,score,index,reasons};}).sort((a,b)=>b.score-a.score||a.index-b.index);
 return ranked.slice(0,3);

}
export async function loadCatalog(){const r=await fetch('/territories/catalog.json');if(!r.ok)throw Error('Catalog unavailable');return r.json();}
export const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
