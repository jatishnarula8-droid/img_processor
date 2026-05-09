import type { PixelMatrix } from '../../types/image.types';
import { applyConvolution } from '../algorithms/convolution';

export const applyGaussianBlur = (matrix: PixelMatrix, radiusLevel: 'small' | 'medium' | 'large'): PixelMatrix => {
  const smallKernel = [
    [1, 2, 1],
    [2, 4, 2],
    [1, 2, 1]
  ];
  
  const mediumKernel = [
    [1, 4, 6, 4, 1],
    [4, 16, 24, 16, 4],
    [6, 24, 36, 24, 6],
    [4, 16, 24, 16, 4],
    [1, 4, 6, 4, 1]
  ];

  if (radiusLevel === 'small') {
    return applyConvolution(matrix, smallKernel, 16);
  } else if (radiusLevel === 'medium') {
    return applyConvolution(matrix, mediumKernel, 256);
  } else if (radiusLevel === 'large') {
    let result = applyConvolution(matrix, smallKernel, 16);
    result = applyConvolution(result, smallKernel, 16);
    result = applyConvolution(result, smallKernel, 16);
    return result;
  }
  
  return matrix;
};

export const applySharpen = (matrix: PixelMatrix): PixelMatrix => {
  const kernel = [
    [0, -1, 0],
    [-1, 5, -1],
    [0, -1, 0]
  ];
  return applyConvolution(matrix, kernel, 1);
};

export const applyUnsharpMask = (matrix: PixelMatrix, strength: number): PixelMatrix => {
  const blurred = applyGaussianBlur(matrix, 'small');
  const height = matrix.length;
  const width = matrix[0].length;
  const newMatrix: PixelMatrix = [];
  
  for (let y = 0; y < height; y++) {
    const row: [number, number, number, number][] = [];
    for (let x = 0; x < width; x++) {
      const orig = matrix[y][x];
      const blur = blurred[y][x];
      
      const r = Math.min(255, Math.max(0, orig[0] + strength * (orig[0] - blur[0])));
      const g = Math.min(255, Math.max(0, orig[1] + strength * (orig[1] - blur[1])));
      const b = Math.min(255, Math.max(0, orig[2] + strength * (orig[2] - blur[2])));
      
      row.push([r, g, b, orig[3]]);
    }
    newMatrix.push(row);
  }
  
  return newMatrix;
};

export const applyEdgeDetection = (matrix: PixelMatrix): PixelMatrix => {
  const hKernel = [
    [-1, 0, 1],
    [-2, 0, 2],
    [-1, 0, 1]
  ];
  
  const vKernel = [
    [-1, -2, -1],
    [0, 0, 0],
    [1, 2, 1]
  ];
  
  const hResult = applyConvolution(matrix, hKernel, 1);
  const vResult = applyConvolution(matrix, vKernel, 1);
  
  const height = matrix.length;
  const width = matrix[0].length;
  const newMatrix: PixelMatrix = [];
  
  for (let y = 0; y < height; y++) {
    const row: [number, number, number, number][] = [];
    for (let x = 0; x < width; x++) {
      const h = hResult[y][x];
      const v = vResult[y][x];
      const orig = matrix[y][x];
      
      const r = Math.sqrt(h[0] * h[0] + v[0] * v[0]);
      const g = Math.sqrt(h[1] * h[1] + v[1] * v[1]);
      const b = Math.sqrt(h[2] * h[2] + v[2] * v[2]);
      
      const gray = Math.min(255, Math.max(0, (r + g + b) / 3));
      
      row.push([gray, gray, gray, orig[3]]);
    }
    newMatrix.push(row);
  }
  
  return newMatrix;
};

export const applyEmboss = (matrix: PixelMatrix): PixelMatrix => {
  const kernel = [
    [-2, -1, 0],
    [-1, 1, 1],
    [0, 1, 2]
  ];
  return applyConvolution(matrix, kernel, 1, 128);
};
