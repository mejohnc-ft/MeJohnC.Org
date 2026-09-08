// Guides have one contained scroll surface; the catalog retains its position.
let guideScrollY=0;
let guideReturnFocus=null;
let guideLocked=false;
function lockGuide(){
 if(guideLocked)return;
 guideLocked=true;guideScrollY=window.scrollY;guideReturnFocus=document.activeElement;
 document.body.style.position='fixed';document.body.style.top=`-${guideScrollY}px`;document.body.style.width='100%';
 document.documentElement.classList.add('guide-open');document.querySelector('.app').inert=true;
}
function unlockGuide(){
 if(!guideLocked)return;
 guideLocked=false;document.body.style.position='';document.body.style.top='';document.body.style.width='';
 document.documentElement.classList.remove('guide-open');document.querySelector('.app').inert=false;
 window.scrollTo({top:guideScrollY,behavior:'instant'});
 if(guideReturnFocus?.isConnected)guideReturnFocus.focus({preventScroll:true});
}
document.addEventListener('keydown',event=>{
 if(!guideLocked||event.key!=='Tab')return;
 const guide=document.getElementById('modal');
 const targets=[...guide.querySelectorAll('button,a[href],input,select,textarea,summary,[tabindex="0"]')].filter(el=>!el.disabled&&el.getClientRects().length);
 const first=targets[0],last=targets.at(-1);
 if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
 else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
});

