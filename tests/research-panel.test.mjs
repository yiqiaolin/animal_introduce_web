import test from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { animals } from '../scripts/data/animals.js';
import { renderPanel, renderAnimalPhoto } from '../scripts/research-panel.js';

function panelFixture() {
  const panel = { innerHTML: '', querySelectorAll: () => [] };
  globalThis.document = { querySelector: selector => {
    assert.equal(selector, '#research-panel');
    return panel;
  } };
  return panel;
}

test('standby is accessible and selecting/reselecting species does not mutate source data', async () => {
  const panel = panelFixture();
  const before = JSON.stringify(animals);
  renderPanel(null);
  for (const text of ['研究設備待命中', '請在探索地圖中選擇一種野生動物，開始生態觀察。', '等待觀察目標']) {
    assert.ok(panel.innerHTML.includes(text));
  }
  assert.doesNotMatch(panel.innerHTML, /可獨立捲動/);
  assert.doesNotMatch(panel.innerHTML, /<img|<button/);
  for (const animal of [...animals, animals[0]]) {
    renderPanel(animal);
    const path = `assets/animals/${animal.id}_cutout.png`;
    await access(new URL(`../${path}`, import.meta.url));
    assert.ok(panel.innerHTML.includes(path));
    assert.doesNotMatch(panel.innerHTML, /rp-research-note|研究說明|影像由使用者提供|生態資料 · 已查核/);
    assert.ok(!panel.innerHTML.includes(animal.introduction));
    assert.ok(!panel.innerHTML.includes(animal.photo.src));
    assert.equal((panel.innerHTML.match(/<section class="rp-callout /g) || []).length, 4);
    assert.doesNotMatch(panel.innerHTML, /rp-actions|rp-action|<button|已收錄圖鑑/);
    assert.doesNotMatch(panel.innerHTML, /null|undefined/);
    // The archive still uses the original user photo, never the panel cutout.
    assert.ok(renderAnimalPhoto(animal).includes(animal.photo.src));
  }
  assert.equal(JSON.stringify(animals), before);
});

test('missing fields/assets have explicit placeholders and incoming text is escaped', () => {
  const panel = panelFixture();
  renderPanel({ id: 'not-supplied', name: '<img onerror="bad">', scientific: null,
    category: undefined, habitat: null, conservation: null, trivia: null, introduction: null });
  assert.match(panel.innerHTML, /&lt;img onerror=&quot;bad&quot;&gt;/);
  assert.doesNotMatch(panel.innerHTML, /<img|null|undefined/);
  for (const text of ['動物去背影像待提供', '棲息環境資料待補', '保育等級尚未確認', '生態小知識，內容待補']) {
    assert.ok(panel.innerHTML.includes(text));
  }
});

test('panel cutouts reuse load/error/cached-image fallback binding', () => {
  const panel = panelFixture();
  const events = {};
  const image = { complete: false, naturalWidth: 0, addEventListener: (name, fn) => events[name] = fn };
  const placeholder = { hidden: false };
  panel.querySelectorAll = () => [{ querySelector: selector => selector === 'img' ? image : placeholder }];
  renderPanel(animals[0]);
  assert.equal(image.hidden, true);
  image.naturalWidth = 1024;
  events.load();
  assert.equal(image.hidden, false);
  assert.equal(placeholder.hidden, true);
  events.error();
  assert.equal(image.hidden, true);
  assert.equal(placeholder.hidden, false);
  image.complete = true;
  renderPanel(animals[1]);
  assert.equal(image.hidden, false);
});

test('restoration skips scanning; all species switches replace stale content and repeats preserve DOM', () => {
  const panel = panelFixture();
  renderPanel(animals[0]);
  assert.doesNotMatch(panel.innerHTML, /class="rp-scan"|rp-enter/);
  renderPanel(null);
  let previous;
  for (const animal of animals) {
    renderPanel(animal);
    assert.match(panel.innerHTML, /class="rp-scroll rp-enter"/);
    assert.match(panel.innerHTML, /class="rp-scan" aria-hidden="true"/);
    assert.ok(panel.innerHTML.includes(`${animal.id}_cutout.png`));
    if (previous) assert.ok(!panel.innerHTML.includes(`${previous.id}_cutout.png`));
    const rendered = panel.innerHTML;
    panel.innerHTML += '<!-- existing DOM sentinel -->';
    renderPanel(animal);
    assert.equal(panel.innerHTML, rendered + '<!-- existing DOM sentinel -->');
    previous = animal;
  }
  renderPanel(null);
  assert.doesNotMatch(panel.innerHTML, /rp-enter|rp-scan|_cutout.png/);
  // A fresh page's panel restores a selection without playing identification.
  const restored = panelFixture();
  renderPanel(animals[4]);
  assert.doesNotMatch(restored.innerHTML, /rp-enter|class="rp-scan"/);
});

test('reduced motion shows every species immediately without a scan or focus movement', () => {
  const oldMatchMedia = globalThis.matchMedia;
  globalThis.matchMedia = () => ({ matches: true });
  try {
    const panel = panelFixture();
    renderPanel(null);
    for (const animal of animals) {
      renderPanel(animal);
      assert.doesNotMatch(panel.innerHTML, /rp-enter|class="rp-scan"|autofocus|aria-live/);
      assert.ok(panel.innerHTML.includes(`${animal.id}_cutout.png`));
    }
  } finally {
    if (oldMatchMedia) globalThis.matchMedia = oldMatchMedia;
    else delete globalThis.matchMedia;
  }
});

test('official panel fields survive data mapping and render without demo/pending claims', () => {
  const expected = {
    bear: '第 I 級｜瀕臨絕種野生動物',
    cat: '第 I 級｜瀕臨絕種野生動物',
    monkey: '一般類野生動物（非保育類）',
    salmon: '第 I 級｜瀕臨絕種野生動物',
    magpie: '第 III 級｜其他應予保育野生動物'
  };
  for (const animal of animals) {
    assert.equal(animal.conservation, expected[animal.id]);
    assert.equal(animal.ecologyReviewedOn, '2026-11-11');
    assert.ok(animal.ecologySource.startsWith('https://'));
    assert.equal(animal.conservationSources.length, 2);
    assert.ok(animal.habitat.length <= 24);
    assert.ok(animal.trivia.length <= 32);
    assert.ok(animal.introduction.length <= 40);
    const panel = panelFixture();
    renderPanel(animal);
    for (const field of ['name', 'scientific', 'habitat', 'conservation', 'trivia']) {
      assert.ok(panel.innerHTML.includes(animal[field]));
    }
    // Image placeholders remain by design, but no verified text is labelled pending.
    assert.doesNotMatch(panel.innerHTML, /既有示範資料|資料待校核|研究文字待校核|正式物種介紹待補|尚未提供經確認/);
  }
});
