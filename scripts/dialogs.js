import { animals, getAnimal } from './data/animals.js';
import { state, resetProgress } from './state.js';

const titles = {
  guide: ['EXPLORATION GUIDE', '探索指南'],
  hints: ['FIELD NOTES', '探索提示'],
  records: ['DISCOVERY LOG', '發現紀錄'],
  profile: ['RESEARCHER PROFILE', '研究員檔案']
};

function dialogBody(type) {
  if (type === 'guide') return `
    <ol class="guide-steps">
      <li><b>觀察島嶼</b><p>使用滾輪或 ＋／− 按鈕縮放，拖曳移動地圖，⌖ 重設視角。</p></li>
      <li><b>尋找生命</b><p>放大至 145% 以上即可看見示範動物標記。點選標記開啟研究資訊。</p></li>
      <li><b>累積研究</b><p>首次點選將解鎖圖鑑；再次點選不重複計數。下方長條按鈕可前往圖鑑。</p></li>
    </ol>
    <p class="notice">本階段為操作雛形；研究計畫開場與完整發現動畫將於後續階段加入。</p>`;

  if (type === 'hints') return animals.map(animal => `
    <div class="hint-row"><span>${animal.category}</span><p>${animal.habitat}</p></div>
  `).join('') + '<p class="notice">線索及座標為示範用途，不代表可供野外追蹤的真實位置。</p>';

  if (type === 'records') return state.records.length
    ? state.records.map(record => `
      <div class="hint-row">
        <span>${record.time.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}</span>
        <p>首次發現 · ${getAnimal(record.id).name}</p>
      </div>`).join('')
    : '<div class="dialog-empty">尚無發現紀錄。<p>回到地圖，展開你的第一場探索。</p></div>';

  return `
    <label class="profile-label">研究員稱呼<input id="researcher-name" maxlength="24"></label>
    <p>探索進度 <strong>${state.discovered.size} / ${animals.length}</strong></p>
    <p class="notice">設定與進度僅保留於本次頁面，重新整理後清除。持久化儲存將於後續階段加入。</p>
    <button id="restart" class="secondary-button">重新開始探索</button>
    <div id="reset-confirm"></div>`;
}

export function initDialogs(onReset) {
  const dialog = document.querySelector('#utility-dialog');
  const content = document.querySelector('#dialog-content');

  function bindProfile() {
    const input = content.querySelector('input');
    // Assign through value so user-entered names are never interpreted as HTML.
    input.value = state.researcher;
    input.oninput = () => { state.researcher = input.value; };
    content.querySelector('#restart').onclick = () => {
      const confirmation = content.querySelector('#reset-confirm');
      confirmation.innerHTML = `
        <p class="notice">確定清除本次發現紀錄與圖鑑進度？研究員稱呼會保留。</p>
        <button id="confirm-reset" class="secondary-button">確認重新開始</button>
        <button id="cancel-reset" class="secondary-button">取消</button>`;
      content.querySelector('#cancel-reset').onclick = () => confirmation.replaceChildren();
      content.querySelector('#confirm-reset').onclick = () => {
        resetProgress();
        onReset();
        open('profile');
      };
    };
  }

  function open(type) {
    const [english, title] = titles[type];
    content.innerHTML = `<span class="eyebrow">${english}</span><h2>${title}</h2>${dialogBody(type)}`;
    if (type === 'profile') bindProfile();
    if (!dialog.open) dialog.showModal();
  }

  document.querySelectorAll('[data-dialog]').forEach(button => {
    button.onclick = () => open(button.dataset.dialog);
  });
  dialog.querySelector('.close-dialog').onclick = () => dialog.close();
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    const outside = event.clientX < bounds.left || event.clientX > bounds.right
      || event.clientY < bounds.top || event.clientY > bounds.bottom;
    if (outside) dialog.close();
  });
}
