import { getAnimal } from './data/animals.js';
import { selectAnimal, state, subscribeExploration } from './state.js';
import { initMap } from './map.js';
import { renderPanel } from './research-panel.js';
import { renderArchive } from './encyclopedia.js';
import { initDialogs } from './dialogs.js';
import { createToastNotifications } from './notifications.js';

const notifications = createToastNotifications(document.querySelector('#toast'));
subscribeExploration(event => {
  if (['progress-reset', 'project-reset'].includes(event.reason)) { notifications.clear(); return; }
  const notices = [];
  if (event.reason === 'species-discovered') {
    notices.push({kind:'discovery', title:`發現新物種！${getAnimal(event.animalId).name}`, message:'已加入研究圖鑑'});
  }
  notices.push(...event.notifications);
  notifications.enqueue(notices);
});

const refreshMarkers = initMap(id => {
  selectAnimal(id);
  const animal = getAnimal(id);
  renderPanel(animal);
  renderArchive();
  refreshMarkers();
});

renderPanel(getAnimal(state.selected) || null);
renderArchive();
refreshMarkers();
initDialogs(() => {
  renderPanel(null);
  renderArchive();
  refreshMarkers();
}, { getCurrentRegionId: () => refreshMarkers.getCurrentRegionId() });
