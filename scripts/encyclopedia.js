import { animals } from './data/animals.js';
import { state } from './state.js';
import { photoPlaceholder } from './research-panel.js';

function lockedCard() {
  return `<div class="species-card locked">
    <span class="unknown">? ? ?</span>
    <span class="locked-note">尚待探索的島嶼生命</span>
    <span class="unlock-state">解鎖狀態：未解鎖 <b>⌑</b></span>
  </div>`;
}

function unlockedCard(animal, openId) {
  return `<details class="species-card" data-id="${animal.id}" ${openId === animal.id ? 'open' : ''}>
    <summary>
      <span class="card-name">${animal.name}</span>
      <span class="card-scientific">${animal.scientific}</span>
      <span class="unlock-state">已解鎖 <b>＋</b></span>
    </summary>
    <div class="detail-wrap"><div class="detail-content">
      <div class="detail-heading"><span>WILDLIFE RESEARCH ARCHIVE</span><span>NO. ${animal.number}</span></div>
      <div class="detail-grid">
        ${photoPlaceholder(animal)}
        <div>
          <span class="demo-tag">示範研究紀錄</span>
          <h3>${animal.name}</h3>
          <p class="scientific">${animal.scientific}</p><hr>
          <p>物種分類 ｜ ${animal.category}</p>
          <p>發現地區 ｜ ${animal.habitat}（示意）</p>
          <p class="research-copy">${animal.research}</p>
        </div>
      </div>
    </div></div>
  </details>`;
}

export function renderArchive() {
  const list = document.querySelector('#archive-list');
  const openId = list.querySelector('details[open]')?.dataset.id;
  list.innerHTML = animals.map(animal => state.discovered.has(animal.id)
    ? unlockedCard(animal, openId)
    : lockedCard()
  ).join('');

  const count = state.discovered.size;
  document.querySelector('#progress-text').textContent = `${String(count).padStart(2, '0')} / 05`;
  document.querySelector('#progress-fill').style.width = `${count / animals.length * 100}%`;
  document.querySelector('[role="progressbar"]').setAttribute('aria-valuenow', count);

  list.querySelectorAll('details').forEach(detail => {
    detail.addEventListener('toggle', () => {
      if (!detail.open) return;
      list.querySelectorAll('details').forEach(other => {
        if (other !== detail) other.open = false;
      });
    });
  });
}
