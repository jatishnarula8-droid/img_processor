export type PixelMatrix = [number, number, number, number][][];

export interface ImageState {
  originalMatrix: PixelMatrix | null;
  currentMatrix: PixelMatrix | null;
  width: number;
  height: number;
  filename: string | null;
}

export interface Operation {
  name: string;
  snapshot: PixelMatrix;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}
