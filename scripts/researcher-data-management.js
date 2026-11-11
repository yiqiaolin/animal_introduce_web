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
        <div class="researcher-reset-confirm" hidden>
          <p class="notice">確定清除發現紀錄、圖鑑進度與區域造訪紀錄？研究員身分資料會保留。</p>
          <button type="button" class="secondary-button" data-profile-confirm-reset>確認重新開始</button>
          <button type="button" class="secondary-button" data-profile-cancel-reset>取消</button>
        </div>
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
  </dialog>`;
}

export function bindResearcherDataManagement(root, { signal, onReset, resetAll = resetAllResearchData }) {
  const find = selector => root.querySelector(selector);
  const options = { signal };
  find('.researcher-data-management').open = false;
  const simpleConfirm = find('.researcher-reset-confirm');
  find('[data-profile-restart]').addEventListener('click', () => { simpleConfirm.hidden = false; }, options);
  find('[data-profile-cancel-reset]').addEventListener('click', () => { simpleConfirm.hidden = true; }, options);
  find('[data-profile-confirm-reset]').addEventListener('click', () => {
    resetProgress();
    onReset();
    simpleConfirm.hidden = true;
  }, options);

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
    if (busy) return;
    busy = true;
    cancel.disabled = confirm.disabled = true;
    const result = resetAll();
    if (!result.ok) {
      error.textContent = result.message;
      busy = false;
      cancel.disabled = confirm.disabled = false;
      cancel.focus({ preventScroll:true });
    } else if (result.needsReload) error.textContent = result.message;
  }, options);
  signal.addEventListener('abort', () => {
    if (confirmation.open) confirmation.close();
  }, { once:true });
}
