import { createStartupController, STARTUP_FADE_OUT_MS } from './startup-controller.js';
import { getResearcherProfile } from './state.js';
import { hasHandledIntro } from './exploration-guide.js';

// CSS only animates the stage selected by the existing controller. No animation
// event or view timer may finish/restart the flow independently.
export function createStartupView() {
  const dialog = document.querySelector('#research-startup-dialog');
  const stage = dialog.querySelector('[data-startup-stage]');
  const skip = dialog.querySelector('[data-startup-skip]');
  const name = dialog.querySelector('[data-startup-name]');
  const panels = [...dialog.querySelectorAll('[data-startup-panel]')];
  let session = null;
  let returnFocus = null;
  let previousOverflow = '';
  let previousGutter = '';
  return {
    canOpen:() => !document.querySelector('dialog[open]'),
    open({ onSkip, profile }) {
      returnFocus = document.activeElement;
      previousOverflow = document.documentElement.style.overflow;
      previousGutter = document.documentElement.style.scrollbarGutter;
      session = new AbortController();
      const options = { signal:session.signal };
      stage.textContent = '';
      delete dialog.dataset.startupPhase;
      panels.forEach(panel => {
        panel.dataset.active = 'false';
        panel.setAttribute('aria-hidden', 'true');
        panel.inert = true;
      });
      name.textContent = typeof profile?.name === 'string' && profile.name.trim()
        ? profile.name.trim() : '未命名研究員';
      skip.addEventListener('click', onSkip, options);
      dialog.addEventListener('cancel', event => { event.preventDefault(); onSkip(); }, options);
      dialog.addEventListener('close', () => { if (!dialog.open) onSkip(); }, options);
      document.documentElement.style.overflow = 'hidden';
      document.documentElement.style.scrollbarGutter = 'stable';
      dialog.showModal();
      skip.focus({ preventScroll:true });
    },
    showStage(value) {
      dialog.style.setProperty('--startup-stage-duration', `${value.durationMs}ms`);
      dialog.style.setProperty('--startup-fade-duration', `${STARTUP_FADE_OUT_MS}ms`);
      dialog.dataset.startupPhase = value.id;
      panels.forEach(panel => {
        const active = panel.dataset.startupPanel === value.id;
        panel.dataset.active = String(active);
        panel.setAttribute('aria-hidden', String(!active));
        panel.inert = !active;
      });
      stage.textContent = value.label;
    },
    close() {
      session?.abort();
      session = null;
      dialog.getAnimations?.({ subtree:true }).forEach(animation => animation.cancel());
      if (dialog.open) dialog.close();
      delete dialog.dataset.startupPhase;
      dialog.style.removeProperty('--startup-stage-duration');
      dialog.style.removeProperty('--startup-fade-duration');
      panels.forEach(panel => {
        panel.dataset.active = 'false';
        panel.setAttribute('aria-hidden', 'true');
        panel.inert = true;
      });
      name.textContent = '';
      stage.textContent = '';
      document.documentElement.style.overflow = previousOverflow;
      document.documentElement.style.scrollbarGutter = previousGutter;
      if (returnFocus?.isConnected) returnFocus.focus({ preventScroll:true });
    }
  };
}

export function initResearchStartup({ onReady, view = createStartupView(), ...options }) {
  let ready = false;
  return createStartupController({
    view, returningUser:hasHandledIntro, getProfile:getResearcherProfile, ...options,
    onFinish() {
      if (ready) return;
      ready = true;
      onReady(); // Register dialogs/show the original invitation exactly once.
    }
  });
}
