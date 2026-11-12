import test from 'node:test';
import assert from 'node:assert/strict';
import { createResearchAppFixture } from './helpers/research-app-fixture.mjs';

const app=createResearchAppFixture([
  ['twe.researcher.v1',JSON.stringify({version:1,name:'森林研究員',id:'TW-OLD1',joinedDate:'2000-01-01',custom:'remove on full reset'})],
  ['wildlifeExplorer_introSeen','1'],['twe.startup.v1','1'],['unrelated.setting','keep']
]);
const {researchStartup}=await import('../scripts/main.js');
const model=await import('../scripts/state.js');
const guide=await import('../scripts/exploration-guide.js');
const {getResearcherSummary}=await import('../scripts/researcher-progress.js');
const species=['bear','monkey','cat','magpie','salmon'];
const regions=['mountain-forest','lowland-forest','alpine-stream'];
const seedProgress=()=>{species.forEach(id=>model.selectAnimal(id));regions.forEach(id=>model.visitRegion(id));};
const nested=kind=>app.content.querySelector(kind==='all'?'.researcher-full-reset-dialog':'.researcher-restart-dialog');
const startConfirm=kind=>{
  app.toolbarOpen('profile');
  app.fire(app.content.querySelector(kind==='all'?'[data-profile-reset-all]':'[data-profile-restart]'));
};
const confirm=kind=>app.fire(app.content.querySelector(kind==='all'?'[data-full-reset-confirm]':'[data-profile-confirm-reset]'));
const skip=async()=>{app.fire(app.startup.querySelector('[data-startup-skip]'));await app.settle();};
const finishInvitation=async()=>{
  assert.equal(app.utility.dataset.mode,'intro');
  app.fire(app.utility,'click',{closest:selector=>selector==='[data-dialog-action]'?{dataset:{dialogAction:'explore'}}:null});
  await app.settle();
};
const assertZero=()=>{
  assert.equal(model.state.discovered.size,0);assert.equal(model.state.records.length,0);assert.equal(model.state.visitedRegions.size,0);
  assert.equal(model.state.selected,null);assert.equal(getResearcherSummary(model.state).title,'見習研究員');
  assert.ok(getResearcherSummary(model.state).badges.every(badge=>!badge.unlocked));
  assert.match(app.get('#research-panel').innerHTML,/研究設備待命中/);
  assert.equal((app.get('#archive-list').innerHTML.match(/尚未發現/g)||[]).length,5);
  assert.equal(app.get('#progress-text').textContent,'00 / 05');
  assert.ok(app.get('#map-animals').buttons.every(button=>!button.classes.has('discovered')));
  assert.ok(!app.get('#toast').classes.has('visible'));
};

test('cancelling either confirmation preserves every key and does not replay',async()=>{
  seedProgress();
  for(const [kind,method] of ['progress','all'].flatMap(kind=>['cancel','escape','backdrop'].map(method=>[kind,method]))) {
    startConfirm(kind);
    const before=[...app.stored],records=JSON.stringify(model.state.records);
    if(method==='cancel')app.fire(app.content.querySelector(kind==='all'?'[data-full-reset-cancel]':'[data-profile-cancel-reset]'));
    if(method==='escape')app.fire(nested(kind),'cancel');
    if(method==='backdrop')for(const type of ['pointerdown','click']) {
      const event=new Event(type,{cancelable:true});
      Object.defineProperties(event,{clientX:{value:-10},clientY:{value:-10}});
      nested(kind).dispatchEvent(event);
    }
    await app.settle();
    assert.equal(nested(kind).open,false);assert.equal(app.utility.open,true);assert.equal(app.startup.open,false);
    assert.deepEqual([...app.stored],before);assert.equal(JSON.stringify(model.state.records),records);
    await app.dismiss();
  }
  assert.equal(app.navigationCount,0);
});

test('completed reset replay remains marked seen on the next page visit',async()=>{
  const {initResearchStartup}=await import('../scripts/research-startup.js');
  const before=[...app.stored];let ready=0;
  const nextPage=initResearchStartup({onReady:()=>ready++,view:{canOpen(){assert.fail('No replay on a normal refresh');}}});
  assert.equal(nextPage.start(),true);assert.equal(nextPage.getStatus(),'finished');
  assert.equal(nextPage.start(),false);assert.equal(ready,1);
  assert.deepEqual([...app.stored],before);
});

