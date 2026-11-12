import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setMaxListeners } from 'node:events';

const storage = new Map();
Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{
  getItem:key=>storage.get(key)??null,
  setItem:(key,value)=>storage.set(key,value)
}});
let revision=0;

class Element extends EventTarget {
  constructor(){super();this.style={};this.dataset={};this.isConnected=true;this.disabled=false;this._html='';this.children=new Map();this.open=false;}
  addEventListener(type,callback,options){if(options?.signal)setMaxListeners(0,options.signal);super.addEventListener(type,callback,options);}
  setAttribute(key,value){(this.attributes??={})[key]=value;}
  removeAttribute(key){delete this.attributes?.[key];}
  select(){}
  animate(frames,options){
    this.animation={frames,options,cancel(){}};
    this.animation.finished=new Promise(resolve=>this.animation.finish=resolve);
    return this.animation;
  }
  set innerHTML(html){this._html=html;this.children.clear();}
  get innerHTML(){return this._html;}
  querySelector(selector){if(!this.children.has(selector))this.children.set(selector,new Element());return this.children.get(selector);}
  querySelectorAll(selector){if(selector==='[data-badge]')return [];return [this.querySelector('.close-dialog'),...(this.includeSummary&&selector.includes('summary')?[this.querySelector('summary')]:[]),this.querySelector('action')];}
  getClientRects(){return [{}];}
  getBoundingClientRect(){return {left:100,right:660,top:100,bottom:700};}
  focus(){document.activeElement=this;}
  showModal(){this.open=true;}
  close(){this.open=false;queueMicrotask(()=>this.dispatchEvent(new Event('close')));}
  closest(){return null;}
}

function createDom(){
 const dialog=new Element(),content=new Element();
 const toolbar=['guide','hints','records','profile'].map(type=>{const b=new Element();b.dataset.dialog=type;return b;});
 const root={style:{overflow:'',scrollbarGutter:''}};
 globalThis.document={
  activeElement:null,documentElement:root,
  querySelector:s=>s==='#utility-dialog'?dialog:s==='#dialog-content'?content:toolbar[0],
  querySelectorAll:()=>toolbar
 };
 function fire(type,{outside=false,action=null,close=false,key=null,shiftKey=false}={}){
  const event=new Event(type,{cancelable:true});
  const target=outside?dialog:{closest:selector=>selector==='[data-dialog-action]'&&action?{dataset:{dialogAction:action}}:selector==='.close-dialog'&&close?{}:null};
  Object.defineProperties(event,{
   target:{value:target},clientX:{value:outside?50:200},clientY:{value:outside?50:200},key:{value:key},shiftKey:{value:shiftKey}
  });
  dialog.dispatchEvent(event);
  return event;
 }
 return {dialog,content,toolbar,root,fire};
}
const settle=()=>new Promise(resolve=>queueMicrotask(resolve));
async function setup(seen=false, options={}){
 storage.delete('wildlifeExplorer_introSeen');if(seen)storage.set('wildlifeExplorer_introSeen','1');
 const dom=createDom();
 // A new guide module instance simulates a fresh page and resets only its in-memory flag.
 const guideUrl=new URL(`../scripts/exploration-guide.js?guide=${revision++}`,import.meta.url);
 const source=readFileSync(new URL('../scripts/dialogs.js',import.meta.url),'utf8')
  .replace("'./exploration-hint-card.js'",JSON.stringify(new URL('../scripts/exploration-hint-card.js',import.meta.url).href))
  .replace("'./discovery-log.js'",JSON.stringify(new URL('../scripts/discovery-log.js',import.meta.url).href))
  .replace("'./researcher-profile.js'",JSON.stringify(new URL('../scripts/researcher-profile.js',import.meta.url).href))
  .replace("'./exploration-guide.js'",JSON.stringify(guideUrl.href));
 const {initDialogs}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 initDialogs(()=>{}, options);
 return dom;
}

