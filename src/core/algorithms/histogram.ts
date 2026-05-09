import type { PixelMatrix } from '../../types/image.types';

export interface HistogramData {
  r: number[];
  g: number[];
  b: number[];
  l: number[];
}

export const computeHistogram = (matrix: PixelMatrix): HistogramData => {
  const r = new Array(256).fill(0);
  const g = new Array(256).fill(0);
  const b = new Array(256).fill(0);
  const l = new Array(256).fill(0);

  if (!matrix || matrix.length === 0 || matrix[0].length === 0) {
    return { r, g, b, l };
  }

  const height = matrix.length;
  const width = matrix[0].length;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixel = matrix[y][x];
      const red = pixel[0];
      const green = pixel[1];
      const blue = pixel[2];

      r[red]++;
      g[green]++;
      b[blue]++;

      const lum = Math.round(0.299 * red + 0.587 * green + 0.114 * blue);
      // Clamp just in case floating point math produces 256
      l[Math.min(255, Math.max(0, lum))]++;
    }
  }

  return { r, g, b, l };
};

export const normalizeHistogram = (histogram: number[]): number[] => {
  let max = 0;
  for (let i = 0; i < histogram.length; i++) {
    if (histogram[i] > max) {
      max = histogram[i];
    }
  }

  if (max === 0) return [...histogram];

  return histogram.map((val) => val / max);
};
