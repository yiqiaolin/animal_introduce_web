import { animals } from './data/animals.js';
import { regions } from './data/regions.js';

const svg = paths => `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" focusable="false">${paths}</svg>`;
export const badgeDefinitions = [
  { id:'first-discovery', name:'初次發現', condition:'首次發現任意一種動物。', color:'#d7c28e',
    icon:svg('<path d="M13 29c0-8 14-8 14 0 0 5-5 2-7 2s-7 3-7-2Z"/><ellipse cx="10" cy="19" rx="3" ry="4"/><ellipse cx="17" cy="12" rx="3" ry="4"/><ellipse cx="25" cy="12" rx="3" ry="4"/><ellipse cx="31" cy="19" rx="3" ry="4"/>'),
    unlocked:data=>animals.some(animal=>data.discovered.has(animal.id)) },
  { id:'forest-observer', name:'森林觀察員', condition:'發現臺灣黑熊與臺灣獼猴。', color:'#a5c6a3',
    icon:svg('<path d="m15 7-8 12h5l-7 10h20l-7-10h5Z M15 29v6 M28 11l-5 9h3l-4 8h12l-4-8h3Z M28 28v7"/>'),
    unlocked:data=>['bear','monkey'].every(id=>data.discovered.has(id)) },
  { id:'lowland-investigator', name:'低海拔調查員', condition:'發現石虎與臺灣藍鵲。', color:'#c2ce93',
    icon:svg('<path d="M10 31C8 13 21 8 32 8c0 15-5 25-20 22 M10 33l17-18 M18 24v-7 M18 24h7"/>'),
    unlocked:data=>['cat','magpie'].every(id=>data.discovered.has(id)) },
  { id:'stream-guardian', name:'溪流守護者', condition:'發現櫻花鉤吻鮭。', color:'#91c7ce',
    icon:svg('<path d="M6 17c7-8 16-8 22 0l6-5v10l-6-5c-6 8-15 8-22 0Z M7 29q4-5 8 0t8 0t10 0"/><circle cx="13" cy="17" r="1"/>'),
    unlocked:data=>data.discovered.has('salmon') },
  { id:'island-explorer', name:'島嶼探索者', condition:'曾進入全部三個研究區域。', color:'#cbbd91',
    icon:svg('<path d="m25 5 5 4-3 9-5 7-6 10-5-5 1-9 6-8Z M6 35h28"/><circle cx="22" cy="17" r="2"/>'),
    unlocked:data=>Object.keys(regions).every(id=>data.visitedRegions.has(id)) },
  { id:'archive-collector', name:'圖鑑收藏家', condition:'發現全部五種動物。', color:'#bdb2ce',
    icon:svg('<path d="M20 11C15 7 9 8 5 10v23c5-2 10-2 15 1 5-3 10-3 15-1V10c-4-2-10-3-15 1Z M20 11v23 M11 15l4 3 M25 18l4-3 M10 24h5 M25 24h5"/>'),
    unlocked:data=>animals.every(animal=>data.discovered.has(animal.id)) }
];

export function titleForSpeciesCount(count) {
  if (count >= 5) return '生態探索專家';
  if (count >= 4) return '資深研究員';
  if (count >= 2) return '野外觀察員';
  return '見習研究員';
}

export function journalMessageForSpeciesCount(count) {
  if (count >= 5) return '恭喜完成臺灣野生動物圖鑑！每一份發現都值得珍藏。';
  if (count >= 3) return '你的研究圖鑑逐漸完整，繼續尋找島嶼上的珍貴生命！';
  if (count >= 1) return '你已經踏出探索的第一步，還有更多生命等待認識。';
  return '每一段研究旅程，都從第一個發現開始。';
}

export function getResearcherSummary(data) {
  const discoveredCount = animals.filter(animal=>data.discovered.has(animal.id)).length;
  const visitedCount = Object.keys(regions).filter(id=>data.visitedRegions.has(id)).length;
  return {
    discoveredCount, totalSpecies:animals.length,
    completion:Math.round(discoveredCount / animals.length * 100),
    visitedCount, totalRegions:Object.keys(regions).length,
    recordCount:data.records.length,
    title:titleForSpeciesCount(discoveredCount),
    journalMessage:journalMessageForSpeciesCount(discoveredCount),
    researchComplete:discoveredCount === animals.length && visitedCount === Object.keys(regions).length,
    badges:badgeDefinitions.map(badge=>({...badge, unlocked:badge.unlocked(data)}))
  };
}

// Compare actual outcomes, never a persisted title or badge-unlock list.
export function getNewOutcomeNotifications(before, after) {
  const notifications = after.badges.filter(badge=>badge.unlocked && !before.badges.find(old=>old.id===badge.id)?.unlocked)
    .map(badge=>({ kind:'badge', icon:badge.icon, title:`成就解鎖 · ${badge.name}`, message:badge.condition }));
  if (after.discoveredCount > before.discoveredCount && after.title !== before.title) {
    notifications.push({kind:'promotion',icon:badgeDefinitions[5].icon,title:`研究員稱號晉升 · ${after.title}`,message:'新的探索成果，開啟下一段研究旅程。'});
  }
  return notifications;
}