test('first visit invitation routes to complete guide; guide close restores focus and scroll',async()=>{
 const {dialog,content,toolbar,root,fire}=await setup();
 assert.equal(dialog.dataset.mode,'intro');assert.equal(dialog.open,true);
 assert.match(content.innerHTML,/RESEARCH MISSION \/ 001/);
 assert.match(content.innerHTML,/歡迎加入探索計畫/);
 assert.match(content.innerHTML,/查看指南/);assert.match(content.innerHTML,/直接探索/);
 assert.equal(root.style.overflow,'hidden');
 fire('click',{action:'view-guide'});await settle();
 assert.equal(storage.get('wildlifeExplorer_introSeen'),'1');
 assert.equal(dialog.dataset.mode,'guide');assert.equal(dialog.open,true);
 for(let i=1;i<=5;i++)assert.match(content.innerHTML,new RegExp(`STEP 0${i}`));
 assert.match(content.innerHTML,/研究員小提醒/);assert.match(content.innerHTML,/開始探索/);
 const first=dialog.querySelector('.close-dialog'),last=dialog.querySelector('action');
 last.focus();assert.ok(fire('keydown',{key:'Tab'}).defaultPrevented);assert.equal(document.activeElement,first);
 first.focus();fire('keydown',{key:'Tab',shiftKey:true});assert.equal(document.activeElement,last);
 fire('click',{action:'explore'});await settle();
 assert.equal(dialog.open,false);assert.equal(root.style.overflow,'');assert.equal(document.activeElement,toolbar[0]);
 // A closed session no longer intercepts cancellation events.
 assert.equal(fire('cancel').defaultPrevented,false);
 toolbar[0].onclick();assert.equal(dialog.dataset.mode,'guide');
 fire('click',{close:true});await settle();assert.equal(dialog.open,false);
});

test('direct exploration and all invitation dismissals persist only the intro flag',async()=>{
 for(const method of ['explore','x','backdrop','escape','external-close']){
  storage.set('twe.exploration.v1','unchanged-progress');
  storage.set('twe.researcher.v1','unchanged-profile');
  const {dialog,fire}=await setup();
  if(method==='explore')fire('click',{action:'explore'});
  if(method==='x')fire('click',{close:true});
  if(method==='backdrop'){fire('pointerdown',{outside:true});fire('click',{outside:true});}
  if(method==='escape')assert.ok(fire('cancel').defaultPrevented);
  if(method==='external-close')dialog.close();
  await settle();
  assert.equal(dialog.open,false,method);
  assert.equal(storage.get('wildlifeExplorer_introSeen'),'1',method);
  assert.equal(storage.get('twe.exploration.v1'),'unchanged-progress');
  assert.equal(storage.get('twe.researcher.v1'),'unchanged-profile');
 }
});

test('return visits skip invitation; inside click and inside-to-outside drag do not dismiss',async()=>{
 const {dialog,toolbar,fire}=await setup(true);
 assert.equal(dialog.open,false);
 toolbar[0].onclick();assert.equal(dialog.open,true);
 fire('pointerdown');fire('click');assert.equal(dialog.open,true);
 fire('pointerdown');fire('click',{outside:true});assert.equal(dialog.open,true);
 fire('pointerdown',{outside:true});fire('click',{outside:true});await settle();assert.equal(dialog.open,false);
 for(let i=0;i<4;i++){
  toolbar[0].onclick();fire('cancel');await settle();assert.equal(dialog.open,false);
 }
});

test('blocked storage still permits dismissal and avoids another invitation in this visit',async()=>{
 const guide=await import(`../scripts/exploration-guide.js?blocked=${revision++}`);
 const original=globalThis.localStorage;
 Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw Error('blocked');}});
 assert.equal(guide.hasHandledIntro(),false);
 assert.doesNotThrow(()=>guide.markIntroHandled());
 assert.equal(guide.hasHandledIntro(),true);
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:original});
});


