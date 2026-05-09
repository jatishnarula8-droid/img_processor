import type { PixelMatrix, BoundingBox } from '../../types/image.types';

export const cropMatrix = (matrix: PixelMatrix, box: BoundingBox): PixelMatrix => {
  if (matrix.length === 0 || matrix[0].length === 0) return matrix;
  
  const height = matrix.length;
  const width = matrix[0].length;
  
  // Bounds checking
  const startX = Math.max(0, Math.floor(box.x));
  const startY = Math.max(0, Math.floor(box.y));
  const endX = Math.min(width, Math.floor(box.x + box.width));
  const endY = Math.min(height, Math.floor(box.y + box.height));
  
  if (startX >= endX || startY >= endY) return matrix;
  
  const newMatrix: PixelMatrix = [];
  for (let y = startY; y < endY; y++) {
    newMatrix.push(matrix[y].slice(startX, endX));
  }
  
  return newMatrix;
};

export const flipHorizontal = (matrix: PixelMatrix): PixelMatrix => {
  return matrix.map(row => [...row].reverse());
};

export const flipVertical = (matrix: PixelMatrix): PixelMatrix => {
  return [...matrix].reverse().map(row => [...row]);
};

export const bilinearInterpolate = (
  matrix: PixelMatrix,
  x: number,
  y: number
): [number, number, number, number] => {
  const height = matrix.length;
  const width = matrix[0].length;
  
  const x1 = Math.floor(x);
  const y1 = Math.floor(y);
  const x2 = Math.min(width - 1, x1 + 1);
  const y2 = Math.min(height - 1, y1 + 1);
  
  const dx = x - x1;
  const dy = y - y1;
  
  // Safe array access
  const p11 = matrix[y1]?.[x1] || [0, 0, 0, 0];
  const p21 = matrix[y1]?.[x2] || [0, 0, 0, 0];
  const p12 = matrix[y2]?.[x1] || [0, 0, 0, 0];
  const p22 = matrix[y2]?.[x2] || [0, 0, 0, 0];
  
  const w11 = (1 - dx) * (1 - dy);
  const w21 = dx * (1 - dy);
  const w12 = (1 - dx) * dy;
  const w22 = dx * dy;
  
  const r = Math.round(p11[0] * w11 + p21[0] * w21 + p12[0] * w12 + p22[0] * w22);
  const g = Math.round(p11[1] * w11 + p21[1] * w21 + p12[1] * w12 + p22[1] * w22);
  const b = Math.round(p11[2] * w11 + p21[2] * w21 + p12[2] * w12 + p22[2] * w22);
  const a = Math.round(p11[3] * w11 + p21[3] * w21 + p12[3] * w12 + p22[3] * w22);
  
  return [r, g, b, a];
};

