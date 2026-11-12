import { resetProgress, resetAllResearchData } from './state.js';

export function renderResearcherDataManagement() {
  return `<details class="researcher-data-management">
    <summary>資料管理 <span aria-hidden="true">⌄</span></summary>
    <div class="researcher-management-content">
      <p class="notice" data-profile-storage></p>
      <section class="researcher-simple-reset">
        <h4>僅重置探索進度</h4>
        <p>清除圖鑑、發現紀錄與區域造訪，保留研究員身分及首次通知設定。</p>
        <button type="button" class="secondary-button" data-profile-restart>重新開始探索</button>
      </section>
      <section class="researcher-full-reset">
        <h4>重置所有研究資料</h4>
        <p>此操作將清除目前網站的研究員身分、探索進度、圖鑑解鎖、發現紀錄及相關設定，且無法復原。</p>
        <button type="button" class="secondary-button researcher-danger" data-profile-reset-all>重置所有研究資料</button>
      </section>
    </div>
  </details>
  <dialog class="researcher-full-reset-dialog" role="alertdialog" aria-modal="true"
    aria-labelledby="full-reset-title" aria-describedby="full-reset-description">
    <span class="eyebrow">RESEARCH DATA / RESET</span>
    <h3 id="full-reset-title">確認重置所有研究資料？</h3>
    <p id="full-reset-description">研究員身分、探索進度、圖鑑解鎖、發現紀錄、區域造訪與首次通知設定都將清除。此操作無法復原。</p>
    <p data-full-reset-error role="alert"></p>
    <div class="researcher-reset-actions">
      <button type="button" class="secondary-button" data-full-reset-cancel autofocus>取消</button>
      <button type="button" class="secondary-button researcher-danger" data-full-reset-confirm>確認重置</button>
    </div>
  </dialog>
  <dialog class="researcher-restart-dialog" role="alertdialog" aria-modal="true"
    aria-labelledby="restart-exploration-title" aria-describedby="restart-exploration-description">
    <span class="eyebrow">EXPLORATION PROGRESS / RESET</span>
    <h3 id="restart-exploration-title">確認重新開始探索？</h3>
    <p id="restart-exploration-description">將清除動物發現、圖鑑解鎖、發現紀錄、區域造訪紀錄及目前選取的動物，稱號與徽章會隨探索進度重新計算。保留研究員名稱、編號、加入日期、首次任務通知設定及目前地圖視角。此操作無法復原。</p>
    <div class="researcher-reset-actions">
      <button type="button" class="secondary-button" data-profile-cancel-reset autofocus>取消</button>
      <button type="button" class="secondary-button researcher-danger" data-profile-confirm-reset>確認重新開始</button>
    </div>
  </dialog>`;
}

function bindRestartConfirmation(root, { signal, onReset }) {
  const confirmation = root.querySelector('.researcher-restart-dialog');
  const trigger = root.querySelector('[data-profile-restart]');
  const cancel = root.querySelector('[data-profile-cancel-reset]');
  const confirm = root.querySelector('[data-profile-confirm-reset]');
  const options = { signal };
  let busy = false;
  let startedOutside = false;
  const outside = event => {
    if (event.target !== confirmation) return false;
    const box = confirmation.getBoundingClientRect();
    return event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom;
  };
  const close = () => {
    if (!busy && confirmation.open) {
      busy = true; // Wait for the queued close event before accepting another open.
      confirmation.close();
    }
  };
  trigger.addEventListener('click', () => {
    if (busy || confirmation.open) return;
    startedOutside = false;
    confirmation.showModal();
    cancel.focus({ preventScroll:true });
  }, options);
  cancel.addEventListener('click', close, options);
  confirmation.addEventListener('cancel', event => {
    event.preventDefault();
    event.stopPropagation();
    close();
  }, options);
  // Match the full-reset dialog: native modal owns Tab; parent keeps its session.
  confirmation.addEventListener('keydown', event => event.stopPropagation(), options);
  confirmation.addEventListener('pointerdown', event => { startedOutside = outside(event); }, options);
  confirmation.addEventListener('click', event => {
    event.stopPropagation();
    if (startedOutside && outside(event)) close();
  }, options);
  confirmation.addEventListener('close', () => {
    busy = false;
    confirm.disabled = false;
    if (!signal.aborted) trigger.focus({ preventScroll:true });
  }, options);
  confirm.addEventListener('click', () => {
    if (busy || !confirmation.open) return;
    busy = true;
    confirm.disabled = true;
    resetProgress();
    confirmation.close();
    onReset({ kind:'progress' });
  }, options);
  signal.addEventListener('abort', () => {
    if (confirmation.open) confirmation.close();
  }, { once:true });
}

export function bindResearcherDataManagement(root, { signal, onReset, resetAll = resetAllResearchData }) {
  const find = selector => root.querySelector(selector);
  const options = { signal };
  find('.researcher-data-management').open = false;
  bindRestartConfirmation(root, { signal, onReset });

  const confirmation = find('.researcher-full-reset-dialog');
  const trigger = find('[data-profile-reset-all]');
  const cancel = find('[data-full-reset-cancel]');
  const confirm = find('[data-full-reset-confirm]');
  const error = find('[data-full-reset-error]');
  let busy = false;
  let startedOutside = false;
  function closeConfirmation() {
    if (!busy && confirmation.open) confirmation.close();
  }
  function outside(event) {
    if (event.target !== confirmation) return false;
    const box = confirmation.getBoundingClientRect();
    return event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom;
  }
  trigger.addEventListener('click', () => {
    if (busy || confirmation.open) return;
    error.textContent = '';
    confirmation.showModal();
    cancel.focus({ preventScroll:true });
  }, options);
  cancel.addEventListener('click', closeConfirmation, options);
  confirmation.addEventListener('cancel', event => {
    event.preventDefault();
    event.stopPropagation();
    closeConfirmation();
  }, options);
  // The nested modal owns its focus; do not invoke the parent dialog's Tab loop.
  confirmation.addEventListener('keydown', event => event.stopPropagation(), options);
  confirmation.addEventListener('pointerdown', event => { startedOutside = outside(event); }, options);
  confirmation.addEventListener('click', event => {
    event.stopPropagation();
    if (startedOutside && outside(event)) closeConfirmation();
  }, options);
  confirmation.addEventListener('close', () => {
    if (!signal.aborted && !busy) trigger.focus({ preventScroll:true });
  }, options);
  confirm.addEventListener('click', () => {
    if (busy || !confirmation.open) return;
    busy = true;
    cancel.disabled = confirm.disabled = true;
    const result = resetAll();
    if (!result.ok) {
      error.textContent = result.message;
      busy = false;
      cancel.disabled = confirm.disabled = false;
      cancel.focus({ preventScroll:true });
    } else {
      confirmation.close();
      onReset({ kind:'all' });
    }
  }, options);
  signal.addEventListener('abort', () => {
    if (confirmation.open) confirmation.close();
  }, { once:true });
}