test('profile modal keeps background locked through reverse animation and discards drafts',async()=>{
 const previousMatch=globalThis.matchMedia;
 globalThis.matchMedia=()=>({matches:false});
 try {
  const {dialog,content,toolbar,root,fire}=await setup(true);
  toolbar[3].onclick();
  assert.equal(dialog.dataset.mode,'profile');assert.equal(root.style.overflow,'hidden');
  assert.match(content.innerHTML,/研究員身分證/);
  const before=storage.get('twe.researcher.v1');
  content.querySelector('.researcher-edit').dispatchEvent(new Event('click'));
  content.querySelector('#profile-name-input').value='不應保存的草稿';
  fire('click',{close:true});
  assert.equal(dialog.open,true);
  assert.equal(dialog.animation.options.duration,200);
  assert.equal(dialog.animation.frames.at(-1).transform,'scale(.96)');
  assert.equal(root.style.overflow,'hidden');
  dialog.animation.finish();await settle();await settle();await settle();
  assert.equal(dialog.open,false);assert.equal(root.style.overflow,'');
  assert.equal(document.activeElement,toolbar[3]);
  assert.equal(storage.get('twe.researcher.v1'),before);
  assert.equal(content.querySelector('#profile-name-input').value,'');
 } finally {globalThis.matchMedia=previousMatch;}
});

test('profile supports X, backdrop and Esc with reduced motion and clean reopening',async()=>{
 const previousMatch=globalThis.matchMedia;
 globalThis.matchMedia=()=>({matches:true});
 try {
  const {dialog,content,toolbar,fire}=await setup(true);
  for(const method of ['x','backdrop','escape']){
   toolbar[3].onclick();
   assert.equal(content.querySelector('.researcher-scroll').scrollTop,0);
   content.querySelector('.researcher-scroll').scrollTop=100;
   if(method==='x')fire('click',{close:true});
   if(method==='backdrop'){fire('pointerdown',{outside:true});fire('click',{outside:true});}
   if(method==='escape')fire('cancel');
   await settle();assert.equal(dialog.open,false);assert.equal(dialog.animation,undefined);
  }
  toolbar[0].onclick();assert.equal(dialog.dataset.mode,'guide');
  fire('cancel');await settle();
 } finally {globalThis.matchMedia=previousMatch;}
});


test('profile focus loop includes the native data-management summary',async()=>{
 const {dialog,toolbar,fire}=await setup(true);
 dialog.includeSummary=true;
 toolbar[3].onclick();
 dialog.querySelector('summary').focus();
 assert.equal(fire('keydown',{key:'Tab'}).defaultPrevented,false);
 assert.equal(fire('keydown',{key:'Tab',shiftKey:true}).defaultPrevented,false);
 dialog.close();await settle();
});

test('records timeline retains modal dismissal, scroll reset, focus restoration and saved state', async () => {
 const {state}=await import('../scripts/state.js');
 const previous=state.records;
 try {
  state.records=[
   {type:'species_discovered',id:'bear',time:null,regionId:null},
   {type:'region_entered',id:'mountain-forest',time:new Date('2026-11-12T00:00:00Z'),regionId:'mountain-forest'}
  ];
  const {dialog,content,toolbar,root,fire}=await setup(true);
  const savedBefore=[...storage];
  for(const method of ['x','backdrop','escape']) {
   toolbar[2].onclick();
   assert.equal(dialog.dataset.mode,'records');
   assert.equal(dialog.open,true);
   assert.equal(root.style.overflow,'hidden');
   assert.equal(dialog.scrollTop,0);
   assert.match(content.innerHTML,/discovery-log-timeline/);
   assert.match(content.innerHTML,/SPECIES DISCOVERED/);
   assert.match(content.innerHTML,/REGION DISCOVERED/);
   fire('pointerdown');fire('click');assert.equal(dialog.open,true);
   dialog.scrollTop=200;
   if(method==='x')fire('click',{close:true});
   if(method==='backdrop'){fire('pointerdown',{outside:true});fire('click',{outside:true});}
   if(method==='escape')fire('cancel');
   await settle();
   assert.equal(dialog.open,false);
   assert.equal(root.style.overflow,'');
   assert.equal(document.activeElement,toolbar[2]);
   assert.deepEqual([...storage],savedBefore);
  }
  assert.equal(state.records.length,2);
 } finally {state.records=previous;}
});

