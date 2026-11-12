import { animals } from './data/animals.js';
import { regions } from './data/regions.js';
import { state } from './state.js';
import { renderAnimalPhoto, bindAnimalPhotos } from './research-panel.js';

function discoveryRegion(animal) {
  const record = state.records.find(record => record.type !== 'region_entered' && record.id === animal.id);
  const region = regions[record?.regionId] || Object.values(regions).find(r => r.animals.some(p => p.id === animal.id));
  return region ? region.name + '（探索示意）' : '未記錄';
}

function lockedCard(animal) {
  return `<div class="species-card locked">
    <span class="archive-number">NO. ${animal.number}</span>
    <span class="unknown">？？？</span>
    <span class="locked-note">未知物種</span>
    <span class="unlock-state">尚未發現 <b aria-hidden="true">⌑</b></span>
  </div>`;
}

function unlockedCard(animal, openId) {
  const fields = [
    ['棲息環境', animal.habitat],
    ['食性', animal.diet || '待補：尚無獨立且經確認的食性資料。'],
    ['活動習性', animal.habit + '（既有示範資料）'],
    ['保育等級', animal.conservation],
    ['物種介紹', animal.introduction || '待補：正式物種介紹尚未提供。'],
    ['生態小知識', animal.trivia || '待補：經確認的生態小知識尚未提供。']
  ];
  return `<details class="species-card" name="species-archive" data-id="${animal.id}" ${openId === animal.id ? 'open' : ''}>
    <summary>
      <span class="archive-number">NO. ${animal.number}</span>
      ${renderAnimalPhoto(animal, true)}
      <span class="card-overview"><span class="card-name">${animal.name}</span>
        <span class="card-scientific">${animal.scientific}</span>
        <span class="card-meta">${animal.category} ｜ ${discoveryRegion(animal)}</span>
      </span>
      <span class="unlock-state">已發現 <b aria-hidden="true">＋</b></span>
    </summary>
    <div class="detail-wrap"><div class="detail-content">
      <div class="detail-heading"><span>WILDLIFE RESEARCH ARCHIVE</span><span>NO. ${animal.number}</span></div>
      <div class="detail-grid">
        ${renderAnimalPhoto(animal)}
        <div>
          <span class="demo-tag">活動習性待校核 · 食性待補</span>
          <h3>${animal.name}</h3><p class="scientific">${animal.scientific}</p><hr>
          <p>物種分類 ｜ ${animal.category}</p><p>發現地區 ｜ ${discoveryRegion(animal)}</p>
          <dl class="archive-research">${fields.map(([label,value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl>
        </div>
      </div>
    </div></div>
  </details>`;
}

export function renderArchive() {
  const list = document.querySelector('#archive-list');
  const openId = list.querySelector('details[open]')?.dataset.id;
  const scrollTop = list.scrollTop;
  list.innerHTML = [...animals].sort((a,b) => Number(a.number) - Number(b.number)).map(animal => state.discovered.has(animal.id)
    ? unlockedCard(animal, openId) : lockedCard(animal)
  ).join('');
  bindAnimalPhotos(list);
  list.scrollTop = scrollTop;
  const count = state.discovered.size;
  document.querySelector('#progress-text').textContent = `${String(count).padStart(2, '0')} / ${String(animals.length).padStart(2, '0')}`;
  document.querySelector('#progress-fill').style.width = `${count / animals.length * 100}%`;
  document.querySelector('[role="progressbar"]').setAttribute('aria-valuenow', count);

  // Native name grouping handles modern browsers; this synchronous click fallback
  // also ensures exclusivity before queued toggle events run on older browsers.
  list.querySelectorAll('details').forEach(detail => {
    detail.querySelector('summary').addEventListener('click', () => {
      if (detail.open) return;
      list.querySelectorAll('details').forEach(other => { if (other !== detail) other.open = false; });
    });
  });
}
