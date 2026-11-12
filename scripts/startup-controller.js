import { STARTUP_KEY } from './project-storage.js';

export const STARTUP_STAGES = Object.freeze([
  Object.freeze({ id:'initialization', label:'研究系統初始化', durationMs:3000 }),
  Object.freeze({ id:'identification', label:'研究員身分識別', durationMs:4000 }),
  Object.freeze({ id:'assignment', label:'野生動物研究任務指派', durationMs:5000 })
]);
export const STARTUP_DURATION_MS = STARTUP_STAGES.reduce((total, stage) => total + stage.durationMs, 0);
export const STARTUP_FADE_OUT_MS = 280;

// View contract: canOpen(), open({profile,onSkip,onComplete}), showStage(), close().
// No exploration/profile writes. A generation token also rejects stale callbacks
// even when a view or timer has already queued work before cancellation.
export function createStartupController({
  view, onFinish = () => {}, returningUser = () => false, getProfile = () => null,
  storage, durationMs = STARTUP_DURATION_MS,
  schedule = (callback, delay) => globalThis.setTimeout(callback, delay),
  unschedule = timer => globalThis.clearTimeout(timer)
}) {
  let status = 'idle';
  let generation = 0;
  let timer = null;
  let handledInMemory = false;
  const targetStorage = () => storage ?? globalThis.localStorage;
  const hasSeen = () => {
    if (handledInMemory) return true;
    try { return targetStorage()?.getItem(STARTUP_KEY) === '1'; }
    catch { return false; }
  };
  const markSeen = () => {
    handledInMemory = true;
    try { targetStorage()?.setItem(STARTUP_KEY, '1'); }
    catch { /* This visit still completes when storage is blocked/full. */ }
  };
  const clearTimer = () => {
    if (timer !== null) unschedule(timer);
    timer = null;
  };

  function begin(force, callback = onFinish) {
    if (status === 'running' || status === 'disposed' || (!force && status !== 'idle')) return false;
    if (!force && (hasSeen() || returningUser())) {
      markSeen(); // Migrate existing visitors without replaying a new opening.
      status = 'finished';
      callback({ reason:'already-seen', played:false });
      return true;
    }
    // Future replay callers must close any existing utility/confirmation modal first.
    if (!view.canOpen()) return false;
    status = 'running';
    const token = ++generation;
    const current = () => status === 'running' && token === generation;
    function finish(reason) {
      if (!current()) return false;
      status = 'finished';
      generation++;
      clearTimer();
      markSeen();
      view.close(); // Remove the opening before handing off to the invitation.
      callback({ reason, played:true });
      return true;
    }
    activeFinish = finish;
    let index = 0;
    const advance = () => {
      if (!current()) return;
      if (index === STARTUP_STAGES.length) { finish('completed'); return; }
      const stage = STARTUP_STAGES[index];
      // Preserve the optional total-duration override, using the same 3:4:5 ratio.
      // The view receives the exact duration used by this single timer chain.
      const stageDuration = stage.durationMs * durationMs / STARTUP_DURATION_MS;
      view.showStage({ ...stage, durationMs:stageDuration }, index);
      index++;
      if (current()) timer = schedule(advance, stageDuration);
    };
    view.open({ profile:getProfile(), onSkip:()=>finish('skipped'), onComplete:()=>finish('completed') });
    advance();
    return true;
  }
  let activeFinish = () => false;
  function cancel() {
    if (status !== 'running') return false;
    status = 'idle';
    generation++;
    clearTimer();
    view.close();
    return true; // Cancellation neither marks seen nor starts the invitation.
  }
  return {
    start:() => begin(false),
    replay:({ onFinish:callback = onFinish } = {}) => begin(true, callback),
    skip:() => activeFinish('skipped'),
    complete:() => activeFinish('completed'),
    cancel,
    dispose() { cancel(); status = 'disposed'; },
    getStatus:() => status
  };
}
