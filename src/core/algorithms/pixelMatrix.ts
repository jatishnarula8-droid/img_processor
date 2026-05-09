import type { PixelMatrix } from '../../types/image.types';

export const imageDataToMatrix = (imageData: ImageData): PixelMatrix => {
  const { width, height, data } = imageData;
  const matrix: PixelMatrix = [];

  for (let y = 0; y < height; y++) {
    const row: [number, number, number, number][] = [];
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      row.push([data[index], data[index + 1], data[index + 2], data[index + 3]]);
    }
    matrix.push(row);
  }

  return matrix;
};

export const matrixToImageData = (matrix: PixelMatrix): ImageData => {
  if (matrix.length === 0 || matrix[0].length === 0) {
    return new ImageData(1, 1);
  }

  const height = matrix.length;
  const width = matrix[0].length;
  const data = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      const pixel = matrix[y][x];
      data[index] = pixel[0];
      data[index + 1] = pixel[1];
      data[index + 2] = pixel[2];
      data[index + 3] = pixel[3];
    }
  }

  return new ImageData(data, width, height);
};

export const cloneMatrix = (matrix: PixelMatrix): PixelMatrix => {
  return matrix.map(row => row.map(pixel => [...pixel] as [number, number, number, number]));
};

export const getPixel = (matrix: PixelMatrix, x: number, y: number): [number, number, number, number] => {
  if (y < 0 || y >= matrix.length || x < 0 || x >= matrix[0].length) {
    return [0, 0, 0, 0]; // Return transparent black for out-of-bounds
  }
  return matrix[y][x];
};

export const setPixel = (matrix: PixelMatrix, x: number, y: number, color: [number, number, number, number]): void => {
  if (y >= 0 && y < matrix.length && x >= 0 && x < matrix[0].length) {
    matrix[y][x] = [...color] as [number, number, number, number];
  }
};

export const fileToMatrix = async (file: File): Promise<PixelMatrix> => {
  const imageUrl = URL.createObjectURL(file);
  
  const img = new Image();
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = imageUrl;
  });

  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2d context');
  
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, img.width, img.height);
  const matrix = imageDataToMatrix(imageData);

  URL.revokeObjectURL(imageUrl);
  return matrix;
};
