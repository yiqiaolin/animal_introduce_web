import { getAnimal } from './data/animals.js';

// getBoundingClientRect includes ancestor scale, translation and page position.
export function pointToPercent(clientX, clientY, bounds) {
  if (bounds.width <= 0 || bounds.height <= 0) return null;
  const x = (clientX - bounds.left) / bounds.width * 100;
  const y = (clientY - bounds.top) / bounds.height * 100;
  if (x < 0 || x > 100 || y < 0 || y > 100) return null;
  return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
}

export function createMapEditor({ viewport, camera, artwork, onChange, onVisibilityChange }) {
  const edits = new Map();
  let region = null;
  let selectedId = null;
  let pointerStart = null;
  let dragged = false;
  const panel = document.createElement('section');
  panel.className = 'map-editor';
  panel.hidden = true;
  panel.setAttribute('aria-label', '開發者地圖座標編輯器');
  panel.innerHTML = `
    <strong>座標編輯 · 僅暫存</strong>
    <label>動物 <select aria-label="選擇要調整的動物"></select></label>
    <label><input type="checkbox" checked> 強制顯示動物</label>
    <output aria-live="polite"></output>
    <textarea rows="2" readonly aria-label="可複製的區域座標"></textarea>
    <button type="button">複製座標</button>
    <small role="status">選擇動物後點擊地圖；拖曳不會改座標。</small>`;
  viewport.append(panel);
  const select = panel.querySelector('select');
  const visible = panel.querySelector('input');
  const output = panel.querySelector('output');
  const code = panel.querySelector('textarea');
  const status = panel.querySelector('small');

  function positions(currentRegion) {
    if (!edits.has(currentRegion.id)) {
      edits.set(currentRegion.id, currentRegion.animals.map(position => ({ ...position })));
    }
    return edits.get(currentRegion.id);
  }

  function updateReadout() {
    const position = positions(region).find(p => p.id === selectedId);
    output.textContent = `X: ${position.x.toFixed(1)}%　Y: ${position.y.toFixed(1)}%`;
    code.value = `{ id: '${position.id}', x: ${position.x.toFixed(1)}, y: ${position.y.toFixed(1)} }`;
  }

  select.addEventListener('change', () => {
    selectedId = select.value;
    updateReadout();
  });
  visible.addEventListener('change', onVisibilityChange);
  panel.querySelector('button').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(code.value);
      status.textContent = '已複製；確認後手動更新 regions.js。';
    } catch {
      code.focus();
      code.select();
      status.textContent = '無法存取剪貼簿，已選取文字，請手動複製。';
    }
  });

  viewport.addEventListener('pointerdown', event => {
    pointerStart = { x: event.clientX, y: event.clientY };
    dragged = false;
  });
  viewport.addEventListener('pointermove', event => {
    if (pointerStart && Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 4) dragged = true;
  });
  viewport.addEventListener('pointerup', () => { pointerStart = null; });
  viewport.addEventListener('pointercancel', () => { pointerStart = null; dragged = true; });
  viewport.addEventListener('click', event => {
    if (!region || dragged || event.target.closest('.map-editor, #back-overview, .map-controls')) return;
    if (!pointToPercent(event.clientX, event.clientY, camera.getBoundingClientRect())) return;
    const point = pointToPercent(event.clientX, event.clientY, artwork.getBoundingClientRect());
    if (!point) return;
    Object.assign(positions(region).find(p => p.id === selectedId), point);
    updateReadout();
    status.textContent = '預覽已更新，尚未寫入設定檔。';
    onChange();
  });

  return {
    positions,
    forceVisible: () => !!region && visible.checked,
    setRegion(nextRegion) {
      region = nextRegion;
      panel.hidden = !region;
      if (!region) return;
      const options = positions(region);
      selectedId = options.some(p => p.id === selectedId) ? selectedId : options[0].id;
      select.replaceChildren(...options.map(position => {
        const option = document.createElement('option');
        option.value = position.id;
        option.textContent = getAnimal(position.id).name;
        return option;
      }));
      select.value = selectedId;
      updateReadout();
    }
  };
}
