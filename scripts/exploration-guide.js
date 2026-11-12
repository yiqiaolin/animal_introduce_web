import { INTRO_KEY } from './project-storage.js';
export { INTRO_KEY };
let handledInMemory = false;

// Storage is cleared by the existing full reset; only discard this module's cache.
export function resetIntroMemory() {
  handledInMemory = false;
}

export function hasHandledIntro() {
  if (handledInMemory) return true;
  try { return globalThis.localStorage?.getItem(INTRO_KEY) === '1'; }
  catch { return false; }
}

export function markIntroHandled() {
  handledInMemory = true;
  try { globalThis.localStorage?.setItem(INTRO_KEY, '1'); }
  catch { /* Keep this visit usable when browser storage is unavailable. */ }
}

const steps = [
  ['≡', '認識探索任務', '歡迎加入臺灣野生動物探索計畫！',
    '你將化身野生動物研究員，探索臺灣不同的自然環境，尋找珍貴的野生動物，並逐步建立自己的研究圖鑑。'],
  ['⌖', '探索臺灣地圖', '透過縮放與拖曳臺灣地圖，觀察島嶼的不同區域。',
    '放大地圖後，便能發現隱藏的生態研究區域入口。'],
  ['♧', '進入研究區域', '點擊地圖上的研究區域入口，進入不同的自然環境。',
    '仔細觀察環境，透過縮放尋找隱藏其中的野生動物。'],
  ['⌕', '查看動物研究資料', '發現動物後，點擊動物即可查看右側研究面板。',
    '透過研究資料認識動物的特徵與生態資訊。'],
  ['▤', '解鎖研究圖鑑', '每發現一種新動物，就能解鎖對應的研究圖鑑。',
    '你可以查看已發現物種的詳細資料，並透過發現紀錄回顧自己的探索成果。']
];

export function renderGuide() {
  return `<ol class="exploration-guide-steps">${steps.map(([icon, title, first, second], index) => `
    <li>
      <span class="exploration-guide-icon" aria-hidden="true">${icon}</span>
      <div><span class="eyebrow">STEP ${String(index + 1).padStart(2, '0')}</span>
        <h3>${title}</h3><p>${first}<br>${second}</p>
      </div>
    </li>`).join('')}
  </ol>
  <aside class="notice exploration-guide-reminder">
    <h3>研究員小提醒</h3>
    <p>放大臺灣地圖後，才能發現隱藏的研究區域入口喔！</p>
  </aside>
  <div class="exploration-guide-actions">
    <button type="button" class="secondary-button guide-primary" data-dialog-action="explore">開始探索</button>
  </div>`;
}

export function renderInvitation() {
  return `<p class="mission-description">研究員您好！臺灣的山林與溪流中，正等待著您發現珍貴的野生動物。</p>
    <div class="exploration-guide-actions">
      <button type="button" class="secondary-button guide-primary" data-dialog-action="view-guide">查看指南</button>
      <button type="button" class="secondary-button" data-dialog-action="explore">直接探索</button>
    </div>`;
}
