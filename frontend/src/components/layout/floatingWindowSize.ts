export interface Size {
  width: number;
  height: number;
}

const MIN_WIDTH = 300;
const MIN_HEIGHT = 240;

function viewportMaxSize(): Size {
  return {
    width: Math.floor(window.innerWidth * 0.92),
    height: Math.floor(window.innerHeight * 0.85),
  };
}

/** Clamp width/height between the minimum floor and the current viewport ceiling. */
export function clampSize(width: number, height: number): Size {
  const max = viewportMaxSize();
  return {
    width: Math.max(MIN_WIDTH, Math.min(width, max.width)),
    height: Math.max(MIN_HEIGHT, Math.min(height, max.height)),
  };
}