export const rotateMatrix = (matrix: PixelMatrix, degrees: number): PixelMatrix => {
  if (matrix.length === 0 || matrix[0].length === 0) return matrix;
  
  // Normalize angle to [0, 360)
  let angle = degrees % 360;
  if (angle < 0) angle += 360;
  
  const height = matrix.length;
  const width = matrix[0].length;
  
  // Fast paths for exact multiples of 90
  // Note: 90 clockwise
  if (Math.abs(angle - 90) < 0.01) {
    const newMatrix: PixelMatrix = [];
    for (let x = 0; x < width; x++) {
      const newRow: [number, number, number, number][] = [];
      for (let y = height - 1; y >= 0; y--) {
        newRow.push([...matrix[y][x]]);
      }
      newMatrix.push(newRow);
    }
    return newMatrix;
  }
  
  if (Math.abs(angle - 180) < 0.01) {
    return flipHorizontal(flipVertical(matrix));
  }
  
  // 270 clockwise
  if (Math.abs(angle - 270) < 0.01) {
    const newMatrix: PixelMatrix = [];
    for (let x = width - 1; x >= 0; x--) {
      const newRow: [number, number, number, number][] = [];
      for (let y = 0; y < height; y++) {
        newRow.push([...matrix[y][x]]);
      }
      newMatrix.push(newRow);
    }
    return newMatrix;
  }
  
  // Free rotation
  const rad = -angle * Math.PI / 180; // Negative because image y axis is down
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  
  // Compute bounding box
  const cx_in = width / 2;
  const cy_in = height / 2;
  
  const corners = [
    [-cx_in, -cy_in],
    [cx_in, -cy_in],
    [cx_in, cy_in],
    [-cx_in, cy_in]
  ];
  
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  
  for (const [x, y] of corners) {
    const rx = x * cos - y * sin;
    const ry = x * sin + y * cos;
    minX = Math.min(minX, rx);
    maxX = Math.max(maxX, rx);
    minY = Math.min(minY, ry);
    maxY = Math.max(maxY, ry);
  }
  
  const outWidth = Math.ceil(maxX - minX);
  const outHeight = Math.ceil(maxY - minY);
  const cx_out = outWidth / 2;
  const cy_out = outHeight / 2;
  
  const newMatrix: PixelMatrix = [];
  
  // Inverse rotation: to find the source pixel for output pixel (xo, yo)
  // we rotate (xo, yo) by -rad (which is +angle)
  const invRad = angle * Math.PI / 180;
  const invCos = Math.cos(invRad);
  const invSin = Math.sin(invRad);
  
  for (let yo = 0; yo < outHeight; yo++) {
    const newRow: [number, number, number, number][] = [];
    for (let xo = 0; xo < outWidth; xo++) {
      const dx = xo - cx_out;
      const dy = yo - cy_out;
      
      const sx = dx * invCos - dy * invSin + cx_in;
      const sy = dx * invSin + dy * invCos + cy_in;
      
      if (sx >= 0 && sx <= width - 1 && sy >= 0 && sy <= height - 1) {
        newRow.push(bilinearInterpolate(matrix, sx, sy));
      } else {
        newRow.push([0, 0, 0, 0]); // Transparent pixel outside bounds
      }
    }
    newMatrix.push(newRow);
  }
  
  return newMatrix;
};

export const scaleMatrix = (matrix: PixelMatrix, scaleFactor: number): PixelMatrix => {
  if (matrix.length === 0 || matrix[0].length === 0 || scaleFactor === 1) return matrix;

  const height = matrix.length;
  const width = matrix[0].length;
  const newHeight = Math.round(height * scaleFactor);
  const newWidth = Math.round(width * scaleFactor);
  
  if (newHeight === 0 || newWidth === 0) return [[]];

  const newMatrix: PixelMatrix = [];

  if (scaleFactor > 1) {
    // Upscale: Bilinear Interpolation
    for (let y = 0; y < newHeight; y++) {
      const newRow: [number, number, number, number][] = [];
      const sy = y / scaleFactor;
      for (let x = 0; x < newWidth; x++) {
        const sx = x / scaleFactor;
        newRow.push(bilinearInterpolate(matrix, sx, sy));
      }
      newMatrix.push(newRow);
    }
  } else {
    // Downscale: Area Averaging
    const factor = 1 / scaleFactor;
    for (let y = 0; y < newHeight; y++) {
      const newRow: [number, number, number, number][] = [];
      const startY = y * factor;
      const endY = Math.min((y + 1) * factor, height);
      for (let x = 0; x < newWidth; x++) {
        const startX = x * factor;
        const endX = Math.min((x + 1) * factor, width);
        
        let r = 0, g = 0, b = 0, a = 0;
        let totalWeight = 0;

        for (let iy = Math.floor(startY); iy < Math.ceil(endY); iy++) {
          const yWeight = Math.min(iy + 1, endY) - Math.max(iy, startY);
          for (let ix = Math.floor(startX); ix < Math.ceil(endX); ix++) {
            const xWeight = Math.min(ix + 1, endX) - Math.max(ix, startX);
            const weight = yWeight * xWeight;
            
            const pixel = matrix[iy][ix];
            r += pixel[0] * weight;
            g += pixel[1] * weight;
            b += pixel[2] * weight;
            a += pixel[3] * weight;
            totalWeight += weight;
          }
        }
        
        if (totalWeight > 0) {
          newRow.push([
            Math.round(r / totalWeight),
            Math.round(g / totalWeight),
            Math.round(b / totalWeight),
            Math.round(a / totalWeight)
          ]);
        } else {
          newRow.push([0, 0, 0, 0]);
        }
      }
      newMatrix.push(newRow);
    }
  }

  return newMatrix;
};