test('reopening records reflects new completion and progress reset without an extra event', async () => {
 const model=await import('../scripts/state.js');
 const {animals}=await import('../scripts/data/animals.js');
 const {regions}=await import('../scripts/data/regions.js');
 const {state}=model;
 const original={selected:state.selected,discovered:new Set(state.discovered),visitedRegions:new Set(state.visitedRegions),records:state.records};
 const savedBefore=[...storage];
 try {
  model.resetProgress();
  const {dialog,content,toolbar,fire}=await setup(true);
  toolbar[2].onclick();assert.doesNotMatch(content.innerHTML,/EXPLORATION COMPLETE/);
  fire('cancel');await settle();
  animals.forEach(animal=>model.selectAnimal(animal.id));
  Object.keys(regions).forEach(id=>model.visitRegion(id));
  toolbar[2].onclick();assert.match(content.innerHTML,/EXPLORATION COMPLETE/);
  assert.equal(state.records.length,8);
  fire('cancel');await settle();
  model.resetProgress();
  toolbar[2].onclick();assert.doesNotMatch(content.innerHTML,/EXPLORATION COMPLETE/);
  assert.match(content.innerHTML,/尚無探索紀錄/);
  assert.equal(dialog.scrollTop,0);
  fire('cancel');await settle();
 } finally {
  Object.assign(state,original);
  storage.clear();savedBefore.forEach(([key,value])=>storage.set(key,value));
 }
});

test('hint modal reads live region on every open, hides internal data, and preserves shared progress', async () => {
 const model=await import('../scripts/state.js');
 const {animals}=await import('../scripts/data/animals.js');
 const {getExplorationHint}=await import('../scripts/exploration-hints.js');
 const {state}=model;
 const original={selected:state.selected,discovered:new Set(state.discovered),visitedRegions:new Set(state.visitedRegions),records:state.records};
 const savedBefore=[...storage];
 try {
  model.resetProgress();
  let currentRegionId=null, reads=0;
  const {dialog,content,toolbar,root,fire}=await setup(true,{getCurrentRegionId:()=>{reads++;return currentRegionId;}});
  const checkOpen=()=>{
   const before=[...storage],records=JSON.stringify(state.records);
   toolbar[1].onclick();
   const expected=getExplorationHint(currentRegionId);
   assert.equal(dialog.dataset.mode,'hints');assert.equal(dialog.open,true);
   assert.equal(root.style.overflow,'hidden');
   assert.ok(content.innerHTML.includes(expected.status === 'hint' ? 'ECOLOGICAL RESEARCH HINT' : 'RESEARCH ACHIEVEMENT'));
   if(expected.status==='hint') {
    for(const key of ['title','clue','location','regionName'])assert.ok(content.innerHTML.includes(expected.hint[key]));
    assert.equal((content.innerHTML.match(/class="ecological-hint-card"/g)||[]).length,1);
    assert.ok(!content.innerHTML.includes(expected.hint.source));
    assert.ok(!content.innerHTML.replace(/<[^>]*>/g,'').includes(expected.hint.speciesId));
   } else {
    assert.match(content.innerHTML,/野外研究任務完成/);
    assert.match(content.innerHTML,/ALL FIVE SPECIES DISCOVERED/);
    assert.doesNotMatch(content.innerHTML,/class="ecological-hint-card"/);
   }
   for(const animal of animals)assert.ok(!content.innerHTML.includes(animal.name));
   assert.deepEqual([...storage],before);assert.equal(JSON.stringify(state.records),records);
  };
  for(const [region,method] of [[null,'x'],['mountain-forest','escape'],['lowland-forest','backdrop'],['alpine-stream','x']]) {
   currentRegionId=region;checkOpen();
   const html=content.innerHTML;
   fire('pointerdown');fire('click');assert.equal(dialog.open,true);
   if(method==='x')fire('click',{close:true});
   if(method==='escape')fire('cancel');
   if(method==='backdrop'){fire('pointerdown',{outside:true});fire('click',{outside:true});}
   await settle();assert.equal(dialog.open,false);assert.equal(document.activeElement,toolbar[1]);
   assert.equal(root.style.overflow,'');
   checkOpen();assert.equal(content.innerHTML,html);fire('cancel');await settle();
  }
  currentRegionId='mountain-forest';model.selectAnimal('bear');
  checkOpen();assert.match(content.innerHTML,/岩上的紅色線索/);fire('cancel');await settle();
  animals.forEach(a=>model.selectAnimal(a.id));
  checkOpen();fire('cancel');await settle();
  assert.equal(reads,10);
 } finally {
  Object.assign(state,original);storage.clear();savedBefore.forEach(([key,value])=>storage.set(key,value));
 }
});

