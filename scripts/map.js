import { animals, getAnimal } from './data/animals.js';
import { regions } from './data/regions.js';
import { fitMap, constrainView } from './map-geometry.js';
import { state, visitRegion } from './state.js';
import { createMapEditor } from './map-editor.js';

const overview = { minScale: 1, maxScale: 3.5, revealScale: 1.8, entranceRevealScale: 2.3 };
const overviewImage = 'assets/map/taiwan-ecological-map.png';

export function initMap(onSelect) {
  const viewport = document.querySelector('#map-viewport');
  const camera = document.querySelector('#map-camera');
  const world = document.querySelector('#map-world');
  const artwork = document.querySelector('#map-artwork');
  const image = artwork.querySelector('.island');
  const markers = document.querySelector('#map-animals');
  const back = document.querySelector('#back-overview');
  const hint = document.querySelector('#zoom-hint');
  let activeRegion = null;
  let scale = 1;
  let x = 0;
  let y = 0;
  let drag = null;
  let savedOverview = null;
  let switching = false;
  let cameraWidth = 0;
  let cameraHeight = 0;
  let imageWidth = 1024;
  let imageHeight = 1536;
  const settings = () => activeRegion || overview;
  const debugEnabled = new URLSearchParams(globalThis.location?.search || '').get('debugMap') === '1';
  const editor = debugEnabled ? createMapEditor({
    viewport, camera, artwork,
    onChange: () => { renderMarkers(); draw(); },
    onVisibilityChange: draw
  }) : null;

  function refreshMarkers() {
    markers.querySelectorAll('.animal-marker').forEach(button => {
      button.classList.toggle('selected', button.dataset.id === state.selected);
      const discovered = state.discovered.has(button.dataset.id);
      button.classList.toggle('discovered', discovered);
      if (!discovered) button.classList.remove('discovering');
    });
  }

  function renderMarkers() {
    const regionalIds = new Set(Object.values(regions).flatMap(region => region.animals.map(a => a.id)));
    const positions = activeRegion ? (editor ? editor.positions(activeRegion) : activeRegion.animals) : animals.filter(a => !regionalIds.has(a.id));
    markers.innerHTML = positions.map(position => {
      const animal = getAnimal(position.id);
      return `<button class="animal-marker" data-id="${animal.id}"
        style="left:${position.x}%;top:${position.y}%;--icon-width:${animal.iconWidth}px;--icon-height:${animal.iconHeight}px"
        aria-label="研究${animal.name}">
        <img class="animal-icon" src="${animal.illustration}" alt="" draggable="false"
          width="${animal.iconWidth}" height="${animal.iconHeight}">
        <span class="found-check">✓</span>
      </button>`;
    }).join('');
    if (!activeRegion) {
      markers.innerHTML += Object.values(regions).map(region => `
        <button class="region-entrance" data-region="${region.id}"
          style="left:${region.entrance.x}%;top:${region.entrance.y}%"
          aria-label="進入${region.name}"><span aria-hidden="true">⌂</span></button>`).join('');
    }
    refreshMarkers();
  }

  function draw() {
    const fit = fitMap(viewport.clientWidth, viewport.clientHeight, imageWidth, imageHeight, !!activeRegion);
    cameraWidth = fit.cameraWidth;
    cameraHeight = fit.cameraHeight;
    camera.style.width = `${cameraWidth}px`;
    camera.style.height = `${cameraHeight}px`;
    artwork.style.width = `${fit.width}px`;
    artwork.style.height = `${fit.height}px`;
    ({ x, y } = constrainView(x, y, scale, cameraWidth, cameraHeight));
    world.style.setProperty('--map-scale', scale);
    world.style.transform = `translate(${x}px,${y}px) scale(${scale})`;
    const revealed = !!editor?.forceVisible() || scale >= settings().revealScale;
    const entranceRevealed = !activeRegion && scale >= overview.entranceRevealScale;
    viewport.classList.toggle('entrances-visible', entranceRevealed);
    viewport.classList.toggle('animals-visible', revealed);
    markers.querySelectorAll('button').forEach(button => {
      button.tabIndex = (button.dataset.region ? entranceRevealed : revealed) ? 0 : -1;
    });
    document.querySelector('#zoom-level').textContent = `${Math.round(scale * 100)}%`;
    hint.classList.toggle('hidden', revealed);
  }

  function stopDragging() {
    drag = null;
    viewport.classList.remove('dragging');
  }

  // Load before switching; a missing/corrupt asset leaves the previous map usable.
  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const asset = new Image();
      asset.onload = () => resolve(asset);
      asset.onerror = reject;
      asset.src = src;
    });
  }

  async function switchMap(region) {
    if (switching) return;
    switching = true;
    viewport.setAttribute('aria-busy', 'true');
    try {
      const asset = await loadImage(region ? region.image : overviewImage);
      stopDragging();
      if (region) savedOverview = { scale, x, y };
      const previousRegionId = activeRegion?.id;
      activeRegion = region;
      imageWidth = asset.naturalWidth;
      imageHeight = asset.naturalHeight;
      image.src = asset.src;
      image.alt = region ? region.name + '生態插畫' : '台灣生態地圖插畫';
      image.width = imageWidth;
      image.height = imageHeight;
      ({ scale, x, y } = region ? { scale: 1, x: 0, y: 0 } : savedOverview);
      back.hidden = !region;
      viewport.classList.toggle('regional-map', !!region);
      viewport.setAttribute('aria-label', `${region ? region.name : '台灣總覽'}，使用滾輪縮放或拖曳移動`);
      document.querySelector('.map-footer span').textContent = region ? `⌖ ${region.name} / 區域探索` : '⌖ TAIWAN / 示意探索區';
      document.querySelector('.map-panel h1').textContent = region ? region.name : '島嶼探索';
      hint.textContent = region ? '放大至 180%，在研究區中尋找動物' : '滾動放大地圖，尋找島嶼上的生命蹤跡';
      editor?.setRegion(region);
      renderMarkers();
      // Don't interpolate between unrelated coordinate systems.
      world.classList.add('map-switching');
      draw();
      requestAnimationFrame(() => requestAnimationFrame(() => world.classList.remove('map-switching')));
      if (region && !debugEnabled) visitRegion(region.id);
      if (region) back.focus({ preventScroll: true });
      else markers.querySelector(`[data-region="${previousRegionId}"]`)?.focus({ preventScroll: true });
    } catch {
      hint.textContent = '地圖載入失敗，請檢查素材後重試';
      hint.classList.remove('hidden');
    } finally {
      switching = false;
      viewport.setAttribute('aria-busy', 'false');
    }
  }

  function zoom(nextScale, cursorX = 0, cursorY = 0) {
    if (switching) return;
    const previousScale = scale;
    const config = settings();
    scale = Math.max(config.minScale, Math.min(config.maxScale, nextScale));
    x = cursorX - (cursorX - x) * scale / previousScale;
    y = cursorY - (cursorY - y) * scale / previousScale;
    draw();
  }

  viewport.addEventListener('wheel', event => {
    if (event.target.closest('#back-overview, .map-editor')) return;
    event.preventDefault();
    const bounds = camera.getBoundingClientRect();
    zoom(scale * Math.exp(-event.deltaY * 0.0015),
      event.clientX - bounds.left - bounds.width / 2,
      event.clientY - bounds.top - bounds.height / 2);
  }, { passive: false });

  viewport.addEventListener('pointerdown', event => {
    if (switching || event.target.closest('button, .map-editor') || event.button !== 0) return;
    drag = { pointerX: event.clientX, pointerY: event.clientY, x, y };
    viewport.setPointerCapture(event.pointerId);
    viewport.classList.add('dragging');
  });
  viewport.addEventListener('pointermove', event => {
    if (!drag) return;
    x = drag.x + event.clientX - drag.pointerX;
    y = drag.y + event.clientY - drag.pointerY;
    draw();
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => viewport.addEventListener(type, stopDragging));
  document.querySelector('#zoom-in').onclick = () => zoom(scale + 0.3);
  document.querySelector('#zoom-out').onclick = () => zoom(scale - 0.3);
  document.querySelector('#reset-map').onclick = () => {
    if (switching) return;
    scale = settings().minScale;
    x = y = 0;
    draw();
  };
  back.onclick = () => switchMap(null);

  world.addEventListener('click', event => {
    if (switching) return;
    const entrance = event.target.closest('[data-region]');
    if (entrance && !activeRegion) {
      if (scale < overview.entranceRevealScale) return;
      switchMap(regions[entrance.dataset.region]);
      return;
    }
    if (editor || scale < settings().revealScale) return;
    const button = event.target.closest('.animal-marker');
    if (!button) return;
    const isNew = !state.discovered.has(button.dataset.id);
    onSelect(button.dataset.id);
    if (isNew) button.classList.add('discovering');
  });
  world.addEventListener('animationend', event => {
    if (event.animationName === 'discovery-scan') event.target.closest('.animal-marker')?.classList.remove('discovering');
  });
  viewport.addEventListener('keydown', event => {
    if (event.target !== viewport) return;
    if (event.key === '+' || event.key === '=') { zoom(scale + 0.3); event.preventDefault(); }
    if (event.key === '-') { zoom(scale - 0.3); event.preventDefault(); }
  });
  window.addEventListener('resize', draw);
  renderMarkers();
  draw();
  return refreshMarkers;
}
