import type { PixelMatrix } from '../../types/image.types';

export const applyConvolution = (
  matrix: PixelMatrix,
  kernel: number[][],
  divisor: number = 1,
  bias: number = 0
): PixelMatrix => {
  const height = matrix.length;
  const width = matrix[0].length;
  const newMatrix: PixelMatrix = [];
  
  const kernelHeight = kernel.length;
  const kernelWidth = kernel[0].length;
  const halfY = Math.floor(kernelHeight / 2);
  const halfX = Math.floor(kernelWidth / 2);

  for (let y = 0; y < height; y++) {
    const row: [number, number, number, number][] = [];
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0;
      
      for (let ky = 0; ky < kernelHeight; ky++) {
        for (let kx = 0; kx < kernelWidth; kx++) {
          const pixelY = y + ky - halfY;
          const pixelX = x + kx - halfX;
          
          // Edge clamping
          const clampedY = Math.max(0, Math.min(height - 1, pixelY));
          const clampedX = Math.max(0, Math.min(width - 1, pixelX));
          
          const pixel = matrix[clampedY][clampedX];
          const weight = kernel[ky][kx];
          
          r += pixel[0] * weight;
          g += pixel[1] * weight;
          b += pixel[2] * weight;
        }
      }
      
      r = Math.min(255, Math.max(0, (r / divisor) + bias));
      g = Math.min(255, Math.max(0, (g / divisor) + bias));
      b = Math.min(255, Math.max(0, (b / divisor) + bias));
      
      // alpha unchanged
      row.push([r, g, b, matrix[y][x][3]]);
    }
    newMatrix.push(row);
  }

  return newMatrix;
};
