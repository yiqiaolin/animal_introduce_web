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

// Panel-only imagery. Archive photos and map illustrations keep their own paths.
const researchPanelArtwork = {
  bear: 'assets/animals/bear_cutout.png',
  cat: 'assets/animals/cat_cutout.png',
  monkey: 'assets/animals/monkey_cutout.png',
  salmon: 'assets/animals/salmon_cutout.png',
  magpie: 'assets/animals/magpie_cutout.png'
};

// Decorative guides vary with the silhouette; they do not assert anatomy.
const annotationPaths = {
  bear: ['M105 97V124H204L223 166', 'M370 95V130H292L265 174', 'M100 386V352H204L224 307', 'M378 386V348H292L267 308'],
  cat: ['M100 95V125H186L215 174', 'M370 100V130H296L272 190', 'M100 386V354H180L204 303', 'M378 382V350H300L277 307'],
  monkey: ['M103 94V128H190L216 175', 'M375 100V145H292L273 180', 'M100 383V352H188L216 308', 'M378 383V347H312L279 306'],
  salmon: ['M103 95V152H172L197 208', 'M372 95V150H307L282 210', 'M100 386V334H180L201 272', 'M377 383V337H300L278 273'],
  magpie: ['M100 97V125H190L216 176', 'M373 99V145H288L268 180', 'M100 382V351H210L232 307', 'M376 382V346H315L280 307']
};

function panelText(value, fallback) {
  return escapePhotoText(typeof value === 'string' && value.trim() ? value : fallback);
}

function panelCutout(animal) {
  const src = researchPanelArtwork[animal.id];
  return `<figure class="rp-subject" data-photo-slot>
    <div class="rp-cutout-placeholder" data-photo-placeholder role="status">
      <span aria-hidden="true">⌑</span><span>動物去背影像待提供或暫時無法載入</span>
    </div>
    ${src ? `<img class="rp-cutout" src="${src}" alt="${panelText(animal.name, '動物')}去背參考影像" hidden>` : ''}
  </figure>`;
}

function researchContent(animal, animate = false) {
  const paths = annotationPaths[animal.id] || annotationPaths.bear;
  return `<div class="rp-scroll${animate ? ' rp-enter' : ''}" aria-label="動物研究資料">
    ${animate ? '<div class="rp-scan" aria-hidden="true"><span>SPECIES IDENTIFICATION</span><p>正在辨識觀察目標</p></div>' : ''}
    <div class="rp-diagram" data-species="${escapePhotoText(animal.id)}">
      <svg class="rp-annotation-lines" viewBox="0 0 480 480" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        ${paths.map(path => `<path d="${path}" pathLength="1"/>`).join('')}
      </svg>
      <section class="rp-callout rp-callout--identity" aria-label="物種名稱">
        <span class="rp-field-label">01 / 物種名稱</span>
        <h3>${panelText(animal.name, '物種名稱待補')}</h3>
        <p class="rp-scientific">${panelText(animal.scientific, '學名待補')}</p>
        <span class="rp-category">${panelText(animal.category, '分類待補')}</span>
      </section>
      <section class="rp-callout rp-callout--habitat" aria-label="棲息環境">
        <h3 class="rp-field-label">02 / 棲息環境</h3>
        <p>${panelText(animal.habitat, '棲息環境資料待補')}</p>
      </section>
      ${panelCutout(animal)}
      <section class="rp-callout rp-callout--conservation" aria-label="保育等級">
        <h3 class="rp-field-label">03 / 保育等級</h3>
        <p>${panelText(animal.conservation, '保育等級尚未確認，資料待補。')}</p>
      </section>
      <section class="rp-callout rp-callout--trivia" aria-label="生態小知識">
        <h3 class="rp-field-label">04 / 生態小知識</h3>
        <p>${panelText(animal.trivia, '尚未提供經確認的生態小知識，內容待補。')}</p>
      </section>
    </div>
  </div>`;
}

function standbyContent() {
  return `<div class="rp-scroll rp-scroll--standby" aria-label="研究設備待命">
    <div class="rp-standby">
      <div class="rp-standby-symbol" aria-hidden="true">⌖</div>
      <span class="rp-field-label">OBSERVATION STANDBY</span>
      <h3>研究設備待命中</h3>
      <p>請在探索地圖中選擇一種野生動物，開始生態觀察。</p>
      <span class="rp-standby-status">等待觀察目標</span>
    </div>
  </div>`;
}

// DOM replacement cancels every prior CSS animation; no delayed callbacks can
// render stale species. The first render is restoration, never a user scan.
const panelSelections = new WeakMap();

export function renderPanel(animal) {
  const panel = document.querySelector('#research-panel');
  const previous = panelSelections.get(panel);
  const id = animal?.id || null;
  if (panelSelections.has(panel) && previous === id) return;
  const animate = panelSelections.has(panel) && Boolean(animal)
    && !globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  panelSelections.set(panel, id);
  panel.innerHTML = `
    <header class="rp-header">
      <div><span class="rp-eyebrow">ECOLOGICAL OBSERVATION / 02</span><h2>動物研究面板</h2></div>
      <span class="rp-specimen">${animal ? 'NO. ' + panelText(animal.number, '—') : 'STANDBY'}</span>
    </header>
    ${animal ? researchContent(animal, animate) : standbyContent()}`;
  bindAnimalPhotos(panel);
}
