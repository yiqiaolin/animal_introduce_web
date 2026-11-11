// Explicit ownership registry: never clear an origin's entire storage or infer
// ownership from broad prefixes. Keep this list in sync with persisted features.
export const PROFILE_KEY = 'twe.researcher.v1';
export const PROGRESS_KEY = 'twe.exploration.v1';
export const INTRO_KEY = 'wildlifeExplorer_introSeen';
export const PROJECT_STORAGE_KEYS = Object.freeze([PROFILE_KEY, PROGRESS_KEY, INTRO_KEY]);

export function removeProjectStorage(storage) {
  const previous = [];
  try {
    const target = storage ?? globalThis.localStorage;
    if (!target) throw new Error('Storage unavailable');
    // Read all owned keys before deleting anything.
    PROJECT_STORAGE_KEYS.forEach(key => previous.push([key, target.getItem(key)]));
    try {
      PROJECT_STORAGE_KEYS.forEach(key => target.removeItem(key));
    } catch (error) {
      // Best-effort rollback when a browser rejects removal midway through.
      previous.forEach(([key, value]) => {
        try {
          if (value === null) target.removeItem(key);
          else target.setItem(key, value);
        } catch { /* The caller receives a failure; do not reload or reset memory. */ }
      });
      throw error;
    }
    return { ok: true };
  } catch {
    return { ok: false, message: '無法完整清除研究資料，請檢查瀏覽器儲存權限後重試。' };
  }
}
