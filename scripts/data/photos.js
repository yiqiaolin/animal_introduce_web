// User-provided photos only. Add files at these paths; no download is required.
// Author/source/license fields remain blank until supplied by the user.
const filenames = { bear: 'bear.png', monkey: 'monkey.jpeg', magpie: 'magpie.png' };

export const photos = Object.fromEntries(
  ['bear', 'monkey', 'cat', 'magpie', 'salmon'].map(id => [id, {
    src: `assets/animals/photos/${filenames[id] || id + '.jpg'}`,
    description: '',
    author: '',
    source: '',
    license: '',
    licenseUrl: '',
    modifications: ''
  }])
);