test('failed full deletion leaves modal, identity, progress and startup flag intact without replay',async()=>{
  const previous=globalThis.localStorage;
  const before=[...app.stored],identity=model.getResearcherProfile(),records=JSON.stringify(model.state.records);
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{...previous,removeItem(){throw Error('denied');}}});
  try {
    startConfirm('all');confirm('all');await app.settle();
    assert.equal(nested('all').open,true);assert.equal(app.utility.open,true);assert.equal(app.startup.open,false);
    assert.ok(app.content.querySelector('[data-full-reset-error]').textContent);
    assert.equal(app.content.querySelector('[data-full-reset-confirm]').disabled,false);
    assert.deepEqual([...app.stored],before);assert.deepEqual(model.getResearcherProfile(),identity);
    assert.equal(JSON.stringify(model.state.records),records);
    app.fire(app.content.querySelector('[data-full-reset-cancel]'));await app.settle();await app.dismiss();
  } finally {Object.defineProperty(globalThis,'localStorage',{configurable:true,value:previous});}
  assert.equal(app.navigationCount,0);
});

test('simple reset preserves identity/intro/view, closes all modals, replays once and keeps toolbar bindings',async()=>{
  await app.enterRegion('mountain-forest');app.zoomTo(2.1);
  const beforeView=app.get('#map-world').style.transform,photo=app.get('.island').src;
  const profile=app.stored.get('twe.researcher.v1');
  startConfirm('progress');const child=nested('progress');
  confirm('progress');confirm('progress');await app.settle();
  assert.equal(child.open,false);assert.equal(app.utility.open,false);assert.equal(app.startup.open,true);
  assert.equal(researchStartup.getStatus(),'running');assert.equal(app.timers.size,1);
  assert.equal(app.startup.querySelector('[data-startup-name]').textContent,'森林研究員');
  assert.equal(app.stored.get('twe.researcher.v1'),profile);assert.equal(app.stored.get('wildlifeExplorer_introSeen'),'1');
  assert.equal(app.stored.get('twe.startup.v1'),'1');assert.equal(app.stored.get('unrelated.setting'),'keep');
  assert.equal(app.get('#map-world').style.transform,beforeView);assert.equal(app.get('.island').src,photo);
  assertZero();await skip();assert.equal(app.utility.open,false);
  app.toolbarOpen('profile');
  assert.equal(app.content.querySelector('[data-profile-name]').textContent,'森林研究員');
  assert.equal(app.content.querySelector('[data-profile-species]').textContent,'0 / 5');
  assert.equal(app.content.querySelector('[data-profile-regions]').textContent,'0 / 3');
  await app.dismiss();assert.ok(app.toolbar.every(button=>button.onclickAssignments===1));
  assert.equal(app.navigationCount,0);
});

