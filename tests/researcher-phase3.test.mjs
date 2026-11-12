import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {setMaxListeners} from 'node:events';
import {getResearcherSummary,journalMessageForSpeciesCount} from '../scripts/researcher-progress.js';
import {PROFILE_KEY,PROGRESS_KEY,INTRO_KEY,PROJECT_STORAGE_KEYS,removeProjectStorage} from '../scripts/project-storage.js';
import {createNotificationQueue} from '../scripts/notifications.js';

const species=['bear','monkey','cat','magpie','salmon'];
const regionIds=['mountain-forest','lowland-forest','alpine-stream'];
const values=new Map();
const local={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key),
 clear(){assert.fail('Never clear unrelated localStorage');}};
Object.defineProperty(globalThis,'localStorage',{configurable:true,value:local});
let revision=0;
const loadState=()=>import(`../scripts/state.js?phase3=${revision++}`);
const freshGuide=()=>import(`../scripts/exploration-guide.js?phase3=${revision++}`);
const settle=()=>new Promise(resolve=>queueMicrotask(resolve));

class Element extends EventTarget {
 constructor(){super();this.children=new Map();this.dataset={};this.style={};this.attributes={};this.value='';this.textContent='';this.hidden=false;this.open=false;this.disabled=false;this.isConnected=true;this.badges=[];this.showCount=0;this.classList={toggle(){}};}
 addEventListener(type,fn,options){if(options?.signal)setMaxListeners(0,options.signal);super.addEventListener(type,fn,options);}
 querySelector(selector){if(!this.children.has(selector))this.children.set(selector,new Element());return this.children.get(selector);}
 querySelectorAll(selector){return selector==='[data-badge]'?this.badges:[];}
 setAttribute(k,v){this.attributes[k]=v;}getAttribute(k){return this.attributes[k]??null;}removeAttribute(k){delete this.attributes[k];}
 focus(){this.focused=true;if(globalThis.document)document.activeElement=this;}select(){}
 showModal(){this.open=true;this.showCount++;}close(){this.open=false;queueMicrotask(()=>this.dispatchEvent(new Event('close')));}
 getBoundingClientRect(){return {left:100,right:600,top:100,bottom:500};}
 getClientRects(){return [{}];}closest(){return null;}
}
const fire=(element,type)=>element.dispatchEvent(new Event(type,{cancelable:true}));

function seed(){
 values.clear();
 values.set(PROFILE_KEY,JSON.stringify({version:1,name:'舊研究員',id:'TW-OLD1',joinedDate:'2000-01-01'}));
 values.set(PROGRESS_KEY,JSON.stringify({version:1,discovered:species,visitedRegions:regionIds,
  records:species.map(id=>({id,time:'2026-11-01T01:00:00Z'}))}));
 values.set(INTRO_KEY,'1');
 values.set('another-app.setting','keep');
 values.set('twe.unrelated.v1','also keep'); // Prefix matching would wrongly delete this.
}

test('all six discovery counts choose exact journal messages, without a stored journal/completion flag',()=>{
 const expected=[
  '每一段研究旅程，都從第一個發現開始。',
  '你已經踏出探索的第一步，還有更多生命等待認識。',
  '你已經踏出探索的第一步，還有更多生命等待認識。',
  '你的研究圖鑑逐漸完整，繼續尋找島嶼上的珍貴生命！',
  '你的研究圖鑑逐漸完整，繼續尋找島嶼上的珍貴生命！',
  '恭喜完成臺灣野生動物圖鑑！每一份發現都值得珍藏。'
 ];
 for(let count=0;count<=5;count++){
  assert.equal(journalMessageForSpeciesCount(count),expected[count]);
  const summary=getResearcherSummary({discovered:new Set(species.slice(0,count)),visitedRegions:new Set(regionIds),records:[]});
  assert.equal(summary.journalMessage,expected[count]);assert.equal(summary.researchComplete,count===5);
 }
 const incomplete=getResearcherSummary({discovered:new Set(species),visitedRegions:new Set(regionIds.slice(0,2)),records:[]});
 assert.equal(incomplete.completion,100);assert.equal(incomplete.researchComplete,false);
});

