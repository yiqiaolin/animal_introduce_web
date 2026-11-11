// Percentages refer to each complete illustration, not geographic coordinates.
export const regions = {
  'mountain-forest': {
    id: 'mountain-forest',
    name: '山地森林研究區',
    image: 'assets/map/mountain-forest.png',
    entrance: { x: 50, y: 58 }, // Yushan-area mountains; estimated against the illustrated island outline.
    minScale: 1,
    maxScale: 2.5,
    revealScale: 1.8,
    animals: [
      { id: 'bear', x: 82.2, y: 52.0 },
      { id: 'monkey', x: 32.5, y: 31.8 }
    ]
  },
  'lowland-forest': {
    id: 'lowland-forest',
    name: '低海拔森林研究區',
    image: 'assets/map/lowland-forest.png',
    entrance: { x: 44, y: 30 }, // Tongluo/Tongxiao western foothills; illustration estimate.
    minScale: 1,
    maxScale: 2.5,
    revealScale: 1.8,
    animals: [
      { id: 'cat', x: 25.0, y: 35.9 },
      { id: 'magpie', x: 12.0, y: 5.4 }
    ]
  },
  'alpine-stream': {
    id: 'alpine-stream',
    name: '高山溪流研究區',
    image: 'assets/map/alpine-stream.png',
    entrance: { x: 63, y: 29 }, // Wuling/Qijiawan; slightly north-shifted to match the requested visual ordering.
    minScale: 1,
    maxScale: 2.5,
    revealScale: 1.8,
    animals: [
      { id: 'salmon', x: 76.0, y: 35.0 } // Initial preview: calm pool below the upper-right waterfall.
    ]
  }
};
