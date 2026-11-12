import { explorationHints } from './data/exploration-hints.js';
import { state } from './state.js';

// Pure selector: no cached target, random choice, progress mutation or storage.
// null / unknown region ID means overview; known current region has priority.
export function selectExplorationHint({ discovered, currentRegionId = null }) {
  const remaining = explorationHints.filter(hint=>!discovered.has(hint.speciesId));
  const hint = remaining.find(hint=>hint.regionId === currentRegionId) || remaining[0];
  return hint ? { status:'hint', hint } : { status:'complete', hint:null };
}

// Phase 2 supplies the actual active map region ID (null for Taiwan overview).
// Always read the current shared Set, including after progress reset/restoration.
export function getExplorationHint(currentRegionId = null) {
  return selectExplorationHint({ discovered:state.discovered, currentRegionId });
}
