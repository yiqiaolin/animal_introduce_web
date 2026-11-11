import {
  getResearcherProfile, researcherNameLength, validateResearcherName,
  setResearcher, hasStorageError
} from './state.js';
import { renderResearcherDashboard, bindResearcherDashboard } from './researcher-dashboard.js';
import { renderResearcherDataManagement, bindResearcherDataManagement } from './researcher-data-management.js';

export function renderResearcherProfile() {
  return `<div class="researcher-profile">
    <section class="researcher-identity" aria-label="研究員身分證">
      <div class="researcher-avatar" aria-hidden="true">
        <svg viewBox="0 0 80 96" focusable="false"><circle cx="40" cy="27" r="17"/>
          <path d="M9 87v-9c0-21 14-31 31-31s31 10 31 31v9Z"/></svg>
      </div>
      <div class="researcher-identity-info">
        <div class="researcher-name-display">
          <strong data-profile-name></strong>
          <button type="button" class="researcher-edit" aria-label="編輯研究員名稱">✎</button>
        </div>
        <form class="researcher-name-form" hidden novalidate>
          <label for="profile-name-input">研究員名稱</label>
          <input id="profile-name-input" type="text" autocomplete="off" aria-describedby="profile-name-count profile-name-error">
          <output id="profile-name-count"></output>
          <p id="profile-name-error" role="alert"></p>
          <div class="researcher-name-actions">
            <button type="submit" class="secondary-button">儲存</button>
            <button type="button" class="secondary-button" data-profile-cancel>取消</button>
          </div>
        </form>
        <span class="researcher-save-status" role="status" aria-live="polite"></span>
        <span class="researcher-summary-title" data-profile-summary-title></span>
      </div>
      <button type="button" class="researcher-details-toggle" aria-expanded="false"
        aria-controls="researcher-details" aria-label="展開研究員詳細資料">
        <span class="researcher-details-arrow" aria-hidden="true">⌄</span>
      </button>
    </section>
    <div class="researcher-scroll" tabindex="0" role="region" aria-label="研究員檔案內容，可獨立捲動">
      <section id="researcher-details" class="researcher-details" data-expanded="false" aria-hidden="true" inert>
        <div class="researcher-details-inner">
        <dl class="researcher-identity-fields">
          <div><dt>研究員編號</dt><dd data-profile-id></dd></div>
          <div><dt>加入日期</dt><dd data-profile-joined></dd></div>
          <div><dt>研究員稱號</dt><dd data-profile-title></dd></div>
          <div><dt>所屬計畫</dt><dd>臺灣野生動物探索計畫</dd></div>
        </dl>
        </div>
      </section>
      ${renderResearcherDashboard()}
      ${renderResearcherDataManagement()}
    </div>
  </div>`;
}

export function bindResearcherProfile(root, { signal, onReset }) {
  const find = selector => root.querySelector(selector);
  const identity = getResearcherProfile();
  const name = find('[data-profile-name]');
  const nameDisplay = find('.researcher-name-display');
  const edit = find('.researcher-edit');
  const form = find('.researcher-name-form');
  const input = find('#profile-name-input');
  const count = find('#profile-name-count');
  const error = find('#profile-name-error');
  const status = find('.researcher-save-status');
  let statusTimer;
  const options = { signal };

  // All user-provided values are assigned as text/value, never interpolated HTML.
  name.textContent = identity.name;
  find('[data-profile-id]').textContent = identity.id;
  find('[data-profile-joined]').textContent = identity.joinedDate;
  find('[data-profile-title]').textContent = identity.title;
  find('[data-profile-summary-title]').textContent = identity.title;

  const details = find('#researcher-details');
  const toggle = find('.researcher-details-toggle');
  function setExpanded(expanded) {
    toggle.setAttribute('aria-expanded', String(expanded));
    toggle.setAttribute('aria-label', expanded ? '收合研究員詳細資料' : '展開研究員詳細資料');
    details.setAttribute('data-expanded', String(expanded));
    details.setAttribute('aria-hidden', String(!expanded));
    details.inert = !expanded;
  }
  setExpanded(false); // Display-only state; never persisted with researcher data.
  toggle.addEventListener('click', () => {
    setExpanded(toggle.getAttribute('aria-expanded') !== 'true');
  }, options);
  const storageNotice = () => {
    find('[data-profile-storage]').textContent = hasStorageError()
      ? '瀏覽器無法儲存資料，目前變更僅保留於本次頁面。'
      : '身分與探索資料儲存於此瀏覽器。以下兩種重置範圍不同，請確認後操作。';
  };
  storageNotice();
  find('.researcher-scroll').scrollTop = 0;
  bindResearcherDashboard(root, { signal });
  bindResearcherDataManagement(root, { signal, onReset });

  function updateCount() {
    count.textContent = `${researcherNameLength(input.value)} / 16`;
  }
  function clearStatus() {
    clearTimeout(statusTimer);
    status.textContent = '';
  }
  function finishEditing() {
    form.hidden = true;
    nameDisplay.hidden = false;
    input.value = '';
    error.textContent = '';
    input.removeAttribute('aria-invalid');
    edit.focus({ preventScroll: true });
  }

  edit.addEventListener('click', () => {
    clearStatus();
    input.value = getResearcherProfile().name;
    nameDisplay.hidden = true;
    form.hidden = false;
    error.textContent = '';
    input.removeAttribute('aria-invalid');
    updateCount();
    input.focus({ preventScroll: true });
    input.select();
  }, options);
  input.addEventListener('input', () => {
    updateCount();
    const tooLong = researcherNameLength(input.value.trim()) > 16;
    error.textContent = tooLong ? '研究員名稱最多 16 個字元。' : '';
    input.setAttribute('aria-invalid', String(tooLong));
  }, options);
  find('[data-profile-cancel]').addEventListener('click', finishEditing, options);
  form.addEventListener('submit', event => {
    event.preventDefault();
    const validation = validateResearcherName(input.value);
    if (!validation.ok) {
      error.textContent = validation.message;
      input.setAttribute('aria-invalid', 'true');
      input.focus({ preventScroll: true });
      return;
    }
    const result = setResearcher(validation.name);
    if (!result.ok) { error.textContent = result.message; return; }
    name.textContent = result.name;
    finishEditing();
    status.textContent = result.persisted ? '已儲存 ✓' : '本次頁面已更新，瀏覽器無法儲存。';
    storageNotice();
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => { status.textContent = ''; }, 2000);
  }, options);

  signal.addEventListener('abort', () => {
    clearStatus();
    input.value = ''; // Closing silently discards the unsaved draft.
  }, { once: true });
}
