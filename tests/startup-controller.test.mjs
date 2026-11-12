import test from 'node:test';
import assert from 'node:assert/strict';
import { createStartupController, STARTUP_STAGES } from '../scripts/startup-controller.js';
import { STARTUP_KEY, PROJECT_STORAGE_KEYS, removeProjectStorage } from '../scripts/project-storage.js';

function fixture(options = {}) {
  const data = new Map([['twe.exploration.v1','existing progress'],['twe.researcher.v1','existing identity']]);
  const storage = {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};
  const pending=new Map(), queued=[];
  let next=0,now=0;
  const schedule=(callback,delay)=>{const id=++next;pending.set(id,{callback,delay,due:now+delay});queued.push(callback);return id;};
  const unschedule=id=>pending.delete(id);
  const view={visible:false,opens:0,closes:0,blocked:false,stages:[],timeline:[],durations:[],
    canOpen(){return !this.blocked;},
    open(value){this.visible=true;this.opens++;this.callbacks=value;},
    showStage(stage){this.stages.push(stage.id);this.timeline.push([stage.id,now]);this.durations.push(stage.durationMs);},
    close(){this.visible=false;this.closes++;}};
  const outcomes=[];
  const controller=createStartupController({view,storage,schedule,unschedule,
    onFinish:value=>{assert.equal(view.visible,false);outcomes.push(value);},...options});
  const tick=()=>{const [id,task]=pending.entries().next().value;pending.delete(id);now=task.due;task.callback();};
  const advanceBy=elapsed=>{
    const target=now+elapsed;
    while(pending.size && [...pending.values()][0].due<=target)tick();
    now=target;
  };
  return {controller,view,storage,data,pending,queued,outcomes,tick,advanceBy,get now(){return now;}};
}

test('first visit runs 3000/4000/5000ms stages, then closes before its one handoff at 12000ms',()=>{
  const identity={name:'既有研究員',id:'TW-1234',joinedDate:'2026-11-01'};
  const f=fixture({getProfile:()=>identity});
  assert.equal(f.controller.start(),true);
  assert.equal(f.controller.start(),false);
  assert.equal(f.view.callbacks.profile,identity);
  assert.equal(f.data.has(STARTUP_KEY),false);
  for(let i=0;i<3;i++) {
    assert.equal(f.pending.size,1);
    assert.equal([...f.pending.values()][0].delay,[3000,4000,5000][i]);
    f.tick();
  }
  assert.deepEqual(f.view.stages,STARTUP_STAGES.map(s=>s.id));
  assert.deepEqual(f.view.timeline,[['initialization',0],['identification',3000],['assignment',7000]]);
  assert.equal(f.now,12000);
  assert.deepEqual(f.outcomes,[{reason:'completed',played:true}]);
  assert.equal(f.data.get(STARTUP_KEY),'1');
  assert.equal(f.data.get('twe.exploration.v1'),'existing progress');
  assert.equal(f.data.get('twe.researcher.v1'),'existing identity');
  assert.equal(f.pending.size,0);
  assert.equal(f.controller.getStatus(),'finished');
});

test('stage boundaries remain initial until 3s, identity until 7s and mission until 12s',()=>{
  const f=fixture();f.controller.start();
  const current=()=>f.view.stages.at(-1);
  f.advanceBy(2999);assert.equal(current(),'initialization');assert.equal(f.outcomes.length,0);
  f.advanceBy(1);assert.equal(current(),'identification');
  f.advanceBy(3999);assert.equal(current(),'identification');
  f.advanceBy(1);assert.equal(current(),'assignment');
  f.advanceBy(4999);assert.equal(current(),'assignment');assert.equal(f.view.visible,true);
  f.advanceBy(1);assert.equal(f.view.visible,false);assert.equal(f.outcomes.length,1);
});

test('skip is immediate in every stage and late timer work cannot restart playback',()=>{
  for(const time of [0,1500,2999,3000,6000,6999,7000,11000,11999]) {
    const f=fixture();f.controller.start();f.advanceBy(time);
    const stageCount=f.view.stages.length;
    assert.equal(f.controller.skip(),true);
    assert.equal(f.view.visible,false);assert.equal(f.pending.size,0);
    f.queued.forEach(callback=>callback());f.advanceBy(20000);
    assert.equal(f.view.stages.length,stageCount);assert.equal(f.view.opens,1);
    assert.deepEqual(f.outcomes,[{reason:'skipped',played:true}]);
  }
});

test('optional total-duration overrides stay synchronized with durations passed to the view',()=>{
  const f=fixture({durationMs:6000});f.controller.start();
  for(const duration of [1500,2000,2500]) {
    assert.equal([...f.pending.values()][0].delay,duration);
    assert.equal(f.view.durations.at(-1),duration);f.tick();
  }
  assert.equal(f.now,6000);assert.equal(f.outcomes.length,1);
});

