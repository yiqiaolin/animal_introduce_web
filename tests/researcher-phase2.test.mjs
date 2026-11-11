import test from 'node:test';
import assert from 'node:assert/strict';
import {setMaxListeners} from 'node:events';
import {badgeDefinitions,getResearcherSummary,getNewOutcomeNotifications} from '../scripts/researcher-progress.js';
import {createNotificationQueue} from '../scripts/notifications.js';

const ids=['bear','monkey','cat','magpie','salmon'];
const regionIds=['mountain-forest','lowland-forest','alpine-stream'];
const empty=()=>({discovered:new Set(),visitedRegions:new Set(),records:[]});
const storage=new Map();
Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)}});
let version=0;
const reload=()=>import(`../scripts/state.js?phase2=${version++}`);

test('zero statistics and every title/percentage boundary derive from distinct species',()=>{
 const data=empty();
 const zero=getResearcherSummary(data);
 assert.equal(zero.discoveredCount,0);assert.equal(zero.completion,0);
 assert.equal(zero.visitedCount,0);assert.equal(zero.recordCount,0);
 assert.equal(zero.badges.filter(b=>b.unlocked).length,0);
 const titles=['見習研究員','見習研究員','野外觀察員','野外觀察員','資深研究員','生態探索專家'];
 for(let n=0;n<=5;n++){
  data.discovered=new Set(ids.slice(0,n));
  data.discovered.add('invalid');
  const summary=getResearcherSummary(data);
  assert.equal(summary.discoveredCount,n);assert.equal(summary.completion,n*20);assert.equal(summary.title,titles[n]);
 }
 data.records=[{id:'bear'},{id:'cat'},{id:'salmon'}];
 assert.equal(getResearcherSummary(data).recordCount,3);
});

test('all six badge conditions depend on the required animal/region IDs only',()=>{
 const data=empty();
 const unlocked=()=>getResearcherSummary(data).badges.filter(b=>b.unlocked).map(b=>b.id);
 data.discovered.add('bear');assert.deepEqual(unlocked(),['first-discovery']);
 data.discovered.add('monkey');assert.ok(unlocked().includes('forest-observer'));
 data.discovered.add('cat');assert.ok(!unlocked().includes('lowland-investigator'));
 data.discovered.add('magpie');assert.ok(unlocked().includes('lowland-investigator'));
 assert.ok(!unlocked().includes('stream-guardian'));assert.ok(!unlocked().includes('archive-collector'));
 data.discovered.add('salmon');assert.ok(unlocked().includes('stream-guardian'));assert.ok(unlocked().includes('archive-collector'));
 data.visitedRegions=new Set(regionIds.slice(0,2));assert.ok(!unlocked().includes('island-explorer'));
 data.visitedRegions.add('unknown');assert.equal(getResearcherSummary(data).visitedCount,2);
 data.visitedRegions.add('alpine-stream');assert.equal(unlocked().length,6);
 assert.ok(badgeDefinitions.every(b=>b.icon.includes('<svg')&&!b.icon.includes('http')));
});

test('region visits persist by ID, deduplicate, and old saves do not infer visits',async()=>{
 storage.clear();
 storage.set('twe.exploration.v1',JSON.stringify({version:1,discovered:['bear'],records:[{id:'bear',regionId:'mountain-forest',time:null}]}));
 const model=await reload();
 assert.equal(model.state.visitedRegions.size,0);
 assert.equal(model.visitRegion('mountain-forest'),true);
 assert.equal(model.visitRegion('mountain-forest'),false);
 assert.equal(model.visitRegion('山地森林研究區'),false);
 assert.equal(model.visitRegion('__proto__'),false);
 assert.equal(model.state.visitedRegions.size,1);
 assert.equal(model.state.records.length,1);
 const events=[];model.subscribeExploration(event=>events.push(event));
 model.visitRegion('lowland-forest');model.visitRegion('alpine-stream');model.visitRegion('alpine-stream');
 assert.equal(events.length,2);
 assert.deepEqual(events.at(-1).notifications.map(n=>n.title),['成就解鎖 · 島嶼探索者']);
 const restored=await reload();const replay=[];
 restored.subscribeExploration(event=>replay.push(event));
 assert.equal(restored.state.visitedRegions.size,3);
 assert.equal(restored.getResearcherProfile().title,'見習研究員');
 getResearcherSummary(restored.state);assert.equal(replay.length,0);
 restored.selectAnimal('bear');assert.equal(replay.at(-1).notifications.length,0);
 const saved=JSON.parse(storage.get('twe.exploration.v1'));
 assert.ok(!('badges' in saved));assert.ok(!('completion' in saved));assert.ok(!('title' in saved));
});

