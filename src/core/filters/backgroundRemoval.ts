import { removeBackground } from '@imgly/background-removal';
import { matrixToImageData, imageDataToMatrix } from '../algorithms/pixelMatrix';
import type { PixelMatrix } from '../../types/image.types';

export const applyBackgroundRemoval = async (matrix: PixelMatrix): Promise<PixelMatrix> => {
  if (matrix.length === 0 || matrix[0].length === 0) return matrix;

  const canvas = document.createElement('canvas');
  canvas.width = matrix[0].length;
  canvas.height = matrix.length;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error("Could not create canvas context");

  const imageData = matrixToImageData(matrix);
  ctx.putImageData(imageData, 0, 0);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), 'image/png');
  });

  if (!blob) throw new Error("Could not convert canvas to blob");

  const resultBlob = await removeBackground(blob);

  const url = URL.createObjectURL(resultBlob);
  const img = new Image();
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = url;
  });

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);
  const resultImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const resultMatrix = imageDataToMatrix(resultImageData);

  URL.revokeObjectURL(url);
  
  return resultMatrix;
};
