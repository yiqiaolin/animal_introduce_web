// Shared by the research panel and the expanded archive card.
export function photoPlaceholder(animal, className = '') {
  return `<div class="photo-placeholder ${className}">
    <span>⌑</span><small>${animal.name} · 真實照片待提供</small><em>PHOTO ASSET PENDING</em>
  </div>`;
}

function escapePhotoText(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}

function photoLink(url, label) {
  if (!/^https?:\/\//i.test(url || '')) return escapePhotoText(label);
  return `<a href="${escapePhotoText(url)}" target="_blank" rel="noopener noreferrer">${escapePhotoText(label)}</a>`;
}

export function renderAnimalPhoto(animal, thumbnail = false) {
  const photo = animal.photo;
  if (!photo?.src) return photoPlaceholder(animal);
  const alt = escapePhotoText(photo.description || animal.name + '真實照片');
  const image = `<img src="${escapePhotoText(photo.src)}" alt="${alt}" hidden>`;
  if (thumbnail) return `<span class="archive-thumbnail" data-photo-slot>
    <span class="thumbnail-placeholder" data-photo-placeholder aria-label="照片待提供">⌑</span>${image}
  </span>`;
  const credits = [
    photo.author ? '照片：' + escapePhotoText(photo.author) : '',
    photo.source ? photoLink(photo.source, '原始來源') : '',
    photo.license ? photoLink(photo.licenseUrl, photo.license) : ''
  ].filter(Boolean).join(' · ');
  const caption = credits || photo.modifications
    ? `<figcaption>${credits}${photo.modifications ? `<span>${escapePhotoText(photo.modifications)}</span>` : ''}</figcaption>` : '';
  return `<figure class="animal-photo">
    <div data-photo-slot>${photoPlaceholder(animal, 'photo-fallback')}${image}</div>
    ${caption}
  </figure>`;
}

// Bind after rendering. The placeholder stays visible until a valid image loads,
// including cached loads; missing/corrupt photos never display a broken image.
export function bindAnimalPhotos(root) {
  root.querySelectorAll('[data-photo-slot]').forEach(slot => {
    const image = slot.querySelector('img');
    const placeholder = slot.querySelector('.photo-fallback, [data-photo-placeholder]');
    if (!image || !placeholder) return;
    const update = loaded => {
      image.hidden = !loaded;
      placeholder.hidden = loaded;
    };
    image.addEventListener('load', () => update(image.naturalWidth > 0));
    image.addEventListener('error', () => update(false));
    update(image.complete && image.naturalWidth > 0);
  });
}

function researchContent(animal) {
  const fields = [
    ['物種分類', animal.category],
    ['棲地環境', animal.habitat],
    ['生活習性', animal.habit],
    ['保育資訊', animal.conservation]
  ];
  return `${renderAnimalPhoto(animal)}
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
  bindAnimalPhotos(document.querySelector('#research-panel'));
}
