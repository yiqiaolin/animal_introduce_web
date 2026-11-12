import { getExplorationHintView } from './exploration-hint-card.js';
import { renderDiscoveryLog, bindDiscoveryLog } from './discovery-log.js';
import { renderResearcherProfile, bindResearcherProfile } from './researcher-profile.js';
import { hasHandledIntro, markIntroHandled, renderGuide, renderInvitation } from './exploration-guide.js';

const titles = {
  intro: ['RESEARCH MISSION / 001', '歡迎加入探索計畫'],
  guide: ['EXPLORATION GUIDE', '探索指南'],
  hints: ['ECOLOGICAL RESEARCH HINT', '探索提示'],
  records: ['DISCOVERY LOG', '發現紀錄'],
  profile: ['RESEARCHER PROFILE', '研究員檔案']
};

function dialogBody(type) {
  if (type === 'guide') return renderGuide();
  if (type === 'intro') return renderInvitation();

  if (type === 'records') return renderDiscoveryLog();

  return renderResearcherProfile();
}

export function initDialogs(onReset, { getCurrentRegionId = () => null } = {}) {
  const dialog = document.querySelector('#utility-dialog');
  const content = document.querySelector('#dialog-content');
  const guideTrigger = document.querySelector('[data-dialog="guide"]');
  let currentType = null;
  let session = null;
  let returnFocus = null;
  let nextGuide = false;
  let previousOverflow = '';
  let previousGutter = '';
  let closingAnimation = null;
  let closing = false;
  let pendingReset = null;

  function dismiss(openGuide = false) {
    if (!dialog.open || closing) return;
    nextGuide = openGuide;
    if (currentType === 'intro') markIntroHandled();
    const reduceMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (currentType === 'profile' && !reduceMotion && typeof dialog.animate === 'function') {
      closing = true;
      const activeSession = session;
      closingAnimation = dialog.animate([
        { opacity: 1, transform: 'scale(1)' },
        { opacity: 0, transform: 'scale(.96)' }
      ], { duration: 200, easing: 'ease-in', fill: 'forwards' });
      closingAnimation.finished.catch(() => {}).then(() => {
        if (session !== activeSession || !dialog.open) return;
        closingAnimation.cancel();
        dialog.close();
      });
    } else dialog.close();
  }

  function finishClose() {
    const wasInvitation = currentType === 'intro';
    const shouldOpenGuide = nextGuide;
    const trigger = returnFocus;
    const reset = pendingReset;
    pendingReset = null;
    closingAnimation?.cancel();
    closingAnimation = null;
    closing = false;
    session?.abort();
    session = null;
    currentType = null;
    nextGuide = false;
    if (wasInvitation && !hasHandledIntro()) markIntroHandled();
    document.documentElement.style.overflow = previousOverflow;
    document.documentElement.style.scrollbarGutter = previousGutter;
    delete dialog.dataset.mode;
    content.inert = false;
    if (reset) {
      content.innerHTML = ''; // Discard closed profile/name drafts and nested modals.
      if (trigger?.isConnected) trigger.focus({ preventScroll:true });
      onReset(reset); // Only after the close event and session cleanup.
    } else if (shouldOpenGuide) open('guide', guideTrigger);
    else if (trigger?.isConnected) trigger.focus({ preventScroll: true });
  }

  function outside(event) {
    if (event.target !== dialog) return false;
    const bounds = dialog.getBoundingClientRect();
    return event.clientX < bounds.left || event.clientX > bounds.right
      || event.clientY < bounds.top || event.clientY > bounds.bottom;
  }

  function open(type, trigger = guideTrigger) {
    if (session || dialog.open) return; // Includes the queued close/animation interval.
    const hintView = type === 'hints' ? getExplorationHintView(getCurrentRegionId()) : null;
    const [english, title] = hintView ? [hintView.english, hintView.title] : titles[type];
    const headingClass = hintView?.headingClass ? ` class="${hintView.headingClass}"` : '';
    content.innerHTML = `<span class="eyebrow${headingClass ? ' ecological-hint-achievement-label' : ''}">${english}</span><h2 id="utility-dialog-title" tabindex="-1"${headingClass}>${title}</h2>${hintView ? hintView.body : dialogBody(type)}`;
    currentType = type;
    returnFocus = trigger;
    nextGuide = false;
    dialog.dataset.mode = type;
    session = new AbortController();
    const options = { signal: session.signal };
    if (type === 'records') bindDiscoveryLog(content);
    if (type === 'profile') bindResearcherProfile(content, { signal: session.signal, onReset:reset => {
      pendingReset = reset;
      content.inert = true; // No late edits while the existing close animation runs.
      dismiss();
    } });
    let startedOutside = false;
    dialog.addEventListener('pointerdown', event => { startedOutside = outside(event); }, options);
    dialog.addEventListener('click', event => {
      const action = event.target.closest('[data-dialog-action]')?.dataset.dialogAction;
      if (action === 'view-guide') dismiss(true);
      else if (action === 'explore' || event.target.closest('.close-dialog')) dismiss();
      else if (startedOutside && outside(event)) dismiss();
    }, options);
    dialog.addEventListener('cancel', event => {
      event.preventDefault();
      dismiss();
    }, options);
    dialog.addEventListener('close', finishClose, options);
    dialog.addEventListener('keydown', event => {
      if (event.key !== 'Tab') return;
      const focusable = [...dialog.querySelectorAll('button, a[href], input, select, textarea, summary, [tabindex="0"]')]
        .filter(element => !element.disabled && element.getClientRects().length);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && (document.activeElement === first || !focusable.includes(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !focusable.includes(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    }, options);
    previousOverflow = document.documentElement.style.overflow;
    previousGutter = document.documentElement.style.scrollbarGutter;
    document.documentElement.style.scrollbarGutter = 'stable';
    document.documentElement.style.overflow = 'hidden';
    dialog.showModal(); // Native modal makes the background inert.
    dialog.scrollTop = 0;
    content.querySelector('h2').focus({ preventScroll: true });
  }

  document.querySelectorAll('[data-dialog]').forEach(button => {
    button.onclick = () => open(button.dataset.dialog, button);
  });
  function showInvitationIfNeeded() {
    if (!hasHandledIntro()) open('intro', guideTrigger);
  }
  showInvitationIfNeeded();
  return { showInvitationIfNeeded };
}