test('completion restores from actual progress and dashboard updates journal/completion live',async()=>{
 seed();const model=await loadState();
 assert.equal(getResearcherSummary(model.state).researchComplete,true);
 const restored=await loadState();assert.equal(getResearcherSummary(restored.state).researchComplete,true);
 const stored=JSON.parse(values.get(PROGRESS_KEY));
 assert.ok(!('researchComplete' in stored));assert.ok(!('journalMessage' in stored));
 values.clear();
 const stateModule=await import('../scripts/state.js');stateModule.resetProgress();
 const {renderResearcherDashboard,bindResearcherDashboard}=await import('../scripts/researcher-dashboard.js');
 const markup=renderResearcherDashboard();
 assert.ok(markup.indexOf('data-research-complete')>markup.indexOf('researcher-statistics'));
 assert.ok(markup.indexOf('data-research-complete')<markup.indexOf('class="researcher-badges"'));
 assert.ok(markup.indexOf('class="researcher-journal"')>markup.indexOf('id="researcher-badge-details"'));
 const root=new Element(),controller=new AbortController();
 bindResearcherDashboard(root,{signal:controller.signal});
 assert.equal(root.querySelector('[data-research-complete]').hidden,true);
 assert.equal(root.querySelector('[data-profile-journal]').textContent,journalMessageForSpeciesCount(0));
 for(let i=0;i<species.length;i++){
  stateModule.selectAnimal(species[i]);
  assert.equal(root.querySelector('[data-profile-journal]').textContent,journalMessageForSpeciesCount(i+1));
 }
 stateModule.visitRegion(regionIds[0]);stateModule.visitRegion(regionIds[1]);
 assert.equal(root.querySelector('[data-research-complete]').hidden,true);
 stateModule.visitRegion(regionIds[2]);assert.equal(root.querySelector('[data-research-complete]').hidden,false);
 stateModule.resetProgress();assert.equal(root.querySelector('[data-research-complete]').hidden,true);
 controller.abort();
});

test('data management is a closed native disclosure; cancelling confirmation changes no data',async()=>{
 seed();
 const {renderResearcherDataManagement,bindResearcherDataManagement}=await import('../scripts/researcher-data-management.js');
 const markup=renderResearcherDataManagement();
 assert.match(markup,/<details class="researcher-data-management">/);
 assert.match(markup,/<summary>資料管理/);assert.match(markup,/無法復原/);
 assert.equal((markup.match(/<dialog /g)||[]).length,1);
 const root=new Element(),controller=new AbortController();let resets=0;
 bindResearcherDataManagement(root,{signal:controller.signal,onReset(){},resetAll:()=>{resets++;return {ok:true};}});
 const get=s=>root.querySelector(s),panel=get('.researcher-data-management');
 assert.equal(panel.open,false);
 const before=[...values];
 fire(get('[data-profile-reset-all]'),'click');fire(get('[data-profile-reset-all]'),'click');
 assert.equal(get('.researcher-full-reset-dialog').showCount,1);
 assert.equal(get('[data-full-reset-cancel]').focused,true);
 fire(get('[data-full-reset-cancel]'),'click');await settle();
 assert.equal(get('.researcher-full-reset-dialog').open,false);assert.equal(resets,0);
 assert.deepEqual([...values],before);
 fire(get('[data-profile-reset-all]'),'click');fire(get('.researcher-full-reset-dialog'),'cancel');await settle();
 assert.deepEqual([...values],before);assert.equal(resets,0);
 fire(get('[data-profile-reset-all]'),'click');fire(get('[data-full-reset-confirm]'),'click');fire(get('[data-full-reset-confirm]'),'click');
 assert.equal(resets,1);assert.equal(get('[data-full-reset-confirm]').disabled,true);
 controller.abort();
});

test('storage removal uses exact owned keys and rolls back a failed removal instead of reloading',()=>{
 seed();
 assert.deepEqual([...PROJECT_STORAGE_KEYS].sort(),[PROFILE_KEY,PROGRESS_KEY,INTRO_KEY].sort());
 const before=[...values];let failed=false;
 const rejecting={...local,removeItem(key){if(key===PROGRESS_KEY&&!failed){failed=true;throw Error('blocked');}values.delete(key);}};
 assert.equal(removeProjectStorage(rejecting).ok,false);
 for(const [key,value] of before)assert.equal(values.get(key),value);
 assert.equal(removeProjectStorage(local).ok,true);
 assert.deepEqual([...values],[['another-app.setting','keep'],['twe.unrelated.v1','also keep']]);
});

