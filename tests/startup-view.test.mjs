import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const stored=new Map();
Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{
  getItem:key=>stored.get(key)??null,setItem:(key,value)=>stored.set(key,value)
}});
const { createStartupView, initResearchStartup } = await import('../scripts/research-startup.js');
const { getResearcherProfile, setResearcher } = await import('../scripts/state.js');
const { STARTUP_STAGES, STARTUP_FADE_OUT_MS } = await import('../scripts/startup-controller.js');

class Element extends EventTarget {
  constructor() { super();this.style={setProperty(key,value){this[key]=value;},removeProperty(key){delete this[key];}};this.dataset={};this.attributes={};this.textContent='';this.isConnected=true;this.open=false; }
  setAttribute(key,value) { this.attributes[key]=value; }
  focus() { document.activeElement=this; }
}
function fixture() {
  const dialog=new Element(),stage=new Element(),name=new Element(),skip=new Element(),previous=new Element();
  const panels=STARTUP_STAGES.map(value=>{const panel=new Element();panel.dataset.startupPanel=value.id;return panel;});
  const animations=[{cancelled:false,cancel(){this.cancelled=true;}},{cancelled:false,cancel(){this.cancelled=true;}}];
  dialog.querySelector=selector=>({'[data-startup-stage]':stage,'[data-startup-name]':name,'[data-startup-skip]':skip}[selector]);
  dialog.querySelectorAll=()=>panels;
  dialog.showModal=()=>{dialog.open=true;};
  dialog.close=()=>{dialog.open=false;queueMicrotask(()=>dialog.dispatchEvent(new Event('close')));};
  dialog.getAnimations=options=>{assert.deepEqual(options,{subtree:true});return animations;};
  const root={style:{overflow:'auto',scrollbarGutter:''}};
  globalThis.document={activeElement:previous,documentElement:root,
    querySelector:selector=>selector==='#research-startup-dialog'?dialog:selector==='dialog[open]'&&dialog.open?dialog:null};
  return {view:createStartupView(),dialog,stage,name,skip,panels,root,previous,animations};
}

test('formal markup contains all three stages, required copy and one always-available skip button',()=>{
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8').split('<dialog id="research-startup-dialog"')[1].split('</dialog>')[0];
  for(const value of STARTUP_STAGES)assert.ok(html.includes(`data-startup-panel="${value.id}"`));
  for(const text of ['INITIALIZING RESEARCH SYSTEM','臺灣野生動物探索計畫','RESEARCHER IDENTIFIED',
    '野生動物調查研究員','身分驗證完成','IDENTITY VERIFIED / ACCESS GRANTED','MISSION BRIEFING',
    '野生動物調查任務已啟動','探索臺灣不同生態區域，尋找野生動物，建立你的物種研究圖鑑。',
    '研究任務準備完成','未命名研究員'])assert.ok(html.includes(text));
  assert.equal((html.match(/<button/g)||[]).length,1);
  assert.ok(html.indexOf('data-startup-skip')<html.indexOf('class="startup-stages"'));
  assert.doesNotMatch(html,/<audio|啟動流程驗證畫面/);
});

test('view exposes only the current stage and safely renders existing researcher names',async()=>{
  const f=fixture();let skips=0;
  const name='<img src=x onerror=alert(1)>';
  const before=[...stored];
  f.view.open({profile:{name},onSkip:()=>skips++});
  assert.equal(f.name.textContent,name);
  assert.equal(f.name.innerHTML,undefined); // Renderer never assigns markup to the name.
  assert.equal(document.activeElement,f.skip);assert.equal(f.root.style.overflow,'hidden');
  for(const [index,value] of STARTUP_STAGES.entries()) {
    f.view.showStage(value,index);
    assert.equal(f.stage.textContent,value.label);
    assert.equal(f.dialog.dataset.startupPhase,value.id);
    assert.equal(f.dialog.style['--startup-stage-duration'],`${value.durationMs}ms`);
    assert.equal(f.dialog.style['--startup-fade-duration'],'280ms');
    f.panels.forEach(panel=>{
      const active=panel.dataset.startupPanel===value.id;
      assert.equal(panel.dataset.active,String(active));
      assert.equal(panel.attributes['aria-hidden'],String(!active));
      assert.equal(panel.inert,!active);
    });
    assert.equal(document.activeElement,f.skip); // Stage transitions never move focus.
  }
  f.view.close();await Promise.resolve();
  assert.ok(f.animations.every(animation=>animation.cancelled));
  assert.equal(f.dialog.open,false);assert.equal(f.dialog.dataset.startupPhase,undefined);
  assert.equal(f.dialog.style['--startup-stage-duration'],undefined);
  assert.ok(f.panels.every(panel=>panel.inert&&panel.dataset.active==='false'));
  assert.equal(document.activeElement,f.previous);assert.equal(f.root.style.overflow,'auto');
  assert.equal(f.name.textContent,'');assert.equal(skips,0);
  f.view.open({profile:{name:'   '},onSkip:()=>{}});
  assert.equal(f.name.textContent,'未命名研究員');
  f.view.close();
  assert.deepEqual([...stored],before);
});

