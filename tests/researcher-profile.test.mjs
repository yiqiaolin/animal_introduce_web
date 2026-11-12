import test from 'node:test';
import assert from 'node:assert/strict';
import { setMaxListeners } from 'node:events';

const storage=new Map();
Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{
  getItem:key=>storage.get(key)??null,
  setItem:(key,value)=>storage.set(key,value)
}});
let revision=0;
const reload=()=>import(`../scripts/state.js?profileTest=${revision++}`);

test('identity initializes once with a default name, preserves progress/intro, and survives reload',async()=>{
 storage.clear();
 await reload();
 assert.equal(storage.has('wildlifeExplorer_introSeen'),false);
 storage.set('twe.exploration.v1',JSON.stringify({version:1,discovered:['bear'],records:[{id:'bear',time:'2026-11-01T02:00:00.000Z',regionId:'mountain-forest'}]}));
 storage.set('wildlifeExplorer_introSeen','1');
 const progress=storage.get('twe.exploration.v1');
 const first=await reload();
 const identity=first.getResearcherProfile();
 assert.equal(identity.name,'未命名研究員');
 assert.match(identity.id,/^TW-[A-Z0-9]{4}$/);
 assert.match(identity.joinedDate,/^\d{4}-\d{2}-\d{2}$/);
 assert.equal(identity.title,'見習研究員');
 const second=await reload();
 assert.deepEqual(second.getResearcherProfile(),identity);
 assert.equal(second.state.discovered.size,1);
 assert.equal(storage.get('twe.exploration.v1'),progress);
 assert.equal(storage.get('wildlifeExplorer_introSeen'),'1');
 second.setResearcher('  林地研究員  ');
 assert.equal((await reload()).getResearcherProfile().name,'林地研究員');
 second.resetProgress();
 assert.equal((await reload()).getResearcherProfile().id,identity.id);
 assert.equal((await reload()).getResearcherProfile().name,'林地研究員');
});

test('legacy names are retained; metadata repairs do not discard unrelated profile fields',async()=>{
 const legacyName='既有名稱超過十六字元時仍保留原始資料不截斷';
 storage.set('twe.researcher.v1',JSON.stringify({version:1,name:legacyName,custom:'keep'}));
 const model=await reload();
 assert.equal(model.state.researcher,legacyName);
 const saved=JSON.parse(storage.get('twe.researcher.v1'));
 assert.equal(saved.custom,'keep');assert.match(saved.id,/^TW-/);
 assert.equal(model.validateResearcherName(legacyName).ok,false);
});

test('name validation trims, rejects blanks/overlength and leaves stored data untouched on failure',async()=>{
 const model=await reload();
 const before=storage.get('twe.researcher.v1');
 assert.equal(model.setResearcher('   ').ok,false);
 assert.equal(model.setResearcher('林'.repeat(17)).ok,false);
 assert.equal(storage.get('twe.researcher.v1'),before);
 assert.equal(model.researcherNameLength('🐻'.repeat(16)),16);
 assert.equal(model.setResearcher('🐻'.repeat(16)).ok,true);
 assert.equal(model.getResearcherProfile().name,'🐻'.repeat(16));
});

class Element extends EventTarget {
 constructor(){super();this.children=new Map();this.style={};this.hidden=false;this.value='';this.textContent='';this.attributes={};this.scrollTop=55;}
 addEventListener(type,callback,options){if(options?.signal)setMaxListeners(0,options.signal);super.addEventListener(type,callback,options);}
 querySelector(selector){if(!this.children.has(selector))this.children.set(selector,new Element());return this.children.get(selector);}
 querySelectorAll(){return [];}
 getAttribute(k){return this.attributes[k]??null;}
 setAttribute(k,v){this.attributes[k]=v;} removeAttribute(k){delete this.attributes[k];}
 focus(){this.focused=true;} select(){this.selected=true;}
 showModal(){this.open=true;} close(){this.open=false;queueMicrotask(()=>this.dispatchEvent(new Event('close')));}
}
const fire=(element,type)=>element.dispatchEvent(new Event(type,{cancelable:true}));