test('full reset clears only project data, cancels old outcomes and boots new identity/intro/zero progress',async()=>{
 seed();
 const model=await loadState(),oldGuide=await freshGuide();oldGuide.markIntroHandled();
 const timers=new Map();let timerId=0,visible=false;
 const queue=createNotificationQueue({show(){visible=true;},hide(){visible=false;},
  setTimer:callback=>{timers.set(++timerId,callback);return timerId;},clearTimer:id=>timers.delete(id)});
 queue.enqueue([{title:'old badge'},{title:'old promotion'}]);
 model.subscribeExploration(event=>{if(event.reason==='project-reset')queue.clear();});
 let reloads=0;
 assert.equal(model.resetAllResearchData({reload:()=>reloads++}).ok,true);
 assert.equal(reloads,1);assert.equal(timers.size,0);assert.equal(visible,false);
 for(const key of PROJECT_STORAGE_KEYS)assert.equal(values.has(key),false);
 assert.equal(values.get('another-app.setting'),'keep');assert.equal(values.get('twe.unrelated.v1'),'also keep');
 assert.equal(model.state.discovered.size,0);assert.equal(model.state.visitedRegions.size,0);assert.equal(model.state.records.length,0);
 assert.equal(model.visitRegion(regionIds[0]),false);assert.equal(model.selectAnimal('bear'),false);
 assert.equal(model.setResearcher('late save').ok,false);model.persistProgress();
 for(const key of PROJECT_STORAGE_KEYS)assert.equal(values.has(key),false);
 assert.equal(model.resetAllResearchData({reload:()=>reloads++}).ok,false);assert.equal(reloads,1);
 // Fresh module instances model a real page reload (including module-local flags).
 const freshUrl=new URL(`../scripts/state.js?boot=${revision++}`,import.meta.url);
 const fresh=await import(freshUrl),events=[];fresh.subscribeExploration(event=>events.push(event));
 const identity=fresh.getResearcherProfile();
 assert.equal(identity.name,'未命名研究員');assert.match(identity.id,/^TW-[A-Z0-9]{4}$/);assert.notEqual(identity.id,'TW-OLD1');
 assert.notEqual(identity.joinedDate,'2000-01-01');
 assert.equal(fresh.state.discovered.size,0);assert.equal(fresh.state.records.length,0);assert.equal(fresh.state.visitedRegions.size,0);
 assert.equal(getResearcherSummary(fresh.state).badges.some(b=>b.unlocked),false);assert.equal(events.length,0);
 const guideUrl=new URL(`../scripts/exploration-guide.js?boot=${revision++}`,import.meta.url);
 assert.equal((await import(guideUrl)).hasHandledIntro(),false);
 // Exercise the actual initializer: original invitation must appear again.
 const dialog=new Element(),content=new Element(),trigger=new Element();
 globalThis.document={documentElement:{style:{overflow:'',scrollbarGutter:''}},activeElement:null,
  querySelector:selector=>selector==='#utility-dialog'?dialog:selector==='#dialog-content'?content:trigger,
  querySelectorAll:()=>[]};
 const source=readFileSync(new URL('../scripts/dialogs.js',import.meta.url),'utf8')
  .replace("'./exploration-hint-card.js'",JSON.stringify(new URL('../scripts/exploration-hint-card.js',import.meta.url).href))
  .replace("'./discovery-log.js'",JSON.stringify(new URL('../scripts/discovery-log.js',import.meta.url).href))
  .replace("'./researcher-profile.js'",JSON.stringify(new URL('../scripts/researcher-profile.js',import.meta.url).href))
  .replace("'./exploration-guide.js'",JSON.stringify(guideUrl.href));
 const {initDialogs}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 initDialogs(()=>{});assert.equal(dialog.open,true);assert.equal(dialog.dataset.mode,'intro');
 assert.match(content.innerHTML,/歡迎加入探索計畫/);assert.equal(events.length,0);
 fire(dialog,'cancel');await settle();
});

test('failed reset keeps memory/data intact; successful deletion with failed navigation requests manual reload',async()=>{
 seed();const model=await loadState();
 const before=values.get(PROGRESS_KEY);let reloads=0;
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{...local,removeItem(){throw Error('denied');}}});
 const failure=model.resetAllResearchData({reload:()=>reloads++});
 assert.equal(failure.ok,false);assert.equal(reloads,0);assert.equal(model.state.discovered.size,5);
 assert.equal(values.get(PROGRESS_KEY),before);
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:local});
 const success=model.resetAllResearchData({reload:()=>{throw Error('navigation blocked');}});
 assert.equal(success.ok,true);assert.equal(success.needsReload,true);
 assert.match(success.message,/重新整理/);
});
