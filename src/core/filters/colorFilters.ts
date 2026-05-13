import type { PixelMatrix } from '../../types/image.types';
import { cloneMatrix } from '../algorithms/pixelMatrix';

const clamp = (val: number, min = 0, max = 255) => Math.min(Math.max(val, min), max);

export const applyGrayscale = (matrix: PixelMatrix): PixelMatrix => {
  const result = cloneMatrix(matrix);
  for (let y = 0; y < result.length; y++) {
    for (let x = 0; x < result[0].length; x++) {
      const p = result[y][x];
      // Calculate perceived luminance
      const luminance = p[0] * 0.299 + p[1] * 0.587 + p[2] * 0.114;
      p[0] = clamp(luminance);
      p[1] = clamp(luminance);
      p[2] = clamp(luminance);
    }
  }
  return result;
};

export const applySepia = (matrix: PixelMatrix): PixelMatrix => {
  const result = cloneMatrix(matrix);
  for (let y = 0; y < result.length; y++) {
    for (let x = 0; x < result[0].length; x++) {
      const p = result[y][x];
      const r = p[0];
      const g = p[1];
      const b = p[2];
      
      p[0] = clamp((r * 0.393) + (g * 0.769) + (b * 0.189));
      p[1] = clamp((r * 0.349) + (g * 0.686) + (b * 0.168));
      p[2] = clamp((r * 0.272) + (g * 0.534) + (b * 0.131));
    }
  }
  return result;
};

export const applyInvert = (matrix: PixelMatrix): PixelMatrix => {
  const result = cloneMatrix(matrix);
  for (let y = 0; y < result.length; y++) {
    for (let x = 0; x < result[0].length; x++) {
      const p = result[y][x];
      p[0] = 255 - p[0];
      p[1] = 255 - p[1];
      p[2] = 255 - p[2];
    }
  }
  return result;
};
