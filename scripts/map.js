import { animals } from './data/animals.js';
import { state } from './state.js';

const MIN_SCALE = 1;
const MAX_SCALE = 3.5;
const REVEAL_SCALE = 1.45;

export function initMap(onSelect) {
  const viewport = document.querySelector('#map-viewport');
  const world = document.querySelector('#map-world');
  let scale = MIN_SCALE;
  let x = 0;
  let y = 0;
  let drag = null;

  document.querySelector('#map-animals').innerHTML = animals.map(animal => `
    <button class="animal-marker" data-id="${animal.id}"
      style="left:${animal.x}%;top:${animal.y}%" aria-label="研究${animal.name}">
      <span class="animal-icon" aria-hidden="true">${animal.symbol}</span>
      <span class="animal-name">${animal.name}</span>
      <span class="found-check">✓</span>
    </button>
  `).join('');

  function draw() {
    // Keep the transformed canvas covering the viewport at every zoom level.
    const maxX = viewport.clientWidth * (scale - 1) / 2;
    const maxY = viewport.clientHeight * (scale - 1) / 2;
    x = Math.max(-maxX, Math.min(maxX, x));
    y = Math.max(-maxY, Math.min(maxY, y));
    world.style.transform = `translate(${x}px,${y}px) scale(${scale})`;
    viewport.classList.toggle('animals-visible', scale >= REVEAL_SCALE);
    world.querySelectorAll('button').forEach(button => {
      button.tabIndex = scale >= REVEAL_SCALE ? 0 : -1;
    });
    document.querySelector('#zoom-level').textContent = `${Math.round(scale * 100)}%`;
    document.querySelector('#zoom-hint').classList.toggle('hidden', scale >= REVEAL_SCALE);
  }

  function zoom(nextScale, cursorX = 0, cursorY = 0) {
    const previousScale = scale;
    scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, nextScale));
    // Preserve the point under the mouse while zooming.
    x = cursorX - (cursorX - x) * scale / previousScale;
    y = cursorY - (cursorY - y) * scale / previousScale;
    draw();
  }

  viewport.addEventListener('wheel', event => {
    event.preventDefault();
    const bounds = viewport.getBoundingClientRect();
    zoom(
      scale * Math.exp(-event.deltaY * 0.0015),
      event.clientX - bounds.left - bounds.width / 2,
      event.clientY - bounds.top - bounds.height / 2
    );
  }, { passive: false });

  viewport.addEventListener('pointerdown', event => {
    if (event.target.closest('button') || event.button !== 0) return;
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

  function stopDragging() {
    drag = null;
    viewport.classList.remove('dragging');
  }

  viewport.addEventListener('pointerup', stopDragging);
  viewport.addEventListener('pointercancel', stopDragging);
  viewport.addEventListener('lostpointercapture', stopDragging);
  document.querySelector('#zoom-in').onclick = () => zoom(scale + 0.3);
  document.querySelector('#zoom-out').onclick = () => zoom(scale - 0.3);
  document.querySelector('#reset-map').onclick = () => {
    scale = MIN_SCALE;
    x = 0;
    y = 0;
    draw();
  };

  world.addEventListener('click', event => {
    const button = event.target.closest('[data-id]');
    if (button) onSelect(button.dataset.id);
  });

  viewport.addEventListener('keydown', event => {
    if (event.target !== viewport) return;
    if (event.key === '+' || event.key === '=') {
      zoom(scale + 0.3);
      event.preventDefault();
    }
    if (event.key === '-') {
      zoom(scale - 0.3);
      event.preventDefault();
    }
  });

  window.addEventListener('resize', draw);
  draw();

  return function refreshMarkers() {
    world.querySelectorAll('.animal-marker').forEach(button => {
      button.classList.toggle('selected', button.dataset.id === state.selected);
      button.classList.toggle('discovered', state.discovered.has(button.dataset.id));
    });
  };
}
