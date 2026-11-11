// The forest camera matches the fitted image rectangle, so zooming cannot
// reveal anything outside the image, even on very wide or tall panels.
export function fitMap(viewWidth, viewHeight, imageWidth, imageHeight, regional) {
  const fit = Math.min(
    viewWidth * (regional ? 0.94 : 0.84) / imageWidth,
    viewHeight * (regional ? 0.9 : 0.88) / imageHeight
  );
  const width = imageWidth * fit;
  const height = imageHeight * fit;
  return {
    width, height,
    cameraWidth: regional ? width : viewWidth,
    cameraHeight: regional ? height : viewHeight
  };
}

export function constrainView(x, y, scale, width, height) {
  const maxX = width * (scale - 1) / 2;
  const maxY = height * (scale - 1) / 2;
  return {
    x: Math.max(-maxX, Math.min(maxX, x)),
    y: Math.max(-maxY, Math.min(maxY, y))
  };
}