const guideFonts={serif:{label:'Georgia',stack:'Georgia, serif',note:'A sturdy system serif for this screen interpretation. It is not presented as a period-authentic typeface.'},sans:{label:'System sans-serif',stack:'system-ui, sans-serif',note:'A neutral reading and interface face. Let the artwork and composition carry the distinctive style.'},mono:{label:'System monospace',stack:'ui-monospace, Menlo, Consolas, monospace',note:'Useful for short structured labels. Keep paragraphs generously spaced and avoid tiny terminal text.'}};
function escapeGuide(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function applyReviewedGuides(items){
 for(const t of items){
  const d=guideData[t.id];if(!d)continue;
  if(t.id==='dark-academia')t.name='Dark Academia';
  t.tags=d.cues;t.timelineYear=d.timelineYear;
  t.overview=d.overview;t.feeling=d.cues.join(' · ');t.characteristics=d.cues;
  t.brands=[];t.files=[];t.resources=d.source?[{name:d.source.label,url:d.source.url}]:[];
  t.whyAI='';t.bestFor=[d.example];
  t.history={era:d.context,origin:d.overview,evolution:'The application notes are contemporary editorial suggestions, not a historical interface specification.',keyMoments:[],originator:{}};
  t.philosophy={coreIdea:d.steps.join('. ')+'.',principles:d.steps.map((desc,i)=>({name:`Step ${i+1}`,desc})),influences:d.cues};
 }
}
function guideLuminance(hex){const rgb=hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];}
function guideContrast(a,b){const x=guideLuminance(a),y=guideLuminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
function guidePalette(t){
 const {surface,accent}=guideData[t.id].palette;
 const ink=guideContrast(surface,'#000000')>=guideContrast(surface,'#ffffff')?'#000000':'#ffffff';
 const accentInk=guideContrast(accent,'#000000')>=guideContrast(accent,'#ffffff')?'#000000':'#ffffff';
 return {surface,ink,accent,accentInk,ratio:guideContrast(surface,ink),accentRatio:guideContrast(accent,accentInk)};
}
function renderReviewedGuide(container,t){
 const d=guideData[t.id],e=escapeGuide,font=guideFonts[d.type],p=guidePalette(t);
 document.title=`${t.name} — Territories`;
 const section=(id,title,html)=>`<section class="modal-section" id="guide-${id}"><h3 class="modal-section-title">${title}</h3>${html}</section>`;
 const list=items=>`<ul class="guide-list">${items.map(x=>`<li>${e(x)}</li>`).join('')}</ul>`;
 const images=[];if(t.previewImage)images.push({path:t.previewImage,caption:`${t.name} · visual reference`});
 for(const img of t.images||[])if(!images.some(x=>x.path===img.path))images.push(img);
 const gallery=images.length?`<section class="image-carousel" id="guide-artwork" aria-label="Visual references"><div class="carousel-track" id="carousel-track">${images.map((img,i)=>`<div class="carousel-slide"><img ${i?'data-src':'src'}="${e(encodeURI(img.path))}" alt="${e(img.caption||t.name)}" decoding="async"></div>`).join('')}</div>${images.length>1?'<div class="carousel-controls"><button class="carousel-btn" id="carousel-prev" aria-label="Previous image">←</button><span id="carousel-position" aria-live="polite"></span><button class="carousel-btn" id="carousel-next" aria-label="Next image">→</button></div>':''}<div class="carousel-caption" id="carousel-caption">${e(images[0].caption||t.name)}</div></section>`:'';
 const palette=section('palette','Suggested color roles',`<p>A starting palette for this interpretation, not a required historical palette.</p><div class="guide-swatches">${[['Surface',p.surface],['Text',p.ink],['Accent',p.accent],['On accent',p.accentInk]].map(([role,color])=>`<div><span style="background:${color}"></span><strong>${role}</strong><code>${color.toUpperCase()}</code></div>`).join('')}</div><div class="guide-color-proof" style="background:${p.surface};color:${p.ink};border-color:${p.ink}"><strong>${e(d.cues[0])}</strong><p>${e(d.example)}</p><span style="background:${p.accent};color:${p.accentInk}">Accent label</span></div><p class="guide-fact">Text on surface: <strong>${p.ratio.toFixed(2)}:1</strong> · Text on accent: <strong>${p.accentRatio.toFixed(2)}:1</strong></p><p>Both solid-color pairs meet the 4.5:1 minimum for normal text. Images, gradients, transparency, and disabled states need their own checks. <a href="https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html" target="_blank" rel="noopener noreferrer">Contrast reference</a></p>`);
 const typography=section('type','Type & hierarchy',`<p>${e(d.typeAdvice)}</p><p class="guide-fact">Sample below: ${e(font.label)} with system fallbacks.</p><div class="guide-type-proof" style="font-family:${font.stack}"><div class="guide-type-display">${e(t.name)}</div><div class="guide-type-heading">${e(d.cues[0])}</div><p>${e(d.example)}</p><small>Caption · details stay readable</small></div><p class="guide-fact">Display 36px / heading 24px / body 16px / caption 14px. Use this as a starting scale; wrap long titles and let text grow.</p>`);
 const recipe=section('recipe','Build it',`<ol class="guide-list">${d.steps.map(x=>`<li>${e(x)}.</li>`).join('')}</ol>`);
 const example=section('example','Application example',`<p>${e(d.example)}</p>`);
 const caveat=section('limits','Watch out for',`<p>${e(d.avoid)}</p>`);
 const source=d.source?section('context','Context & source',`<p>${e(d.context)}. This source supports the background; the screen recipe is an editorial adaptation.</p><a href="${e(d.source.url)}" target="_blank" rel="noopener noreferrer">${e(d.source.label)}</a>`):section('context','About this interpretation','<p>This guide uses the label as a contemporary visual reference. It does not assign a single inventor, official specification, or exact founding date to the style.</p>');
 const prompt=section('prompt','Design brief',`<details><summary>Read or copy the brief</summary><div class="prompt-container"><button type="button" class="prompt-copy-btn" onclick="copyPrompt(this)">Copy</button><pre class="prompt-text" id="llm-prompt">${e(generatePrompt(t))}</pre></div></details>`);
 container.innerHTML=`<header class="modal-hero"><div class="modal-hero-content"><p class="guide-fact">${e(d.context)}</p><h1 class="modal-title">${e(t.name)}</h1><p class="modal-subtitle">${e(d.overview)}</p><div class="guide-handoff"><a href="/territories/${t.id}/">Full guide & downloads →</a><a href="/territories/compare/?styles=${t.id}">Compare a working example</a><a href="/territories/${t.id}/brief.md" download>Build brief</a></div></div></header><details class="guide-index"><summary>In this guide</summary><nav aria-label="Guide sections"></nav></details><div class="modal-body guide-columns"><section class="guide-column" aria-label="Reference"><h2 class="guide-column-title">Reference</h2>${gallery}${section('reference-note','Reading the reference',`<p>${e(d.referenceNote)}</p>`)}${section('cues','What defines it',list(d.cues))}${palette}${source}</section><section class="guide-column" aria-label="Application"><h2 class="guide-column-title">Application</h2>${recipe}${example}${typography}${caveat}${prompt}</section></div>`;
 const nav=container.querySelector('.guide-index nav');
 for(const target of container.querySelectorAll('.guide-column>section')){const button=document.createElement('button');button.type='button';button.textContent=target.querySelector('h3')?.textContent||'Visual references';button.addEventListener('click',()=>target.scrollIntoView({block:'start',behavior:'instant'}));nav.append(button);}
 let index=0;
 if(images.length>1){const track=container.querySelector('#carousel-track');const update=()=>{const img=track.children[index].querySelector('img');if(img.dataset.src){img.src=img.dataset.src;delete img.dataset.src;}track.style.transform=`translateX(-${index*100}%)`;container.querySelector('#carousel-caption').textContent=images[index].caption||t.name;container.querySelector('#carousel-position').textContent=`${index+1} / ${images.length}`;};container.querySelector('#carousel-prev').onclick=()=>{index=(index-1+images.length)%images.length;update();};container.querySelector('#carousel-next').onclick=()=>{index=(index+1)%images.length;update();};update();}
 container.scrollTop=0;
}
