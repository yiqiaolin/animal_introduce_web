import { state, subscribeExploration } from './state.js';
import { badgeDefinitions, getResearcherSummary } from './researcher-progress.js';

export function renderResearcherDashboard() {
  return `<section class="researcher-statistics" data-profile-extension="research-summary" aria-label="探索統計">
    <h3>探索統計</h3>
    <div class="researcher-statistics-layout">
      <div class="researcher-progress-ring" role="progressbar" aria-label="圖鑑完成度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
        <svg viewBox="0 0 120 120" aria-hidden="true" focusable="false">
          <circle class="researcher-ring-track" cx="60" cy="60" r="52"/>
          <circle class="researcher-ring-progress" cx="60" cy="60" r="52" pathLength="100"/>
        </svg>
        <div><strong data-profile-percent>0%</strong><span data-profile-ring-count>0 / 5</span></div>
      </div>
      <dl class="researcher-statistics-grid">
        <div><dt>已發現物種</dt><dd data-profile-species>0 / 5</dd></div>
        <div><dt>圖鑑完成度</dt><dd data-profile-completion>0%</dd></div>
        <div><dt>已探索研究區域</dt><dd data-profile-regions>0 / 3</dd></div>
        <div><dt>累積發現紀錄</dt><dd data-profile-records>0 筆</dd></div>
      </dl>
    </div>
  </section>
  <section class="researcher-complete" data-research-complete hidden aria-label="研究完成">
    <span class="eyebrow">RESEARCH COMPLETE</span>
    <h3>臺灣野生動物研究完成</h3>
    <p>恭喜完成全部物種調查與研究區域探索！</p>
    <small>圖鑑 100% · 研究區域 3 / 3</small>
  </section>
  <section class="researcher-badges" aria-label="生態探索徽章">
    <h3>生態探索徽章</h3>
    <div class="researcher-badge-grid">${badgeDefinitions.map(badge=>`
      <button type="button" class="researcher-badge" data-badge="${badge.id}" style="--badge-color:${badge.color}"
        aria-pressed="false" aria-expanded="false" aria-controls="researcher-badge-details">
        <span class="researcher-badge-symbol" aria-hidden="true">${badge.icon}</span>
        <strong>${badge.name}</strong><small data-badge-status>尚未解鎖</small>
      </button>`).join('')}
    </div>
  </section>
  <section id="researcher-badge-details" class="researcher-badge-details" hidden aria-live="polite" aria-label="徽章詳細資訊">
    <h4 data-badge-detail-name></h4><p data-badge-detail-condition></p><span data-badge-detail-status></span>
  </section>
  <section class="researcher-journal" aria-label="研究日誌寄語">
    <span class="eyebrow">FIELD JOURNAL</span>
    <h3>研究日誌寄語</h3><p data-profile-journal></p>
  </section>`;
}

export function bindResearcherDashboard(root, { signal }) {
  const find = selector => root.querySelector(selector);
  const buttons = [...root.querySelectorAll('[data-badge]')];
  let selectedBadge = null;

  function refresh() {
    const summary = getResearcherSummary(state);
    find('[data-profile-species]').textContent = `${summary.discoveredCount} / ${summary.totalSpecies}`;
    find('[data-profile-completion]').textContent = `${summary.completion}%`;
    find('[data-profile-regions]').textContent = `${summary.visitedCount} / ${summary.totalRegions}`;
    find('[data-profile-records]').textContent = `${summary.recordCount} 筆`;
    find('[data-profile-journal]').textContent = summary.journalMessage;
    find('[data-research-complete]').hidden = !summary.researchComplete;
    find('[data-profile-percent]').textContent = `${summary.completion}%`;
    find('[data-profile-ring-count]').textContent = `${summary.discoveredCount} / ${summary.totalSpecies}`;
    find('[data-profile-title]').textContent = summary.title;
    find('[data-profile-summary-title]').textContent = summary.title;
    const ring = find('.researcher-progress-ring');
    ring.setAttribute('aria-valuenow', String(summary.completion));
    ring.setAttribute('aria-valuetext', `${summary.completion}%，已發現 ${summary.discoveredCount} / ${summary.totalSpecies} 種`);
    find('.researcher-ring-progress').style.strokeDashoffset = String(100 - summary.completion);

    buttons.forEach(button => {
      const badge = summary.badges.find(badge=>badge.id===button.dataset.badge);
      const selected = selectedBadge === badge.id;
      button.classList.toggle('is-unlocked', badge.unlocked);
      button.setAttribute('aria-pressed', String(selected));
      button.setAttribute('aria-expanded', String(selected));
      button.setAttribute('aria-label', `${badge.name}，${badge.unlocked ? '已解鎖' : '尚未解鎖'}，查看條件`);
      button.querySelector('[data-badge-status]').textContent = badge.unlocked ? '已解鎖' : '尚未解鎖';
    });
    const detail = find('#researcher-badge-details');
    const badge = summary.badges.find(badge=>badge.id===selectedBadge);
    detail.hidden = !badge;
    if (badge) {
      find('[data-badge-detail-name]').textContent = badge.name;
      find('[data-badge-detail-condition]').textContent = `解鎖條件：${badge.condition}`;
      find('[data-badge-detail-status]').textContent = badge.unlocked ? '目前狀態：已解鎖' : '目前狀態：尚未解鎖';
    }
  }

  buttons.forEach(button => button.addEventListener('click', () => {
    selectedBadge = selectedBadge === button.dataset.badge ? null : button.dataset.badge;
    refresh();
  }, { signal }));
  // Only updates values: preserves name drafts, disclosure state and scroll position.
  subscribeExploration(refresh, { signal });
  refresh(); // Hydration/opening never emits milestone notifications.
}
