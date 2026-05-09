import type { PixelMatrix, Operation } from '../types/image.types';
import { matrixToImageData } from './algorithms/pixelMatrix';

export const exportAsImage = (
  matrix: PixelMatrix,
  filename: string,
  format: 'png' | 'jpeg' | 'webp' = 'png',
  quality: number = 0.92
): void => {
  const canvas = document.createElement('canvas');
  if (matrix.length === 0 || matrix[0].length === 0) return;
  
  canvas.width = matrix[0].length;
  canvas.height = matrix.length;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  const imageData = matrixToImageData(matrix);
  ctx.putImageData(imageData, 0, 0);
  
  const mimeType = `image/${format}`;
  
  canvas.toBlob(
    (blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${filename}.${format}`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    },
    mimeType,
    quality
  );
};

export const exportAsJSON = (
  undoStack: Operation[],
  filename: string,
  originalWidth: number,
  originalHeight: number
): void => {
  const historyData = {
    filename,
    originalDimensions: { width: originalWidth, height: originalHeight },
    exportTimestamp: new Date().toISOString(),
    operations: undoStack.map(op => op.name),
  };
  
  const jsonString = JSON.stringify(historyData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = `${filename}_history.json`;
  document.body.appendChild(a);
  a.click();
  
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
};

export const computeFileSize = (
  matrix: PixelMatrix,
  format: 'png' | 'jpeg' | 'webp',
  quality: number = 0.92
): Promise<number> => {
  return new Promise((resolve) => {
    if (matrix.length === 0 || matrix[0].length === 0) {
      resolve(0);
      return;
    }
    
    const canvas = document.createElement('canvas');
    canvas.width = matrix[0].length;
    canvas.height = matrix.length;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      resolve(0);
      return;
    }
    
    const imageData = matrixToImageData(matrix);
    ctx.putImageData(imageData, 0, 0);
    
    const mimeType = `image/${format}`;
    
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob.size);
        } else {
          resolve(0);
        }
      },
      mimeType,
      quality
    );
  });
};
