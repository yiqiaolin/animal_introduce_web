import test from 'node:test';
import assert from 'node:assert/strict';
import { animals } from '../scripts/data/animals.js';
import { regions } from '../scripts/data/regions.js';
import { explorationHints } from '../scripts/data/exploration-hints.js';

const stored=new Map();
Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{
  getItem:key=>stored.get(key) ?? null, setItem:(key,value)=>stored.set(key,value)
}});
const { state, selectAnimal, resetProgress }=await import('../scripts/state.js');
const { selectExplorationHint, getExplorationHint }=await import('../scripts/exploration-hints.js');
const order=['bear','monkey','cat','magpie','salmon'];

test('five anonymous hints reference existing species/regions and required illustration locations',()=>{
  assert.deepEqual(explorationHints.map(h=>h.speciesId),order);
  assert.equal(new Set(explorationHints.map(h=>h.speciesId)).size,animals.length);
  for(const [index,hint] of explorationHints.entries()) {
    assert.ok(regions[hint.regionId].animals.some(a=>a.id===hint.speciesId));
    assert.equal(hint.regionName,regions[hint.regionId].name);
    assert.ok(hint.location.includes(['溪邊','岩石上','田邊','樹枝上','溪裡'][index]));
    const visible=[hint.title,hint.clue,hint.location,hint.regionName].join(' ');
    for(const animal of animals) assert.ok(!visible.includes(animal.name));
    assert.ok(hint.source.startsWith('https://'));
    assert.ok(Object.isFrozen(hint));
  }
});

test('all discovery subsets follow regional priority and the exact global fallback order',()=>{
  const regionIds=[null,...Object.keys(regions),'unknown','__proto__'];
  // Exhaustively check 32 progress combinations across overview and all regions.
  for(let mask=0;mask<32;mask++) {
    const discovered=new Set(order.filter((id,i)=>mask & (1<<i)));
    const remaining=order.filter(id=>!discovered.has(id));
    for(const currentRegionId of regionIds) {
      const before=[...discovered];
      const expected=remaining.find(id=>regions[currentRegionId]?.animals?.some(a=>a.id===id)) || remaining[0];
      const result=selectExplorationHint({discovered,currentRegionId});
      if(expected) {
        assert.equal(result.status,'hint');
        assert.equal(result.hint.speciesId,expected);
        assert.deepEqual(selectExplorationHint({discovered,currentRegionId}),result);
      } else assert.deepEqual(result,{status:'complete',hint:null});
      assert.deepEqual([...discovered],before);
    }
  }
});

test('region switches and new discoveries recalculate; resets read shared state without hint persistence',()=>{
  resetProgress();
  const before=[...stored];
  assert.equal(getExplorationHint().hint.speciesId,'bear');
  assert.equal(getExplorationHint('lowland-forest').hint.speciesId,'cat');
  assert.equal(getExplorationHint('alpine-stream').hint.speciesId,'salmon');
  assert.equal(getExplorationHint('mountain-forest').hint.speciesId,'bear');
  assert.deepEqual([...stored],before);
  selectAnimal('bear');
  assert.equal(getExplorationHint('mountain-forest').hint.speciesId,'monkey');
  selectAnimal('monkey');
  assert.equal(getExplorationHint('mountain-forest').hint.speciesId,'cat');
  for(const id of ['cat','magpie','salmon'])selectAnimal(id);
  const saved=[...stored],records=JSON.stringify(state.records);
  assert.deepEqual(getExplorationHint('lowland-forest'),{status:'complete',hint:null});
  assert.deepEqual([...stored],saved);
  assert.equal(JSON.stringify(state.records),records);
  assert.equal(state.visitedRegions.size,0);
  resetProgress();
  assert.equal(getExplorationHint('lowland-forest').hint.speciesId,'cat');
});