test('skip, complete and queued callbacks can finish each run only once',()=>{
  const f=fixture();f.controller.start();
  const old=f.view.callbacks;
  old.onSkip();old.onSkip();old.onComplete();
  assert.equal(f.controller.skip(),false);assert.equal(f.controller.complete(),false);
  f.queued.forEach(callback=>callback());
  assert.deepEqual(f.outcomes,[{reason:'skipped',played:true}]);
  assert.equal(f.view.closes,1);assert.equal(f.pending.size,0);
  assert.equal(f.view.stages.length,1);assert.equal(f.data.get(STARTUP_KEY),'1');
});

test('seen and legacy returning visitors skip playback; a fresh controller reads the saved flag',()=>{
  const f=fixture();f.controller.start();f.controller.complete();
  const view={canOpen(){assert.fail('Seen users must not open a screen');}};
  const outcomes=[];
  const restored=createStartupController({view,storage:f.storage,onFinish:value=>outcomes.push(value)});
  assert.equal(restored.start(),true);assert.equal(restored.start(),false);
  assert.deepEqual(outcomes,[{reason:'already-seen',played:false}]);
  const legacy=fixture({returningUser:()=>true});legacy.controller.start();
  assert.equal(legacy.view.opens,0);assert.equal(legacy.pending.size,0);
  assert.equal(legacy.data.get(STARTUP_KEY),'1');
});

test('cancel clears timers without storing or handing off; stale work cannot affect a new run',()=>{
  const f=fixture();f.controller.start();
  const old=f.view.callbacks, queued=f.queued[0];
  assert.equal(f.controller.cancel(),true);
  assert.equal(f.pending.size,0);assert.equal(f.outcomes.length,0);
  assert.equal(f.data.has(STARTUP_KEY),false);
  f.controller.start();
  old.onComplete();old.onSkip();queued();
  assert.equal(f.controller.getStatus(),'running');
  assert.equal(f.view.visible,true);assert.equal(f.view.stages.length,2);
  f.controller.complete();assert.equal(f.outcomes.length,1);
});

test('completed/skipped runs cannot finish or advance an immediately replayed opening',()=>{
  for(const reason of ['completed','skipped']) {
    const f=fixture();f.controller.start();
    const old=f.view.callbacks,oldTimers=[...f.queued];
    if(reason==='completed')f.controller.complete();else f.controller.skip();
    assert.equal(f.controller.replay(),true);
    const stages=f.view.stages.length;
    old.onComplete();old.onSkip();oldTimers.forEach(callback=>callback());
    assert.equal(f.controller.getStatus(),'running');assert.equal(f.view.visible,true);
    assert.equal(f.view.stages.length,stages);assert.equal(f.pending.size,1);
    assert.equal(f.outcomes.length,1);
    f.advanceBy(12000);
    assert.equal(f.controller.getStatus(),'finished');assert.equal(f.outcomes.length,2);
    assert.equal(f.pending.size,0);assert.equal(f.view.closes,2);
  }
});

test('replay is explicit, supports its own completion callback and refuses another open modal',()=>{
  const f=fixture();f.controller.start();f.controller.skip();
  f.view.blocked=true;assert.equal(f.controller.replay(),false);
  assert.equal(f.view.opens,1);assert.equal(f.pending.size,0);
  f.view.blocked=false;let replays=0;
  assert.equal(f.controller.replay({onFinish:()=>replays++}),true);
  assert.equal(f.controller.replay(),false);
  f.controller.complete();f.controller.skip();
  assert.equal(replays,1);assert.equal(f.outcomes.length,1);assert.equal(f.view.opens,2);
});

test('blocked storage does not block finishing; dispose cancels all work permanently',()=>{
  const f=fixture({storage:{getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}}});
  assert.doesNotThrow(()=>f.controller.start());
  assert.doesNotThrow(()=>f.controller.skip());assert.equal(f.outcomes.length,1);
  assert.equal(f.controller.start(),false);
  f.controller.replay();const callbacks=f.view.callbacks;
  f.controller.dispose();callbacks.onSkip();callbacks.onComplete();
  f.queued.forEach(callback=>callback());
  assert.equal(f.controller.getStatus(),'disposed');
  assert.equal(f.pending.size,0);assert.equal(f.controller.start(),false);
  assert.equal(f.controller.replay(),false);assert.equal(f.outcomes.length,1);
});

test('explicit replay retains the original reset scopes and startup playback flag',()=>{
  const f=fixture();f.data.set(STARTUP_KEY,'1');
  assert.ok(!PROJECT_STORAGE_KEYS.includes(STARTUP_KEY));
  assert.equal(removeProjectStorage(f.storage).ok,true);
  assert.equal(f.data.get(STARTUP_KEY),'1');
  assert.equal(f.data.has('twe.exploration.v1'),false);
  assert.equal(f.data.has('twe.researcher.v1'),false);
});
