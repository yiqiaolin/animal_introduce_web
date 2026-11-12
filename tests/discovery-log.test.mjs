import test from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { readFile } from 'node:fs/promises';
const storage = new Map();
Object.defineProperty(globalThis, 'localStorage', {configurable:true, value:{
  getItem:key=>storage.get(key) ?? null, setItem:(key,value)=>storage.set(key,value),
  removeItem:key=>storage.delete(key)
}});
const { state, getExplorationRecords } = await import('../scripts/state.js');
import { animals } from '../scripts/data/animals.js';
import { regions } from '../scripts/data/regions.js';
import { photos } from '../scripts/data/photos.js';
const { renderDiscoveryLog, bindDiscoveryLog } = await import('../scripts/discovery-log.js');

test('empty timeline has exact requested copy and no actions', () => {
  state.records = [];
  const html = renderDiscoveryLog();
  for (const text of ['尚無探索紀錄', 'AWAITING FIRST DISCOVERY', '前往探索地圖，踏入新的研究區域或發現野生動物，這裡就會留下你的探索足跡。']) assert.ok(html.includes(text));
  assert.doesNotMatch(html, /<button|<a\b|<input|<details|<ol/);
});

test('completion requires every known species and region, never eight event rows', () => {
  const species=animals.map(a=>a.id), regionIds=Object.keys(regions);
  const beforeRecords=state.records;
  const beforeSpecies=[...state.discovered], beforeRegions=[...state.visitedRegions];
  const setFlags=(ids, visits)=>{
    state.discovered.clear();ids.forEach(id=>state.discovered.add(id));
    state.visitedRegions.clear();visits.forEach(id=>state.visitedRegions.add(id));
  };
  try {
    for(const [ids, visits] of [
      [[],[]], [species.slice(0,2),[]], [species,regionIds.slice(0,2)],
      [species.slice(0,4),regionIds], [['bear','cat','monkey','salmon','unknown'],regionIds],
      [species,['mountain-forest','lowland-forest','unknown']]
    ]) {
      setFlags(ids,visits);
      assert.doesNotMatch(renderDiscoveryLog(),/EXPLORATION COMPLETE/);
    }
    // Legacy flags can be complete even with zero historical event records.
    setFlags(species,regionIds);state.records=[];
    const html=renderDiscoveryLog();
    assert.match(html,/探索階段完成/);
    assert.match(html,/已踏查所有研究區域，並發現全部 5 種野生動物。/);
    assert.match(html,/EXPLORATION COMPLETE/);
    assert.equal(state.records.length,0);
    assert.doesNotMatch(html,/<button|<a\b|<input/);
  } finally {
    setFlags(beforeSpecies,beforeRegions);state.records=beforeRecords;
  }
});

let reloadRevision=0;
async function restoredLog() {
  const stateUrl=new URL(`../scripts/state.js?log-complete=${reloadRevision++}`,import.meta.url);
  const model=await import(stateUrl.href);
  let source=await readFile(new URL('../scripts/discovery-log.js',import.meta.url),'utf8');
  for(const path of ['./state.js','./researcher-progress.js','./data/photos.js','./research-panel.js']) {
    source=source.replace(`'${path}'`, JSON.stringify(
      path==='./state.js' ? stateUrl.href : new URL(`../scripts/${path.slice(2)}`,import.meta.url).href));
  }
  const view=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
  return {model,view};
}

test('legacy complete flags survive reload with missing history; rendering never changes storage', async () => {
  storage.clear();
  const key='twe.exploration.v1';
  storage.set(key,JSON.stringify({version:1,discovered:animals.map(a=>a.id),visitedRegions:Object.keys(regions),
    records:[{id:'bear',time:null,regionId:null}]}));
  for(let i=0;i<2;i++) {
    const {model,view}=await restoredLog();
    const before=[...storage];
    const html=view.renderDiscoveryLog();
    assert.match(html,/EXPLORATION COMPLETE/);
    assert.match(html,/時間未記錄/);
    assert.ok(html.indexOf('discovery-log-complete')<html.indexOf('discovery-log-timeline'));
    assert.equal((html.match(/<li /g)||[]).length,1);
    assert.equal(model.state.records.length,1);
    assert.deepEqual([...storage],before);
  }
});

