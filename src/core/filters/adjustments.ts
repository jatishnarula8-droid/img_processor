import type { PixelMatrix } from '../../types/image.types';
import { cloneMatrix } from '../algorithms/pixelMatrix';

const clamp = (val: number, min = 0, max = 255) => Math.min(Math.max(val, min), max);

export const applyBrightness = (matrix: PixelMatrix, value: number): PixelMatrix => {
  const result = cloneMatrix(matrix);
  const offset = Math.floor((value / 100) * 255);

  for (let y = 0; y < result.length; y++) {
    for (let x = 0; x < result[0].length; x++) {
      const p = result[y][x];
      p[0] = clamp(p[0] + offset);
      p[1] = clamp(p[1] + offset);
      p[2] = clamp(p[2] + offset);
    }
  }
  return result;
};

export const applyContrast = (matrix: PixelMatrix, value: number): PixelMatrix => {
  const result = cloneMatrix(matrix);
  const v = value * 2.55; // scale -100..100 to -255..255
  const factor = (259 * (v + 255)) / (255 * (259 - v));

  for (let y = 0; y < result.length; y++) {
    for (let x = 0; x < result[0].length; x++) {
      const p = result[y][x];
      p[0] = clamp(factor * (p[0] - 128) + 128);
      p[1] = clamp(factor * (p[1] - 128) + 128);
      p[2] = clamp(factor * (p[2] - 128) + 128);
    }
  }
  return result;
};

const rgbToHsl = (r: number, g: number, b: number) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h, s, l];
};

const hue2rgb = (p: number, q: number, t: number) => {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
};

const hslToRgb = (h: number, s: number, l: number) => {
  let r, g, b;
  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
};

export const applySaturation = (matrix: PixelMatrix, value: number): PixelMatrix => {
  const result = cloneMatrix(matrix);
  const factor = (value + 100) / 100;

  for (let y = 0; y < result.length; y++) {
    for (let x = 0; x < result[0].length; x++) {
      const p = result[y][x];
      const [h, s, l] = rgbToHsl(p[0], p[1], p[2]);
      const newS = Math.min(Math.max(s * factor, 0), 1);
      const [r, g, b] = hslToRgb(h, newS, l);
      p[0] = clamp(r);
      p[1] = clamp(g);
      p[2] = clamp(b);
    }
  }
  return result;
};