test('profile editor saves explicitly, renders safely, cancels and drops unsaved drafts on abort',async()=>{
 storage.clear();
 const model=await import('../scripts/state.js');
 model.setResearcher('未命名研究員');
 const {renderResearcherProfile,bindResearcherProfile}=await import('../scripts/researcher-profile.js');
 const markup=renderResearcherProfile();assert.match(markup,/researcher-avatar/);assert.match(markup,/research-summary/);
 const fixedPart=markup.slice(0,markup.indexOf('<div class="researcher-scroll"'));
 assert.ok(!fixedPart.includes('data-profile-id'));
 assert.ok(!fixedPart.includes('data-profile-joined'));
 assert.ok(fixedPart.includes('data-profile-summary-title'));
 assert.ok(markup.indexOf('id="researcher-details"')>markup.indexOf('<div class="researcher-scroll"'));
 const root=new Element(),controller=new AbortController();
 const get=s=>root.querySelector(s);
 const timers=[];const oldSet=globalThis.setTimeout,oldClear=globalThis.clearTimeout;
 globalThis.setTimeout=(callback,delay)=>{timers.push({callback,delay});return timers.length;};
 globalThis.clearTimeout=()=>{};
 try {
  let resets=0;
  bindResearcherProfile(root,{signal:controller.signal,onReset:()=>resets++});
  assert.equal(get('.researcher-scroll').scrollTop,0);
  const edit=get('.researcher-edit'),input=get('#profile-name-input'),form=get('.researcher-name-form');
  const initial=storage.get('twe.researcher.v1');
  const toggle=get('.researcher-details-toggle'),details=get('#researcher-details');
  assert.equal(toggle.getAttribute('aria-expanded'),'false');
  assert.equal(details.getAttribute('aria-hidden'),'true');
  assert.equal(details.inert,true);
  fire(toggle,'click');
  assert.equal(toggle.getAttribute('aria-expanded'),'true');
  assert.equal(toggle.getAttribute('aria-label'),'收合研究員詳細資料');
  assert.equal(details.getAttribute('data-expanded'),'true');
  assert.equal(details.inert,false);
  assert.equal(storage.get('twe.researcher.v1'),initial);
  fire(toggle,'click');
  assert.equal(toggle.getAttribute('aria-expanded'),'false');
  assert.equal(toggle.getAttribute('aria-label'),'展開研究員詳細資料');
  assert.equal(storage.get('twe.researcher.v1'),initial);
  fire(toggle,'click'); // Reopening the modal must discard this display-only state.
  fire(edit,'click');input.value='草稿';fire(input,'input');
  assert.equal(storage.get('twe.researcher.v1'),initial);
  fire(get('[data-profile-cancel]'),'click');assert.equal(model.state.researcher,'未命名研究員');
  fire(edit,'click');input.value=' ';fire(form,'submit');
  assert.match(get('#profile-name-error').textContent,/不能只有空白/);
  input.value='林'.repeat(17);fire(input,'input');fire(form,'submit');
  assert.match(get('#profile-name-error').textContent,/16/);
  input.value='  <img src=x>  ';fire(input,'input');fire(form,'submit');
  assert.equal(model.state.researcher,'<img src=x>');
  assert.equal(get('[data-profile-name]').textContent,'<img src=x>');
  assert.equal(get('.researcher-save-status').textContent,'已儲存 ✓');
  assert.equal(timers.at(-1).delay,2000);timers.at(-1).callback();
  assert.equal(get('.researcher-save-status').textContent,'');
  const identity=model.getResearcherProfile();
  model.selectAnimal('bear');
  fire(get('[data-profile-restart]'),'click');fire(get('[data-profile-confirm-reset]'),'click');
  assert.equal(resets,1);assert.equal(model.state.discovered.size,0);
  assert.deepEqual(model.getResearcherProfile(),identity);
  fire(edit,'click');input.value='未儲存新名稱';controller.abort();
  assert.equal(input.value,'');assert.equal(model.state.researcher,'<img src=x>');
  assert.equal(JSON.parse(storage.get('twe.researcher.v1')).name,'<img src=x>');
  const reopened=new Element(),newController=new AbortController();
  bindResearcherProfile(reopened,{signal:newController.signal,onReset:()=>{}});
  assert.equal(reopened.querySelector('.researcher-scroll').scrollTop,0);
  assert.equal(reopened.querySelector('.researcher-details-toggle').getAttribute('aria-expanded'),'false');
  assert.equal(reopened.querySelector('#researcher-details').inert,true);
  assert.equal(reopened.querySelector('[data-profile-name]').textContent,'<img src=x>');
  newController.abort();
 } finally {globalThis.setTimeout=oldSet;globalThis.clearTimeout=oldClear;}
});