test('full exploration persists completion with exactly eight events; both resets remove the marker', async () => {
  storage.clear();
  const {model,view}=await restoredLog();
  Object.keys(regions).forEach(id=>model.visitRegion(id));
  animals.forEach(a=>model.selectAnimal(a.id));
  const before=[...storage];
  const html=view.renderDiscoveryLog();
  assert.match(html,/EXPLORATION COMPLETE/);
  assert.equal((html.match(/<li /g)||[]).length,8);
  assert.equal(model.state.records.length,8);
  assert.deepEqual([...storage],before);
  const restored=await restoredLog();
  assert.match(restored.view.renderDiscoveryLog(),/EXPLORATION COMPLETE/);
  restored.model.resetProgress();
  assert.doesNotMatch(restored.view.renderDiscoveryLog(),/EXPLORATION COMPLETE/);
  assert.match(restored.view.renderDiscoveryLog(),/尚無探索紀錄/);
  Object.keys(regions).forEach(id=>restored.model.visitRegion(id));
  animals.forEach(a=>restored.model.selectAnimal(a.id));
  assert.match(restored.view.renderDiscoveryLog(),/EXPLORATION COMPLETE/);
  assert.equal(restored.model.resetAllResearchData().ok,true);
  assert.doesNotMatch(restored.view.renderDiscoveryLog(),/EXPLORATION COMPLETE/);
  const fresh=await restoredLog();
  assert.doesNotMatch(fresh.view.renderDiscoveryLog(),/EXPLORATION COMPLETE/);
});

test('five species and three regions share canonical mixed ordering and existing local photos', async () => {
  const regionIds = Object.keys(regions);
  state.records = [
    ...animals.map((animal, i) => ({type:'species_discovered', id:animal.id,
      regionId:regionIds.find(id=>regions[id].animals.some(a=>a.id===animal.id)),
      time:new Date(`2026-11-0${i+1}T00:00:00Z`)})),
    ...regionIds.map((id, i) => ({type:'region_entered', id, regionId:id,
      time:new Date(`2026-11-0${i+1}T01:00:00Z`)}))
  ];
  const before = JSON.stringify(state.records);
  const html = renderDiscoveryLog();
  assert.equal((html.match(/<li /g) || []).length, 8);
  assert.equal((html.match(/SPECIES DISCOVERED/g) || []).length, 5);
  assert.equal((html.match(/REGION DISCOVERED/g) || []).length, 3);
  assert.deepEqual([...html.matchAll(/<h3>(.*?)<\/h3>/g)].map(m=>m[1]), getExplorationRecords().map(e=>e.name));
  for (const animal of animals) {
    assert.ok(html.includes(photos[animal.id].src));
    assert.ok(!html.includes(animal.illustration));
    await access(new URL(`../${photos[animal.id].src}`, import.meta.url));
  }
  for (const region of Object.values(regions)) {
    assert.ok(html.includes(region.image));
    assert.ok(html.includes(region.description));
    await access(new URL(`../${region.image}`, import.meta.url));
  }
  assert.match(html, /2026\/11\/01\s08:00/);
  assert.equal(JSON.stringify(state.records), before);
  assert.doesNotMatch(html, /<button|<a\b|<details|<input/);
});

test('unknown historic times and regions do not infer information or show invalid dates', () => {
  state.records = [{type:'species_discovered', id:'bear', regionId:null, time:null}];
  const html = renderDiscoveryLog();
  assert.match(html, /時間未記錄/);
  assert.match(html, /所屬研究區域未記錄/);
  assert.doesNotMatch(html, /Invalid Date|undefined|null|山地森林研究區|<time/);
});

test('timeline slots retain image dimensions and handle cached, failed and missing images', () => {
  const events = {};
  const image = {complete:false, naturalWidth:0, hidden:true,
    addEventListener:(type, fn)=>events[type]=fn};
  const placeholder = {hidden:false};
  const root = { querySelectorAll: () => [{querySelector:selector=>selector==='img'?image:placeholder}] };
  bindDiscoveryLog(root);
  assert.equal(image.hidden, true);
  image.naturalWidth=800; events.load();
  assert.equal(image.hidden,false); assert.equal(placeholder.hidden,true);
  events.error();
  assert.equal(image.hidden,true); assert.equal(placeholder.hidden,false);
  image.complete=true; bindDiscoveryLog(root);
  assert.equal(image.hidden,false);
  image.naturalWidth=0; bindDiscoveryLog(root);
  assert.equal(image.hidden,true);
  assert.doesNotThrow(()=>bindDiscoveryLog({querySelectorAll:()=>[{querySelector:()=>null}]}));
  const src = photos.bear.src;
  try {
    photos.bear.src='';
    state.records=[{type:'species_discovered',id:'bear',time:null,regionId:null}];
    const html=renderDiscoveryLog();
    assert.match(html,/影像暫不可用/);
    assert.doesNotMatch(html,/<img/);
  } finally { photos.bear.src=src; }
});
