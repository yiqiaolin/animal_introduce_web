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
 assert.equal((markup.match(/<dialog /g)||[]).length,2);
 assert.doesNotMatch(markup,/researcher-reset-confirm/);
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

test('restart modal cancels safely, confirms once, preserves identity/intro and cleans up on abort', async()=>{
 const model=await import('../scripts/state.js');
 const {renderResearcherDataManagement,bindResearcherDataManagement}=await import('../scripts/researcher-data-management.js');
 values.clear();model.resetProgress();model.setResearcher('研究員測試');values.set(INTRO_KEY,'1');
 values.set('other-site.setting','keep');
 species.forEach(id=>model.selectAnimal(id));regionIds.forEach(id=>model.visitRegion(id));
 const markup=renderResearcherDataManagement();
 assert.match(markup,/確認重新開始探索？/);
 assert.match(markup,/稱號與徽章會隨探索進度重新計算/);
 assert.match(markup,/保留研究員名稱、編號、加入日期、首次任務通知設定及目前地圖視角/);
 assert.doesNotMatch(markup,/researcher-reset-confirm/);
 const root=new Element(),controller=new AbortController();let resets=0,fullResets=0;
 bindResearcherDataManagement(root,{signal:controller.signal,onReset:()=>resets++,resetAll:()=>{fullResets++;return {ok:true};}});
 const get=s=>root.querySelector(s),dialog=get('.researcher-restart-dialog'),trigger=get('[data-profile-restart]');
 const before=[...values], records=JSON.stringify(model.state.records);
 const profile=values.get(PROFILE_KEY);
 const point=(type,outside)=>{
  const event=new Event(type,{cancelable:true});
  Object.defineProperties(event,{clientX:{value:outside?50:200},clientY:{value:outside?50:200}});
  dialog.dispatchEvent(event);return event;
 };
 // A hidden confirmation button cannot reset anything.
 fire(get('[data-profile-confirm-reset]'),'click');assert.equal(resets,0);
 for(const method of ['cancel','escape','backdrop']) {
  const showCount=dialog.showCount;
  fire(trigger,'click');fire(trigger,'click');
  assert.equal(dialog.open,true);assert.equal(dialog.showCount,showCount+1);
  assert.equal(get('[data-profile-cancel-reset]').focused,true);
  point('pointerdown',false);point('click',false);assert.equal(dialog.open,true);
  point('pointerdown',false);point('click',true);assert.equal(dialog.open,true);
  if(method==='cancel')fire(get('[data-profile-cancel-reset]'),'click');
  if(method==='escape'){
   const event=new Event('cancel',{cancelable:true});dialog.dispatchEvent(event);assert.equal(event.defaultPrevented,true);
  }
  if(method==='backdrop'){point('pointerdown',true);point('click',true);}
  await settle();
  assert.equal(dialog.open,false);assert.equal(trigger.focused,true);
  assert.deepEqual([...values],before);assert.equal(JSON.stringify(model.state.records),records);
  assert.equal(resets,0);assert.equal(fullResets,0);
 }
 fire(trigger,'click');fire(get('[data-profile-confirm-reset]'),'click');fire(get('[data-profile-confirm-reset]'),'click');
 assert.equal(resets,1);assert.equal(dialog.open,false);await settle();
 assert.equal(model.state.selected,null);assert.equal(model.state.discovered.size,0);
 assert.equal(model.state.visitedRegions.size,0);assert.equal(model.state.records.length,0);
 assert.equal(values.get(PROFILE_KEY),profile);assert.equal(values.get(INTRO_KEY),'1');
 assert.equal(values.get('other-site.setting'),'keep');assert.equal(fullResets,0);
 assert.equal(getResearcherSummary(model.state).title,'見習研究員');
 assert.ok(getResearcherSummary(model.state).badges.every(b=>!b.unlocked));
 const after=[...values];
 fire(trigger,'click');assert.equal(dialog.open,true);
 controller.abort();await settle();assert.equal(dialog.open,false);
 fire(get('[data-profile-confirm-reset]'),'click');assert.equal(resets,1);
 assert.deepEqual([...values],after);
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
 assert.equal(model.resetAllResearchData().ok,true);
 assert.equal(timers.size,0);assert.equal(visible,false);
 assert.equal(values.has(PROGRESS_KEY),false);assert.equal(values.has(INTRO_KEY),false);
 assert.equal(JSON.parse(values.get(PROFILE_KEY)).name,'未命名研究員');
 assert.equal(values.get('another-app.setting'),'keep');assert.equal(values.get('twe.unrelated.v1'),'also keep');
 assert.equal(model.state.discovered.size,0);assert.equal(model.state.visitedRegions.size,0);assert.equal(model.state.records.length,0);
 const liveIdentity=model.getResearcherProfile();
 assert.match(liveIdentity.id,/^TW-[A-Z0-9]{4}$/);assert.notEqual(liveIdentity.id,'TW-OLD1');
 oldGuide.resetIntroMemory();assert.equal(oldGuide.hasHandledIntro(),false);
 // Fresh module instances verify persistence, not a navigation-based reset.
 const freshUrl=new URL(`../scripts/state.js?boot=${revision++}`,import.meta.url);
 const fresh=await import(freshUrl),events=[];fresh.subscribeExploration(event=>events.push(event));
 const identity=fresh.getResearcherProfile();
 assert.equal(identity.name,'未命名研究員');assert.match(identity.id,/^TW-[A-Z0-9]{4}$/);assert.notEqual(identity.id,'TW-OLD1');
 assert.notEqual(identity.joinedDate,'2000-01-01');
 assert.deepEqual(identity,liveIdentity);
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

test('failed deletion keeps memory/data intact; identity write failure still leaves a usable fresh session',async()=>{
 seed();const model=await loadState();
 const before=values.get(PROGRESS_KEY);
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{...local,removeItem(){throw Error('denied');}}});
 const failure=model.resetAllResearchData();
 assert.equal(failure.ok,false);assert.equal(model.state.discovered.size,5);
 assert.equal(values.get(PROGRESS_KEY),before);
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{...local,setItem(){throw Error('write denied');}}});
 const success=model.resetAllResearchData();
 assert.equal(success.ok,true);assert.equal(success.persisted,false);
 assert.equal(model.state.discovered.size,0);assert.equal(model.state.researcher,'未命名研究員');
 assert.match(model.getResearcherProfile().id,/^TW-[A-Z0-9]{4}$/);
 assert.equal(model.hasStorageError(),true);
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:local});
 assert.equal(model.setResearcher('可繼續研究').ok,true);
 assert.equal(model.visitRegion(regionIds[0]),true);assert.equal(model.selectAnimal('bear'),true);
 assert.equal(model.resetAllResearchData().ok,true);
});