test('new discoveries produce only new badge/promotion outcomes and edited records just refresh',async()=>{
 storage.clear();const model=await reload();const events=[];
 model.subscribeExploration(event=>events.push(event));
 for(const id of ids)model.selectAnimal(id);
 const outcomes=events.flatMap(event=>event.notifications);
 assert.equal(outcomes.filter(n=>n.kind==='badge').length,5); // Island badge requires actual visits.
 assert.equal(outcomes.filter(n=>n.kind==='promotion').length,3);
 assert.deepEqual(events.at(-1).notifications.map(n=>n.kind),['badge','badge','promotion']);
 assert.match(events.at(-1).notifications.at(-1).title,/生態探索專家/);
 model.selectAnimal('salmon');assert.equal(events.at(-1).notifications.length,0);
 assert.equal(model.state.records.length,5);
 model.state.records.pop();model.persistProgress();
 assert.equal(events.at(-1).reason,'records-updated');
 assert.equal(events.at(-1).summary.recordCount,4);assert.equal(events.at(-1).notifications.length,0);
 const before=getResearcherSummary(empty()),after=getResearcherSummary(model.state);
 assert.ok(getNewOutcomeNotifications(before,after).length>1);
});

test('restoring full progress derives all badges/title without replaying outcomes',async()=>{
 storage.clear();
 storage.set('twe.exploration.v1',JSON.stringify({version:1,discovered:ids,visitedRegions:[...regionIds,'invalid','mountain-forest'],
  records:ids.map(id=>({id,time:'2026-11-11T02:00:00.000Z'}))}));
 const model=await reload(),events=[];
 model.subscribeExploration(event=>events.push(event));
 const summary=getResearcherSummary(model.state);
 assert.equal(summary.completion,100);assert.equal(summary.visitedCount,3);
 assert.equal(summary.badges.filter(b=>b.unlocked).length,6);
 assert.equal(model.getResearcherProfile().title,'生態探索專家');
 assert.equal(events.length,0);
 assert.equal(model.visitRegion('alpine-stream'),false);
 model.selectAnimal('salmon');assert.equal(events.at(-1).notifications.length,0);
});

test('notification FIFO serializes simultaneous badges and promotion, with reset cancellation',()=>{
 const pending=new Map();let nextId=0;const shown=[],hidden=[];
 const queue=createNotificationQueue({show:n=>shown.push(n.title),hide:()=>hidden.push(true),
  setTimer:callback=>{pending.set(++nextId,callback);return nextId;},clearTimer:id=>pending.delete(id)});
 queue.enqueue([{title:'溪流守護者'},{title:'圖鑑收藏家'},{title:'生態探索專家'}]);
 assert.deepEqual(shown,['溪流守護者']);assert.equal(pending.size,1);
 const tick=()=>{const [id,callback]=pending.entries().next().value;pending.delete(id);callback();};
 tick();assert.deepEqual(shown,['溪流守護者','圖鑑收藏家']);assert.equal(pending.size,1);
 tick();assert.equal(shown.at(-1),'生態探索專家');tick();assert.equal(pending.size,0);assert.equal(hidden.length,3);
 queue.enqueue([{title:'old'},{title:'should-not-show'}]);queue.clear();assert.equal(pending.size,0);
 queue.enqueue([{title:'fresh'}]);assert.equal(shown.at(-1),'fresh');
});

