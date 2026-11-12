import { state, getExplorationRecords } from './state.js';
import { getResearcherSummary } from './researcher-progress.js';
import { photos } from './data/photos.js';
import { bindAnimalPhotos } from './research-panel.js';

const escapeText = value => String(value ?? '').replace(/[&<>"']/g,
  char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);

function timestamp(time) {
  if (!(time instanceof Date) || !Number.isFinite(time.getTime())) return '<span class="discovery-log-time">時間未記錄</span>';
  const label = new Intl.DateTimeFormat('zh-TW', {
    timeZone:'Asia/Taipei', year:'numeric', month:'2-digit', day:'2-digit',
    hour:'2-digit', minute:'2-digit', hourCycle:'h23'
  }).format(time);
  return `<time class="discovery-log-time" datetime="${time.toISOString()}">${escapeText(label)}</time>`;
}

function eventCard(record) {
  const species = record.type === 'species_discovered';
  const src = species ? photos[record.animalId]?.src : record.image;
  const name = record.name || (species ? '物種名稱未記錄' : '地區名稱未記錄');
  const icon = species ? '◈' : '⌖';
  return `<li class="discovery-log-event discovery-log-event--${species ? 'species' : 'region'}">
    <span class="discovery-log-node" aria-hidden="true">${icon}</span>
    <article class="discovery-log-card">
      <div class="discovery-log-image" data-photo-slot>
        <div class="discovery-log-placeholder" data-photo-placeholder>
          <span aria-hidden="true">${icon}</span><span>影像暫不可用</span>
        </div>
        ${src ? `<img src="${escapeText(src)}" alt="${escapeText(name)}${species ? '照片' : '地圖插畫'}" hidden>` : ''}
      </div>
      <div class="discovery-log-info">
        <span class="discovery-log-tag">${species ? 'SPECIES DISCOVERED' : 'REGION DISCOVERED'}</span>
        <h3>${escapeText(name)}</h3>
        ${timestamp(record.time)}
        <p>${escapeText(species ? record.regionName || '所屬研究區域未記錄' : record.description || '地區描述未記錄')}</p>
      </div>
    </article>
  </li>`;
}

export function renderDiscoveryLog() {
  const records = getExplorationRecords(); // Preserve the canonical ordering and history.
  // Share the existing identity-based completion rule, including legacy flags
  // without dated records. This is presentation only: no event or storage write.
  const complete = getResearcherSummary(state).researchComplete
    ? `<section class="discovery-log-complete" aria-labelledby="discovery-log-complete-title">
      <svg class="discovery-log-medal" viewBox="0 0 40 48" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" focusable="false">
        <path d="m10 26-3 17 13-6 13 6-3-17"/>
        <circle cx="20" cy="17" r="14"/>
        <path d="m13 17 5 5 9-10"/>
      </svg>
      <div><span class="discovery-log-tag">EXPLORATION COMPLETE</span>
        <h3 id="discovery-log-complete-title">探索階段完成</h3>
        <p>已踏查所有研究區域，並發現全部 5 種野生動物。</p>
      </div>
    </section>` : '';
  if (!records.length) return complete + `<section class="discovery-log-empty" aria-labelledby="discovery-log-empty-title">
    <span class="discovery-log-empty-symbol" aria-hidden="true">⌖</span>
    <span class="discovery-log-tag">AWAITING FIRST DISCOVERY</span>
    <h3 id="discovery-log-empty-title">尚無探索紀錄</h3>
    <p>前往探索地圖，踏入新的研究區域或發現野生動物，這裡就會留下你的探索足跡。</p>
  </section>`;
  return complete + `<ol class="discovery-log-timeline" aria-label="探索時間軸，最新紀錄在前">${records.map(eventCard).join('')}</ol>`;
}

// Existing cached-load/error handling keeps broken images hidden, without layout changes.
export function bindDiscoveryLog(root) {
  bindAnimalPhotos(root);
}
