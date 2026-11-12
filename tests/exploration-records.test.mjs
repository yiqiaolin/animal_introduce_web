import test from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { animals } from '../scripts/data/animals.js';
import { regions } from '../scripts/data/regions.js';

const saved = new Map();
globalThis.localStorage = {
  getItem: key => saved.get(key) ?? null,
  setItem: (key, value) => saved.set(key, value),
  removeItem: key => saved.delete(key)
};
const key = 'twe.exploration.v1';
let revision = 0;
const reload = () => import(`../scripts/state.js?records=${revision++}`);

test('first region/species events persist once, resolve catalog metadata and cap at eight', async () => {
  saved.clear();
  const model = await reload();
  const before = Date.now();
  for (const region of Object.values(regions)) {
    assert.equal(model.visitRegion(region.id), true);
    assert.equal(model.visitRegion(region.id), false);
    for (const animal of region.animals) {
      assert.equal(model.selectAnimal(animal.id), true);
      assert.equal(model.selectAnimal(animal.id), false);
    }
  }
  assert.equal(model.state.records.length, 8);
  assert.equal(model.state.discovered.size, 5);
  const events = model.getExplorationRecords();
  assert.equal(events.filter(e => e.type === 'region_entered').length, 3);
  assert.equal(events.filter(e => e.type === 'species_discovered').length, 5);
  for (const event of events) {
    assert.ok(event.time.getTime() >= before && event.time.getTime() <= Date.now());
    assert.ok(event.name && event.regionName && event.image);
    await access(new URL(`../${event.image}`, import.meta.url));
    if (event.type === 'region_entered') assert.ok(event.description);
    else assert.equal(event.animalId, event.id);
  }
  const serialized = JSON.parse(saved.get(key));
  assert.equal(serialized.version, 2);
  assert.equal(typeof serialized.records[0].time, 'string');
  const restored = await reload();
  assert.deepEqual(restored.getExplorationRecords(), events);
  assert.equal(restored.visitRegion('mountain-forest'), false);
  assert.equal(restored.selectAnimal('bear'), false);
  assert.equal(restored.state.records.length, 8);
  events[0].time.setFullYear(1900);
  assert.notEqual(restored.getExplorationRecords()[0].time.getFullYear(), 1900);
});

test('legacy records retain unknown time/region; flags do not manufacture historical events', async () => {
  saved.clear();
  const legacy = { version:1, discovered:['bear','cat','monkey'], visitedRegions:['mountain-forest'], records:[
    {id:'bear', time:null},
    {id:'cat', time:'2026-11-01T01:00:00Z', regionId:'lowland-forest'}
  ] };
  saved.set(key, JSON.stringify(legacy));
  const model = await reload();
  assert.equal(saved.get(key), JSON.stringify(legacy)); // No progress write at startup.
  assert.equal(model.state.records.length, 2);
  assert.equal(model.visitRegion('mountain-forest'), false);
  assert.equal(model.selectAnimal('monkey'), false); // Already unlocked, missing first time.
  assert.equal(model.state.records.length, 2);
  const bear = model.getExplorationRecords().find(e=>e.id==='bear');
  assert.equal(bear.time, null);
  assert.equal(bear.regionId, null);
  assert.equal(bear.regionName, null);
  const restored = await reload();
  assert.equal(restored.state.discovered.size, 3);
  assert.equal(restored.state.records.length, 2);
  assert.equal(restored.getExplorationRecords().at(-1).id, 'bear');
});

test('mixed events sort by time, discard invalid IDs and deduplicate by type and entity', async () => {
  saved.clear();
  saved.set(key, JSON.stringify({version:2, records:[
    {type:'species_discovered',id:'bear',time:'2026-11-03T00:00:00Z'},
    {type:'region_entered',id:'mountain-forest',time:'2026-11-02T00:00:00Z'},
    {type:'species_discovered',id:'bear',time:'2026-11-01T00:00:00Z'},
    {type:'species_discovered',id:'cat',time:'invalid',regionId:'__proto__'},
    {type:'region_entered',id:'bad',time:'2026-11-04T00:00:00Z'},
    {type:'unknown',id:'bear'}, null
  ]}));
  const model = await reload();
  assert.deepEqual(model.getExplorationRecords().map(e=>e.id), ['mountain-forest','bear','cat']);
  assert.equal(model.getExplorationRecords()[1].time.toISOString(), '2026-11-01T00:00:00.000Z');
  assert.equal(model.state.visitedRegions.size, 1);
  assert.equal(model.state.discovered.size, 2);
  assert.equal(model.state.records.at(-1).regionId, null);
});

test('both reset paths clear mixed events while simple reset preserves identity', async () => {
  saved.clear();
  const model = await reload();
  model.setResearcher('觀察員');
  model.visitRegion('alpine-stream');
  model.selectAnimal('salmon');
  const identity = model.getResearcherProfile().id;
  model.resetProgress();
  assert.equal(model.state.records.length, 0);
  assert.equal(model.state.visitedRegions.size, 0);
  assert.equal(model.getResearcherProfile().id, identity);
  model.visitRegion('lowland-forest');
  model.selectAnimal('cat');
  let reloaded = false;
  assert.equal(model.resetAllResearchData({ reload:()=>{reloaded=true;} }).ok, true);
  assert.equal(reloaded, true);
  assert.equal(saved.has(key), false);
  assert.equal(model.state.records.length, 0);
  const fresh = await reload();
  assert.equal(fresh.state.records.length, 0);
  assert.equal(fresh.state.visitedRegions.size, 0);
  assert.equal(fresh.state.discovered.size, 0);
  assert.equal(fresh.state.researcher, '未命名研究員');
});