class Element extends EventTarget {
 constructor(){super();this.dataset={};this.style={};this.attributes={};this.hidden=false;this.value='';this.textContent='';this.scrollTop=0;this.children=new Map();this.classes=new Set();this.classList={toggle:(name,value)=>value?this.classes.add(name):this.classes.delete(name)};}
 addEventListener(type,callback,options){if(options?.signal)setMaxListeners(0,options.signal);super.addEventListener(type,callback,options);}
 querySelector(selector){if(!this.children.has(selector))this.children.set(selector,new Element());return this.children.get(selector);}
 querySelectorAll(selector){return selector==='[data-badge]'?this.badges:[];}
 setAttribute(k,v){this.attributes[k]=v;}getAttribute(k){return this.attributes[k]??null;}removeAttribute(k){delete this.attributes[k];}
 focus(){}select(){}
}
const click=element=>element.dispatchEvent(new Event('click'));

test('dashboard handles locked badge details, switching, collapse and live title/ring updates without replacing drafts',async()=>{
 storage.clear();
 const model=await import('../scripts/state.js');model.resetProgress();
 const {renderResearcherDashboard,bindResearcherDashboard}=await import('../scripts/researcher-dashboard.js');
 const markup=renderResearcherDashboard();assert.equal((markup.match(/data-badge="/g)||[]).length,6);
 const root=new Element();root.badges=badgeDefinitions.map(badge=>{const b=new Element();b.dataset.badge=badge.id;return b;});
 const controller=new AbortController();bindResearcherDashboard(root,{signal:controller.signal});
 const find=s=>root.querySelector(s);
 assert.equal(find('[data-profile-species]').textContent,'0 / 5');
 assert.equal(find('.researcher-ring-progress').style.strokeDashoffset,'100');
 click(root.badges[1]);assert.equal(find('#researcher-badge-details').hidden,false);
 assert.match(find('[data-badge-detail-name]').textContent,/森林觀察員/);
 assert.match(find('[data-badge-detail-status]').textContent,/尚未解鎖/);
 click(root.badges[2]);assert.equal(root.badges[1].getAttribute('aria-pressed'),'false');assert.equal(root.badges[2].getAttribute('aria-pressed'),'true');
 click(root.badges[2]);assert.equal(find('#researcher-badge-details').hidden,true);
 find('#profile-name-input').value='unsaved draft';root.scrollTop=42;
 ids.forEach(id=>model.selectAnimal(id));
 assert.equal(find('[data-profile-title]').textContent,'生態探索專家');
 assert.equal(find('[data-profile-summary-title]').textContent,'生態探索專家');
 assert.equal(find('[data-profile-percent]').textContent,'100%');
 assert.equal(find('.researcher-ring-progress').style.strokeDashoffset,'0');
 assert.equal(find('[data-profile-records]').textContent,'5 筆');
 assert.equal(find('#profile-name-input').value,'unsaved draft');assert.equal(root.scrollTop,42);
 regionIds.forEach(id=>model.visitRegion(id));assert.equal(find('[data-profile-regions]').textContent,'3 / 3');
 assert.ok(root.badges.every(b=>b.classes.has('is-unlocked')));
 click(root.badges[4]);assert.match(find('[data-badge-detail-status]').textContent,/已解鎖/);
 model.state.records.pop();model.persistProgress();assert.equal(find('[data-profile-records]').textContent,'4 筆');
 controller.abort();model.resetProgress();
 assert.equal(find('[data-profile-percent]').textContent,'100%'); // Closed views unsubscribe.
 const reopened=new Element();reopened.badges=badgeDefinitions.map(badge=>{const b=new Element();b.dataset.badge=badge.id;return b;});
 const newController=new AbortController();bindResearcherDashboard(reopened,{signal:newController.signal});
 assert.equal(reopened.querySelector('[data-profile-percent]').textContent,'0%');
 assert.equal(reopened.querySelector('#researcher-badge-details').hidden,true);newController.abort();
});
