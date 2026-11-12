import { getExplorationHint } from './exploration-hints.js';

const escapeText = value => String(value ?? '').replace(/[&<>"']/g,
  char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);

function renderHintResult(result) {
  if (result.status === 'complete') return `<section class="ecological-hint-achievement" aria-labelledby="utility-dialog-title">
    <svg class="ecological-hint-medal" viewBox="0 0 48 56" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" focusable="false">
      <path d="m13 31-4 19 15-7 15 7-4-19"/>
      <circle cx="24" cy="20" r="16"/>
      <path d="m16 20 6 6 11-12"/>
    </svg>
    <p class="ecological-hint-congratulations">恭喜！你已發現全部五種臺灣野生動物。從山地森林到高山溪流，每一次觀察都是認識臺灣生態的重要一步。</p>
    <p class="ecological-hint-suggestion">前往物種研究圖鑑，回顧牠們的生態特徵、棲地與保育現況。</p>
    <p class="ecological-hint-achievement-footer">ALL FIVE SPECIES DISCOVERED</p>
  </section>`;
  const { title, clue, location, regionName } = result.hint;
  // Explicit display fields: never render internal IDs, sources or animal names.
  return `<section class="ecological-hint-card" aria-labelledby="ecological-hint-title">
    <h3 id="ecological-hint-title">${escapeText(title)}</h3>
    <p class="ecological-hint-clue">${escapeText(clue)}</p>
    <dl class="ecological-hint-details">
      <div><dt>尋找位置</dt><dd class="ecological-hint-location">${escapeText(location)}</dd></div>
      <div><dt>研究地區</dt><dd>${escapeText(regionName)}</dd></div>
    </dl>
  </section>`;
}

// One selection per opening keeps the shared modal heading and card consistent.
// Completion still comes solely from the Phase 1 selector; nothing is persisted.
export function getExplorationHintView(currentRegionId = null) {
  const result = getExplorationHint(currentRegionId);
  const complete = result.status === 'complete';
  return {
    english:complete ? 'RESEARCH ACHIEVEMENT' : 'ECOLOGICAL RESEARCH HINT',
    title:complete ? '野外研究任務完成' : '探索提示',
    headingClass:complete ? 'ecological-hint-achievement-heading' : '',
    body:renderHintResult(result)
  };
}

export function renderExplorationHint(currentRegionId = null) {
  return getExplorationHintView(currentRegionId).body;
}
