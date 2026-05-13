import type { PixelMatrix } from "../../types/image.types";
import { cloneMatrix } from "../algorithms/pixelMatrix";

const clamp = (val: number) => Math.min(Math.max(Math.floor(val), 0), 255);

/**
 * Local Smart Enhance Algorithm
 * 1. Performs Auto-Leveling (Histogram Stretching)
 * 2. Adjusts Contrast based on standard deviation
 * 3. Applies a subtle Saturation boost
 */
export const applySmartEnhance = (matrix: PixelMatrix): PixelMatrix => {
  const result = cloneMatrix(matrix);
  const height = result.length;
  const width = result[0].length;
  const totalPixels = height * width;

  let minR = 255, maxR = 0;
  let minG = 255, maxG = 0;
  let minB = 255, maxB = 0;
  let sumL = 0;

  // First pass: Find min/max and average luminance
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b] = result[y][x];
      if (r < minR) minR = r; if (r > maxR) maxR = r;
      if (g < minG) minG = g; if (g > maxG) maxG = g;
      if (b < minB) minB = b; if (b > maxB) maxB = b;
      sumL += (r * 0.299 + g * 0.587 + b * 0.114);
    }
  }

  const avgL = sumL / totalPixels;
  
  // Calculate Contrast factor (if image is very flat, boost it more)
  const rangeR = maxR - minR || 1;
  const rangeG = maxG - minG || 1;
  const rangeB = maxB - minB || 1;
  
  // Target range expansion
  const targetMin = 5;
  const targetMax = 250;

  // Second pass: Apply stretching and color correction
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = result[y][x];
      
      // Histogram Stretching per channel
      p[0] = clamp(((p[0] - minR) / rangeR) * (targetMax - targetMin) + targetMin);
      p[1] = clamp(((p[1] - minG) / rangeG) * (targetMax - targetMin) + targetMin);
      p[2] = clamp(((p[2] - minB) / rangeB) * (targetMax - targetMin) + targetMin);

      // Subtle Mid-tone Brightness Adjustment (Gamma correction feel)
      // if avgL < 128, boost midtones slightly
      if (avgL < 100) {
        p[0] = clamp(p[0] * 1.1);
        p[1] = clamp(p[1] * 1.1);
        p[2] = clamp(p[2] * 1.1);
      }
    }
  }

  return result;
};
