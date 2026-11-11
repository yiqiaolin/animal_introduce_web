// Session-only state. Persistence can be added here in a later phase.
export const state = {
  selected: null,
  discovered: new Set(),
  records: [],
  researcher: '實習研究員'
};

export function selectAnimal(id) {
  const isNew = !state.discovered.has(id);
  state.selected = id;
  if (isNew) {
    state.discovered.add(id);
    state.records.unshift({ id, time: new Date() });
  }
  return isNew;
}

export function resetProgress() {
  state.selected = null;
  state.discovered.clear();
  state.records = [];
}
