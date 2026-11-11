import { getAnimal } from './data/animals.js';
import { selectAnimal } from './state.js';
import { initMap } from './map.js';
import { renderPanel } from './research-panel.js';
import { renderArchive } from './encyclopedia.js';
import { initDialogs } from './dialogs.js';

let toastTimer;

function notifyDiscovery(animal) {
  const toast = document.querySelector('#toast');
  toast.textContent = `新物種已記錄 · ${animal.name}`;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 2800);
}

const refreshMarkers = initMap(id => {
  const isNew = selectAnimal(id);
  const animal = getAnimal(id);
  renderPanel(animal);
  renderArchive();
  refreshMarkers();
  if (isNew) notifyDiscovery(animal);
});

renderPanel(null);
renderArchive();
initDialogs(() => {
  renderPanel(null);
  renderArchive();
  refreshMarkers();
});