test('full reset rebuilds in-memory identity, waits for profile close, replays 12s then shows fresh invitation',async()=>{
  seedProgress();guide.markIntroHandled();
  globalThis.matchMedia=()=>({matches:false});
  startConfirm('all');const child=nested('all');confirm('all');
  assert.equal(child.open,false);assert.equal(app.utility.open,true);assert.equal(app.startup.open,false);
  assert.equal(app.content.inert,true);
  app.utility.animation.finish();await app.settle();
  globalThis.matchMedia=()=>({matches:true});
  assert.equal(app.utility.open,false);assert.equal(app.startup.open,true);assertZero();
  const identity=model.getResearcherProfile();
  assert.equal(identity.name,'未命名研究員');assert.match(identity.id,/^TW-[A-Z0-9]{4}$/);assert.notEqual(identity.id,'TW-OLD1');
  assert.notEqual(identity.joinedDate,'2000-01-01');
  assert.equal(JSON.parse(app.stored.get('twe.researcher.v1')).custom,undefined);
  assert.equal(app.stored.has('twe.exploration.v1'),false);assert.equal(app.stored.has('wildlifeExplorer_introSeen'),false);
  assert.equal(app.stored.get('twe.startup.v1'),'1');assert.equal(app.stored.get('unrelated.setting'),'keep');
  assert.equal(guide.hasHandledIntro(),false);
  assert.equal(app.get('.island').src,'assets/map/taiwan-ecological-map.png');
  assert.equal(app.get('#zoom-level').textContent,'100%');
  assert.equal(app.startup.querySelector('[data-startup-name]').textContent,'未命名研究員');
  app.advanceBy(2999);assert.equal(app.startup.dataset.startupPhase,'initialization');
  app.advanceBy(1);assert.equal(app.startup.dataset.startupPhase,'identification');
  app.advanceBy(4000);assert.equal(app.startup.dataset.startupPhase,'assignment');
  app.advanceBy(4999);assert.equal(app.startup.open,true);assert.equal(app.utility.open,false);
  app.advanceBy(1);await app.settle();
  assert.equal(app.startup.open,false);assert.equal(app.utility.open,true);assert.equal(app.timers.size,0);
  await finishInvitation();assert.equal(guide.hasHandledIntro(),true);
  app.toolbarOpen('profile');
  assert.equal(app.content.querySelector('[data-profile-id]').textContent,identity.id);
  assert.equal(app.content.querySelector('[data-profile-name]').textContent,'未命名研究員');
  await app.dismiss();
  model.setResearcher('新身分可儲存');
  assert.equal(JSON.parse(app.stored.get('twe.researcher.v1')).custom,undefined);
  assert.equal(app.navigationCount,0);
});

test('consecutive resets do not accumulate listeners or callbacks; archive/log/guide reflect fresh state',async()=>{
  const events=[];const unsubscribe=model.subscribeExploration(event=>events.push(event.reason));
  for(const kind of ['progress','all','progress','all']) {
    model.selectAnimal('bear');startConfirm(kind);confirm(kind);confirm(kind);await app.settle();
    assert.equal(app.utility.open,false);assert.equal(app.startup.open,true);assertZero();
    await skip();
    if(kind==='all')await finishInvitation();else assert.equal(app.utility.open,false);
    assert.equal(app.timers.size,0);
    assert.equal(app.startup.listeners.filter(listener=>listener.active).length,0);
    assert.equal(app.utility.listeners.filter(listener=>listener.active).length,0);
    assert.ok(app.toolbar.every(button=>button.onclickAssignments===1));
    app.toolbarOpen('records');assert.match(app.content.innerHTML,/尚無探索紀錄/);await app.dismiss();
    app.toolbarOpen('guide');assert.match(app.content.innerHTML,/STEP 05/);await app.dismiss();
  }
  assert.equal(events.filter(reason=>reason==='progress-reset').length,2);
  assert.equal(events.filter(reason=>reason==='project-reset').length,2);
  unsubscribe();assert.equal(app.navigationCount,0);
});

test('pending image loads from before either reset cannot restore a region or add phantom events',async()=>{
  for(const kind of ['progress','all']) {
    app.holdImages(true);await app.enterRegion('lowland-forest');
    startConfirm(kind);confirm(kind);await app.settle();
    assert.equal(app.startup.open,true);assertZero();
    app.releaseImages();app.holdImages(false);await app.settle();
    assert.equal(app.get('.map-panel h1').textContent,'島嶼探索');
    assert.equal(app.get('.island').src,'assets/map/taiwan-ecological-map.png');
    assertZero();assert.equal(app.startup.open,true);
    await skip();if(kind==='all')await finishInvitation();
  }
  // Same live session continues to discover/persist after full reset.
  await app.enterRegion('lowland-forest');app.zoomTo(1.8);
  const cat=app.get('#map-animals').buttons.find(button=>button.dataset.id==='cat');
  app.fire(app.get('#map-world'),'click',cat);
  assert.equal(model.state.discovered.has('cat'),true);assert.equal(model.state.records.length,2);
  assert.match(app.get('#research-panel').innerHTML,/石虎/);
  assert.equal(app.get('#progress-text').textContent,'01 / 05');
  assert.equal(app.navigationCount,0);
});
