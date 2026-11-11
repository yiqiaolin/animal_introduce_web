// Shared by the research panel and the expanded archive card.
export function photoPlaceholder(animal, className = '') {
  return `<div class="photo-placeholder ${className}">
    <span>⌑</span><small>${animal.name} · 真實照片待提供</small><em>PHOTO ASSET PENDING</em>
  </div>`;
}

function researchContent(animal) {
  const fields = [
    ['物種分類', animal.category],
    ['棲地環境', animal.habitat],
    ['生活習性', animal.habit],
    ['保育資訊', animal.conservation]
  ];
  return `${photoPlaceholder(animal)}
    <div class="panel-body">
      <span class="eyebrow">SPECIMEN ${animal.number} <span class="demo-tag">示範資料</span></span>
      <h3>${animal.name}</h3><p class="scientific">${animal.scientific}</p>
      <dl>${fields.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl>
      <p class="research-copy">${animal.research}</p>
    </div>`;
}

function standbyContent() {
  return `<div class="standby">
    <div class="target-symbol">⌖</div>
    <span class="eyebrow">AWAITING OBSERVATION</span>
    <h3>每一次觀察，<br>都是理解島嶼的開始。</h3>
    <p>放大左側地圖，點選出現的動物標記，<br>開啟你的第一份物種研究紀錄。</p>
    <div class="standby-line"></div>
    <small>01 放大地圖　 /　 02 尋找動物　 /　 03 開始研究</small>
  </div>`;
}

export function renderPanel(animal) {
  document.querySelector('#research-panel').innerHTML = `
    <header class="panel-heading">
      <div><span class="eyebrow">SPECIES RESEARCH / 02</span><h2>動物研究面板</h2></div>
      <span class="tiny-number">${animal ? 'NO. ' + animal.number : 'STANDBY'}</span>
    </header>
    ${animal ? researchContent(animal) : standbyContent()}`;
}
