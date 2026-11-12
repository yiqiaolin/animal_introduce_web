import { getAnimal } from './animals.js';
import { regions } from './regions.js';

// Array order is the agreed global fallback order, independent of archive order.
// Locations describe this game's illustrations, not real-world sightings/habitat claims.
// speciesId and source are internal metadata: UI should render only the clue fields.
export const explorationHints = Object.freeze([
  {
    speciesId:'bear', regionId:'mountain-forest',
    title:'胸前的月形印記',
    clue:getAnimal('bear').trivia,
    location:'在山地森林研究區的溪邊，仔細觀察。'
  },
  {
    speciesId:'monkey', regionId:'mountain-forest',
    title:'岩上的紅色線索',
    clue:getAnimal('monkey').trivia,
    location:'在山地森林研究區的岩石上，仔細觀察。'
  },
  {
    speciesId:'cat', regionId:'lowland-forest',
    title:'耳後的白色圓斑',
    // The animal catalog's trivia names the species; keep the clue anonymous.
    clue:'耳朵背面有白色圓斑，身上帶有深色斑點。',
    location:'在低海拔森林研究區的田邊，仔細觀察。'
  },
  {
    speciesId:'magpie', regionId:'lowland-forest',
    title:'長尾的森林住客',
    clue:'擁有醒目的長尾，繁殖期會互相協助照顧下一代。',
    location:'在低海拔森林研究區的樹枝上，仔細觀察。'
  },
  {
    speciesId:'salmon', regionId:'alpine-stream',
    title:'冷水中的深色橫斑',
    clue:'身體側面有橢圓形深色橫斑，生活在清澈低溫的溪流。',
    location:'在高山溪流研究區的溪裡，仔細觀察。'
  }
].map(hint=>Object.freeze({
  ...hint,
  regionName:regions[hint.regionId].name,
  source:getAnimal(hint.speciesId).ecologySource
})));