test('real profile feeds the card; stale animation events cannot finish the controller',()=>{
  const f=fixture();setResearcher('山林觀察員');
  const beforeProfile=getResearcherProfile();
  const before=[...stored];
  let ready=0,next=0;const timers=new Map();
  const control=initResearchStartup({view:f.view,onReady:()=>ready++,returningUser:()=>false,
    storage:{getItem:()=>null,setItem(){}},
    schedule:callback=>{timers.set(++next,callback);return next;},unschedule:id=>timers.delete(id)});
  control.start();assert.equal(f.name.textContent,beforeProfile.name);
  const tick=()=>{const [id,callback]=timers.entries().next().value;timers.delete(id);callback();};
  tick();assert.equal(f.dialog.dataset.startupPhase,'identification');
  f.dialog.dispatchEvent(new Event('animationend'));assert.equal(ready,0);
  tick();assert.equal(f.dialog.dataset.startupPhase,'assignment');
  tick();assert.equal(ready,1);assert.equal(f.dialog.open,false);
  f.dialog.dispatchEvent(new Event('animationend'));control.complete();control.skip();
  assert.equal(ready,1);assert.equal(timers.size,0);
  assert.deepEqual(getResearcherProfile(),beforeProfile);assert.deepEqual([...stored],before);
});

test('queued native close from the previous opening cannot skip a newly opened view',async()=>{
  const f=fixture();let oldSkips=0,newSkips=0;
  f.view.open({profile:{name:'上一輪'},onSkip:()=>oldSkips++});
  f.view.showStage(STARTUP_STAGES[2]);
  f.view.close(); // Native close event is queued, not dispatched synchronously.
  f.view.open({profile:{name:'新一輪'},onSkip:()=>newSkips++});
  f.view.showStage(STARTUP_STAGES[0]);
  await Promise.resolve();
  assert.equal(f.dialog.open,true);assert.equal(oldSkips,0);assert.equal(newSkips,0);
  assert.equal(f.name.textContent,'新一輪');
  assert.equal(f.dialog.dataset.startupPhase,'initialization');
  assert.equal(document.activeElement,f.skip);assert.equal(f.root.style.overflow,'hidden');
  f.skip.dispatchEvent(new Event('click'));
  assert.equal(oldSkips,0);assert.equal(newSkips,1); // Only the current listener remains.
  f.view.close();await Promise.resolve();
  f.skip.dispatchEvent(new Event('click'));
  assert.equal(newSkips,1);assert.equal(f.dialog.open,false);
  assert.equal(f.root.style.overflow,'auto');assert.equal(document.activeElement,f.previous);
});

test('CSS provides reduced motion, focus visibility, stable stage layout and bounded stage timings',()=>{
  const css=readFileSync(new URL('../styles/main.css',import.meta.url),'utf8');
  const startup=css.slice(css.indexOf('/* Research startup:'),css.indexOf('\ndialog {'));
  assert.match(startup,/\.startup-stages \{ display:grid;/);
  assert.match(startup,/grid-area:1 \/ 1/);
  assert.match(startup,/\.startup-skip:focus-visible \{ outline:2px/);
  assert.match(startup,/position:fixed/);
  assert.match(startup,/startup-progress-fill var\(--startup-stage-duration\)/);
  assert.match(startup,/startup-overlay-out var\(--startup-fade-duration\) max\(0ms, calc\(var\(--startup-stage-duration\) - var\(--startup-fade-duration\)\)\)/);
  assert.match(startup,/startup-stage-in \.35s/);
  assert.match(startup,/startup-verified-in \.25s \.85s/);
  assert.match(startup,/startup-ready-glow \.8s/);
  assert.ok(STARTUP_STAGES[1].durationMs - (850 + 250) >= 2000);
  assert.ok(STARTUP_STAGES[2].durationMs - 800 - STARTUP_FADE_OUT_MS >= 3000);
  const reduced=startup.slice(startup.indexOf('@media (prefers-reduced-motion:reduce)'));
  assert.match(reduced,/animation:none!important; transition:none!important/);
  assert.match(reduced,/\.startup-identity-card::after \{ display:none/);
  assert.match(reduced,/\.startup-progress span \{ transform:scaleX\(1\)/);
});
