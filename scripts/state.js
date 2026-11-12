import { animals } from './data/animals.js';
import { regions } from './data/regions.js';
import { getResearcherSummary, titleForSpeciesCount, getNewOutcomeNotifications } from './researcher-progress.js';

import { PROGRESS_KEY, PROFILE_KEY, removeProjectStorage } from './project-storage.js';
const validIds = new Set(animals.map(animal => animal.id));
const validRegionIds = new Set(Object.keys(regions));
const explorationListeners = new Set();
let storageFailed = false;
let resetInProgress = false;

function read(key) {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    storageFailed = true;
    return null;
  }
}

const saved = read(PROGRESS_KEY);
let profile = read(PROFILE_KEY);

function todayInTaiwan() {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const value = type => parts.find(part => part.type === type).value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function newResearcherId() {
  const random = globalThis.crypto?.getRandomValues
    ? globalThis.crypto.getRandomValues(new Uint16Array(1))[0]
    : Math.floor(Math.random() * 65536);
  return 'TW-' + random.toString(16).toUpperCase().padStart(4, '0');
}

const identity = {
  id: /^TW-[A-Z0-9]{4}$/.test(profile?.id || '') ? profile.id : newResearcherId(),
  joinedDate: validDate(profile?.joinedDate) ? profile.joinedDate : todayInTaiwan()
};
const discovered = new Set();
const records = [];
const visitedRegions = new Set();
function recordTime(value) {
  const date = typeof value === 'string' ? new Date(value) : null;
  return date && Number.isFinite(date.getTime()) ? date : null;
}

function newestFirst(a, b) {
  if (!a.time) return b.time ? 1 : 0;
  if (!b.time) return -1;
  return b.time.getTime() - a.time.getTime();
}

if ([1, 2].includes(saved?.version)) {
  if (Array.isArray(saved.visitedRegions)) saved.visitedRegions.filter(id=>validRegionIds.has(id)).forEach(id=>visitedRegions.add(id));
  if (Array.isArray(saved.discovered)) saved.discovered.filter(id=>validIds.has(id)).forEach(id=>discovered.add(id));
  const recorded = new Map();
  if (Array.isArray(saved.records)) {
    saved.records.forEach(record => {
      if (!record || typeof record !== 'object') return;
      // Untyped v1 records are animal discoveries. Unknown event types are ignored.
      const type = record.type ?? (saved.version === 1 ? 'species_discovered' : null);
      const species = type === 'species_discovered';
      if (!(species ? validIds.has(record.id) : type === 'region_entered' && validRegionIds.has(record.id))) return;
      const candidate = {
        type, id: record.id, time: recordTime(record.time),
        regionId: species
          ? (validRegionIds.has(record.regionId) && regions[record.regionId].animals.some(a=>a.id===record.id) ? record.regionId : null)
          : record.id
      };
      const key = `${type}:${record.id}`;
      const previous = recorded.get(key);
      // Duplicate/corrupt saves retain the earliest known occurrence, never now().
      if (!previous || (candidate.time && (!previous.time || candidate.time < previous.time))) recorded.set(key, candidate);
      if (species) discovered.add(record.id);
      else visitedRegions.add(record.id);
    });
  }
  records.push(...[...recorded.values()].sort(newestFirst));
  // Legacy unlock/visit flags without records remain flags: no invented events.
}

export const state = {
  selected: discovered.has(saved?.selected) ? saved.selected : null,
  discovered,
  records,
  visitedRegions,
  researcher: typeof profile?.name === 'string' && profile.name.trim() ? profile.name : '未命名研究員'
};

function write(key, value) {
  if (resetInProgress) return false;
  try {
    if (!globalThis.localStorage) { storageFailed = true; return false; }
    globalThis.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    storageFailed = true; // Interactions continue in memory if storage is blocked/full.
    return false;
  }
}

export function subscribeExploration(listener, { signal } = {}) {
  if (signal?.aborted) return () => {};
  explorationListeners.add(listener);
  const unsubscribe = () => explorationListeners.delete(listener);
  signal?.addEventListener('abort', unsubscribe, { once: true });
  return unsubscribe;
}

// Explicit record edits can call persistProgress() to refresh derived UI, without
// treating an edit or restored data as a new gameplay achievement.
export function persistProgress({ reason = 'records-updated', before = null, animalId = null } = {}) {
  if (resetInProgress) return;
  write(PROGRESS_KEY, {
    version: 2,
    selected: state.selected,
    discovered: [...state.discovered],
    visitedRegions: [...state.visitedRegions],
    records: state.records.map(record => ({ ...record, time: record.time?.toISOString() ?? null }))
  });
  const summary = getResearcherSummary(state);
  const notifications = before && ['species-discovered', 'region-visited'].includes(reason)
    ? getNewOutcomeNotifications(before, summary) : [];
  const event = { type:'exploration:changed', reason, animalId, summary, notifications };
  explorationListeners.forEach(listener=>listener(event));
}

// Metadata is resolved from the existing catalogs, never duplicated in storage.
// Unknown legacy timestamps/regions remain null and sort after dated events.
export function getExplorationRecords() {
  return state.records.map(record => {
    const species = record.type === 'species_discovered' || !record.type;
    const entity = species ? animals.find(a=>a.id===record.id) : regions[record.id];
    const region = regions[record.regionId];
    return {
      ...record,
      type: species ? 'species_discovered' : 'region_entered',
      time: record.time ? new Date(record.time.getTime()) : null,
      animalId: species ? record.id : null,
      name: entity?.name ?? null,
      image: species ? entity?.illustration ?? null : entity?.image ?? null,
      regionName: region?.name ?? null,
      description: species ? null : entity?.description ?? null
    };
  }).sort(newestFirst);
}

export const researcherNameLength = value => Array.from(value).length;

export function validateResearcherName(value) {
  const name = String(value).trim();
  if (!name) return { ok: false, message: '請輸入研究員名稱，不能只有空白。' };
  if (researcherNameLength(name) > 16) return { ok: false, message: '研究員名稱最多 16 個字元。' };
  return { ok: true, name };
}

function persistResearcher() {
  return write(PROFILE_KEY, {
    ...(profile && typeof profile === 'object' && !Array.isArray(profile) ? profile : {}),
    version: 1, name: state.researcher, ...identity
  });
}

export function setResearcher(value) {
  if (resetInProgress) return { ok:false, message:'正在重置研究資料，請稍候再試。' };
  const result = validateResearcherName(value);
  if (!result.ok) return result;
  state.researcher = result.name;
  return { ...result, persisted: persistResearcher() };
}

export function getResearcherTitle(discoveredCount = getResearcherSummary(state).discoveredCount) {
  return titleForSpeciesCount(discoveredCount);
}

export function getResearcherProfile() {
  return { ...identity, name: state.researcher, title: getResearcherTitle() };
}

// Initialize/migrate only identity metadata. Never touches progress or intro keys.
if (profile?.id !== identity.id || profile?.joinedDate !== identity.joinedDate || profile?.name !== state.researcher) {
  persistResearcher();
}

export const hasStorageError = () => storageFailed;

export function selectAnimal(id) {
  if (resetInProgress || !validIds.has(id)) return false;
  const before = getResearcherSummary(state);
  const isNew = !state.discovered.has(id);
  state.selected = id;
  if (isNew) {
    state.discovered.add(id);
    const region = Object.values(regions).find(r => r.animals.some(a => a.id === id));
    state.records.unshift({ type:'species_discovered', id, time:new Date(), regionId:region?.id ?? null });
    state.records.sort(newestFirst);
  }
  persistProgress({reason:isNew ? 'species-discovered' : 'species-selected', before, animalId:id});
  return isNew;
}

export function visitRegion(id) {
  if (resetInProgress || !validRegionIds.has(id) || state.visitedRegions.has(id)) return false;
  const before = getResearcherSummary(state);
  state.visitedRegions.add(id);
  state.records.unshift({ type:'region_entered', id, regionId:id, time:new Date() });
  state.records.sort(newestFirst);
  persistProgress({reason:'region-visited', before});
  return true;
}

export function resetProgress() {
  if (resetInProgress) return;
  state.selected = null;
  state.discovered.clear();
  state.records = [];
  state.visitedRegions.clear();
  persistProgress({reason:'progress-reset'}); // The separate researcher profile key is preserved.
}


export function resetAllResearchData() {
  if (resetInProgress) return { ok:false, message:'正在重置研究資料。' };
  resetInProgress = true;
  const result = removeProjectStorage();
  if (!result.ok) { resetInProgress = false; storageFailed = true; return result; }
  state.selected = null;
  state.discovered.clear();
  state.visitedRegions.clear();
  state.records = [];
  state.researcher = '未命名研究員';
  // Reproduce a fresh boot in this same module instance. Discard the old profile
  // snapshot too, so later name saves cannot resurrect removed custom settings.
  profile = null;
  identity.id = newResearcherId();
  identity.joinedDate = todayInTaiwan();
  storageFailed = false;
  resetInProgress = false;
  const persisted = persistResearcher();
  const event = {type:'exploration:changed', reason:'project-reset', animalId:null,
    summary:getResearcherSummary(state), notifications:[]};
  explorationListeners.forEach(listener=>listener(event));
  return { ok:true, persisted };
}