test('achievement card is region independent, requires no visits, closes normally and resets to clues', async () => {
 const model=await import('../scripts/state.js');
 const {animals}=await import('../scripts/data/animals.js');
 const {regions}=await import('../scripts/data/regions.js');
 const {state}=model;
 const original={selected:state.selected,discovered:new Set(state.discovered),visitedRegions:new Set(state.visitedRegions),records:state.records};
 const savedBefore=[...storage];
 try {
  model.resetProgress();
  animals.forEach(animal=>model.selectAnimal(animal.id));
  assert.equal(state.visitedRegions.size,0);
  let currentRegionId=null;
  const {dialog,content,toolbar,root,fire}=await setup(true,{getCurrentRegionId:()=>currentRegionId});
  const before=[...storage], records=JSON.stringify(state.records);
  let completeHtml;
  for(const [index,id] of [null,...Object.keys(regions)].entries()) {
   currentRegionId=id;
   toolbar[1].onclick();
   assert.equal(dialog.open,true);assert.equal(dialog.dataset.mode,'hints');
   assert.equal(root.style.overflow,'hidden');
   for(const text of ['RESEARCH ACHIEVEMENT','野外研究任務完成',
    '恭喜！你已發現全部五種臺灣野生動物。從山地森林到高山溪流，每一次觀察都是認識臺灣生態的重要一步。',
    '前往物種研究圖鑑，回顧牠們的生態特徵、棲地與保育現況。','ALL FIVE SPECIES DISCOVERED'])assert.ok(content.innerHTML.includes(text));
   assert.doesNotMatch(content.innerHTML,/ECOLOGICAL RESEARCH HINT|<button|<a\b|<audio/);
   if(index===0)completeHtml=content.innerHTML;
   else assert.equal(content.innerHTML,completeHtml);
   if(index%3===0)fire('click',{close:true});
   if(index%3===1)fire('cancel');
   if(index%3===2){fire('pointerdown',{outside:true});fire('click',{outside:true});}
   await settle();
   assert.equal(dialog.open,false);assert.equal(root.style.overflow,'');
   assert.equal(document.activeElement,toolbar[1]);
   assert.deepEqual([...storage],before);assert.equal(JSON.stringify(state.records),records);
  }
  model.resetProgress();
  currentRegionId=null;toolbar[1].onclick();
  assert.match(content.innerHTML,/ECOLOGICAL RESEARCH HINT/);
  assert.match(content.innerHTML,/胸前的月形印記/);
  assert.doesNotMatch(content.innerHTML,/RESEARCH ACHIEVEMENT|野外研究任務完成|ALL FIVE/);
  fire('cancel');await settle();
 } finally {
  Object.assign(state,original);storage.clear();savedBefore.forEach(([key,value])=>storage.set(key,value));
 }
});
