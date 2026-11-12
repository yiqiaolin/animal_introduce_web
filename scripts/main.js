import { getAnimal } from './data/animals.js';
import { selectAnimal, state, subscribeExploration } from './state.js';
import { initMap } from './map.js';
import { renderPanel } from './research-panel.js';
import { renderArchive } from './encyclopedia.js';
import { initDialogs } from './dialogs.js';
import { createToastNotifications } from './notifications.js';
import { initResearchStartup } from './research-startup.js';
import { resetIntroMemory } from './exploration-guide.js';

const notifications = createToastNotifications(document.querySelector('#toast'));
subscribeExploration(event => {
  if (['progress-reset', 'project-reset'].includes(event.reason)) {
    notifications.clear();
    if (event.reason === 'project-reset') {
      resetIntroMemory();
      refreshMarkers.resetView();
    } else refreshMarkers.cancelPendingSwitch();
    return;
  }
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
let dialogs;
function refreshAfterReset({ kind }) {
  renderPanel(null);
  renderArchive();
  if (kind === 'all') document.querySelector('#archive-list').scrollTop = 0;
  refreshMarkers();
  // dialogs invokes this only after all confirmation/profile sessions are closed.
  researchStartup.replay({ onFinish:() => dialogs.showInvitationIfNeeded() });
}
export const researchStartup = initResearchStartup({
  onReady: () => { dialogs = initDialogs(refreshAfterReset, {
    getCurrentRegionId: () => refreshMarkers.getCurrentRegionId()
  }); }
});
researchStartup.start();
