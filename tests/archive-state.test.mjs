import test from 'node:test';
import assert from 'node:assert/strict';
import { animals } from '../scripts/data/animals.js';
import { photos } from '../scripts/data/photos.js';

const saved = new Map();
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: key => saved.get(key) ?? null,
  setItem: (key,value) => saved.set(key,value)
}});
let revision = 0;
const reload = () => import(`../scripts/state.js?test=${revision++}`);

test('progress survives module reload, deduplicates discoveries and reset keeps profile', async () => {
  saved.clear();
  const first = await reload();
  first.setResearcher('森林研究員');
  assert.equal(first.selectAnimal('salmon'),true);
  assert.equal(first.selectAnimal('salmon'),false);
  first.selectAnimal('bear');
  const second = await reload();
  assert.equal(second.state.discovered.size,2);
  assert.equal(second.state.records.length,2);
  assert.equal(second.state.records[0].regionId,'mountain-forest');
  assert.ok(second.state.records[0].time instanceof Date);
  assert.equal(second.state.researcher,'森林研究員');
  assert.equal(second.selectAnimal('salmon'),false);
  second.resetProgress();
  const third = await reload();
  assert.equal(third.state.discovered.size,0);
  assert.equal(third.state.records.length,0);
  assert.equal(third.state.researcher,'森林研究員');
});

test('invalid storage and blocked writes do not break exploration', async () => {
  saved.set('twe.exploration.v1','{broken');
  const broken = await reload();
  assert.equal(broken.state.discovered.size,0);
  assert.ok(broken.hasStorageError());
  saved.set('twe.exploration.v1',JSON.stringify({version:1,discovered:['bear','bad','bear'],records:[
    {id:'bear',time:'invalid',regionId:'__proto__'}, {id:'bear',time:null}, {id:'bad'}
  ]}));
  const sanitized = await reload();
  assert.equal(sanitized.state.records.length,1);
  assert.equal(sanitized.state.records[0].time,null);
  assert.equal(sanitized.state.records[0].regionId,null);
  const storage = globalThis.localStorage;
  Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw Error('blocked');}});
  const blocked = await reload();
  assert.equal(blocked.selectAnimal('cat'),true);
  assert.equal(blocked.state.discovered.size,1);
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:storage});
  saved.clear();
});

test('five user-photo paths preserve IDs and leave attribution unassigned', () => {
  for(const animal of animals){
    const photo = animal.photo;
    assert.equal(photo,photos[animal.id]);
    const filename = { bear: 'bear.png', monkey: 'monkey.jpeg' }[animal.id] || `${animal.id}.jpg`;
    assert.equal(photo.src,`assets/animals/photos/${filename}`);
    for(const key of ['author','source','license','licenseUrl','modifications'])assert.equal(photo[key],'');
    assert.equal(animal.diet,null);
    assert.equal(typeof animal.introduction,'string');
    assert.equal(typeof animal.trivia,'string');
  }
});

test('archive hides locked species, retains numbered order and enforces one open card', async () => {
  const {state,selectAnimal,resetProgress} = await import('../scripts/state.js');
  resetProgress();
  const details=[];
  const list={scrollTop:17,querySelector:()=>null,querySelectorAll:selector=>selector==='details'?details:[],
    set innerHTML(value){this.html=value;details.length=0;
      for(const match of value.matchAll(/<details[^>]*data-id="([^"]+)"/g)){
        const summary={addEventListener(type,callback){this[type]=callback;}};
        details.push({id:match[1],open:false,querySelector:()=>summary});
      }
    }};
  const nodes=new Map([['#archive-list',list]]);
  globalThis.document={querySelector(selector){if(!nodes.has(selector))nodes.set(selector,{style:{},setAttribute(){}});return nodes.get(selector);}};
  const {renderArchive} = await import('../scripts/encyclopedia.js');
  renderArchive();
  assert.equal((list.html.match(/未知物種/g)||[]).length,5);
  assert.equal((list.html.match(/尚未發現/g)||[]).length,5);
  assert.ok(!list.html.includes('<details'));
  assert.ok(!list.html.includes('<img'));
  for(const animal of animals){assert.ok(!list.html.includes(animal.name));assert.ok(!list.html.includes(animal.scientific));}
  selectAnimal('magpie');selectAnimal('bear');
  renderArchive();
  assert.deepEqual([...list.html.matchAll(/NO\. (\d{3})/g)].map(m=>m[1]).filter((v,i,a)=>i===0||v!==a[i-1]),['001','002','003','004','005']);
  assert.deepEqual(details.map(d=>d.id),['bear','magpie']);
  assert.ok(list.html.includes('食性')&&list.html.includes('生態小知識')&&list.html.includes('待補'));
  assert.equal(nodes.get('#progress-text').textContent,'02 / 05');
  details[0].open=true;
  details[1].querySelector().click();details[1].open=true; // Simulate native summary default toggle.
  assert.equal(details.filter(d=>d.open).length,1);
  details[1].querySelector().click();details[1].open=false;
  assert.equal(details.filter(d=>d.open).length,0);
  assert.equal(list.scrollTop,17);
  state.discovered.clear();
});


test('photo slots show placeholders on missing/error and reveal valid/cached user photos', async () => {
  const {renderAnimalPhoto,bindAnimalPhotos} = await import('../scripts/research-panel.js');
  const html=renderAnimalPhoto(animals[0]);
  assert.match(html,/bear\.png/);
  assert.match(html,/真實照片待提供/);
  assert.match(html,/<img[^>]+hidden/);
  assert.ok(!html.includes('<figcaption>'));
  const events={};
  const image={complete:false,naturalWidth:0,addEventListener:(type,fn)=>events[type]=fn};
  const placeholder={hidden:false};
  const slot={querySelector:selector=>selector==='img'?image:placeholder};
  bindAnimalPhotos({querySelectorAll:()=>[slot]});
  assert.equal(image.hidden,true);assert.equal(placeholder.hidden,false);
  image.naturalWidth=800;events.load();
  assert.equal(image.hidden,false);assert.equal(placeholder.hidden,true);
  events.error();
  assert.equal(image.hidden,true);assert.equal(placeholder.hidden,false);
  image.complete=true;image.naturalWidth=800;
  bindAnimalPhotos({querySelectorAll:()=>[slot]});assert.equal(image.hidden,false);
  image.naturalWidth=0;
  bindAnimalPhotos({querySelectorAll:()=>[slot]});assert.equal(image.hidden,true);
  const custom={...animals[0],photo:{...animals[0].photo,author:'User <Name>',license:'使用者授權',licenseUrl:'javascript:alert(1)'}};
  const credited=renderAnimalPhoto(custom);
  assert.match(credited,/User &lt;Name&gt;/);
  assert.ok(!credited.includes('href="javascript:'));
});
