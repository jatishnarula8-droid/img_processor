import { create } from 'zustand';
import type { PixelMatrix, Operation } from '../types/image.types';
import { imageDataToMatrix } from '../core/algorithms/pixelMatrix';

const MAX_HISTORY = 30;

interface ImageStoreState {
  originalMatrix: PixelMatrix | null;
  currentMatrix: PixelMatrix | null;
  imageWidth: number;
  imageHeight: number;
  filename: string | null;
  fileSize: number | null;
  undoStack: Operation[];
  redoStack: Operation[];
  isProcessing: boolean;
  activeFilter: string | null;
  previewMatrix: PixelMatrix | null;
  
  zoom: number;
  pan: { x: number; y: number };
  isCropping: boolean;
  isExportPanelOpen: boolean;
  isBatchPanelOpen: boolean;
  isShortcutsPanelOpen: boolean;
  
  activeTool: string | null;
  setActiveTool: (tool: string | null) => void;
  isRemovingBackground: boolean;
  setIsRemovingBackground: (isRemoving: boolean) => void;
  backgroundRemovedImage: PixelMatrix | null;
  setBackgroundRemovedImage: (image: PixelMatrix | null) => void;
  backgroundType: string;
  setBackgroundType: (type: string) => void;
  customBackgroundColor: string;
  setCustomBackgroundColor: (color: string) => void;
  
  setPreview: (matrix: PixelMatrix | null) => void;
  setZoom: (zoom: number | ((prev: number) => number)) => void;
  setPan: (pan: { x: number; y: number } | ((prev: { x: number; y: number }) => { x: number; y: number })) => void;
  toggleCropping: () => void;
  toggleExportPanel: () => void;
  toggleBatchPanel: () => void;
  toggleShortcutsPanel: () => void;
  setExportPanelOpen: (open: boolean) => void;
  setBatchPanelOpen: (open: boolean) => void;
  setShortcutsPanelOpen: (open: boolean) => void;
  
  loadImage: (file: File) => Promise<void>;
  applyOperation: (name: string, newMatrix: PixelMatrix) => void;
  undo: () => void;
  redo: () => void;
  resetToOriginal: () => void;
  autoEnhance: () => Promise<void>;
}

export const useImageStore = create<ImageStoreState>((set, get) => ({
  originalMatrix: null,
  currentMatrix: null,
  imageWidth: 0,
  imageHeight: 0,
  filename: null,
  fileSize: null,
  undoStack: [],
  redoStack: [],
  isProcessing: false,
  activeFilter: null,
  previewMatrix: null,
  zoom: 1,
  pan: { x: 0, y: 0 },
  isCropping: false,
  isExportPanelOpen: false,
  isBatchPanelOpen: false,
  isShortcutsPanelOpen: false,
  
  activeTool: null,
  isRemovingBackground: false,
  backgroundRemovedImage: null,
  backgroundType: "transparent",
  customBackgroundColor: "#ffffff",

  setPreview: (matrix) => set({ previewMatrix: matrix }),
  setZoom: (zoomOrFn) => set((state) => ({ zoom: typeof zoomOrFn === 'function' ? zoomOrFn(state.zoom) : zoomOrFn })),
  setPan: (panOrFn) => set((state) => ({ pan: typeof panOrFn === 'function' ? panOrFn(state.pan) : panOrFn })),
  toggleCropping: () => set((state) => ({ isCropping: !state.isCropping })),
  toggleExportPanel: () => set((state) => ({ isExportPanelOpen: !state.isExportPanelOpen, isBatchPanelOpen: false, isShortcutsPanelOpen: false })),
  toggleBatchPanel: () => set((state) => ({ isBatchPanelOpen: !state.isBatchPanelOpen, isExportPanelOpen: false, isShortcutsPanelOpen: false })),
  toggleShortcutsPanel: () => set((state) => ({ isShortcutsPanelOpen: !state.isShortcutsPanelOpen, isExportPanelOpen: false, isBatchPanelOpen: false })),
  setExportPanelOpen: (open) => set({ isExportPanelOpen: open, isBatchPanelOpen: false, isShortcutsPanelOpen: false }),
  setBatchPanelOpen: (open) => set({ isBatchPanelOpen: open, isExportPanelOpen: false, isShortcutsPanelOpen: false }),
  setShortcutsPanelOpen: (open) => set({ isShortcutsPanelOpen: open, isExportPanelOpen: false, isBatchPanelOpen: false }),

  setActiveTool: (tool) => set({ activeTool: tool }),
  setIsRemovingBackground: (isRemoving) => set({ isRemovingBackground: isRemoving }),
  setBackgroundRemovedImage: (image) => set({ backgroundRemovedImage: image }),
  setBackgroundType: (type) => set({ backgroundType: type }),
  setCustomBackgroundColor: (color) => set({ customBackgroundColor: color }),

  loadImage: async (file: File) => {
    set({ isProcessing: true });
    try {
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

      set({
        originalMatrix: matrix,
        currentMatrix: matrix,
        imageWidth: img.width,
        imageHeight: img.height,
        filename: file.name,
        fileSize: file.size,
        undoStack: [],
        redoStack: [],
        activeFilter: null,
        zoom: 1,
        pan: { x: 0, y: 0 },
        isCropping: false,
        activeTool: null,
        backgroundRemovedImage: null,
      });
    } catch (error) {
      console.error('Error loading image:', error);
    } finally {
      set({ isProcessing: false });
    }
  },

  applyOperation: (name: string, newMatrix: PixelMatrix) => {
    const { currentMatrix, undoStack } = get();
    if (!currentMatrix) return;

    const newOperation: Operation = {
      name,
      snapshot: currentMatrix,
    };

    set({
      currentMatrix: newMatrix,
      previewMatrix: null,
      imageWidth: newMatrix[0]?.length || 0,
      imageHeight: newMatrix.length || 0,
      undoStack: [...undoStack, newOperation].slice(-MAX_HISTORY),
      redoStack: [],
    });
  },

  undo: () => {
    const { currentMatrix, undoStack, redoStack } = get();
    if (undoStack.length === 0 || !currentMatrix) return;

    const lastOp = undoStack[undoStack.length - 1];
    const newUndoStack = undoStack.slice(0, -1);
    
    const redoOp: Operation = {
      name: lastOp.name,
      snapshot: currentMatrix,
    };

    set({
      currentMatrix: lastOp.snapshot,
      previewMatrix: null,
      imageWidth: lastOp.snapshot[0]?.length || 0,
      imageHeight: lastOp.snapshot.length || 0,
      undoStack: newUndoStack,
      redoStack: [...redoStack, redoOp].slice(-MAX_HISTORY),
    });
  },

  redo: () => {
    const { currentMatrix, undoStack, redoStack } = get();
    if (redoStack.length === 0 || !currentMatrix) return;

    const nextOp = redoStack[redoStack.length - 1];
    const newRedoStack = redoStack.slice(0, -1);

    const undoOp: Operation = {
      name: nextOp.name,
      snapshot: currentMatrix,
    };

    set({
      currentMatrix: nextOp.snapshot,
      previewMatrix: null,
      imageWidth: nextOp.snapshot[0]?.length || 0,
      imageHeight: nextOp.snapshot.length || 0,
      undoStack: [...undoStack, undoOp].slice(-MAX_HISTORY),
      redoStack: newRedoStack,
    });
  },

  resetToOriginal: () => {
    const { originalMatrix } = get();
    if (!originalMatrix) return;

    set({
      currentMatrix: originalMatrix,
      previewMatrix: null,
      imageWidth: originalMatrix[0]?.length || 0,
      imageHeight: originalMatrix.length || 0,
      undoStack: [],
      redoStack: [],
      activeFilter: null,
      zoom: 1,
      pan: { x: 0, y: 0 },
      isCropping: false,
    });
  },

  autoEnhance: async () => {
    const { currentMatrix, applyOperation } = get();
    if (!currentMatrix) return;

    set({ isProcessing: true });
    
    // Artificial delay to feel "pro" and ensure UI updates
    await new Promise(r => setTimeout(r, 600));

    try {
      // Use local Smart Enhance algorithm (No API required)
      const { applySmartEnhance } = await import('../core/filters/smartEnhance');
      const enhancedMatrix = applySmartEnhance(currentMatrix);
      
      applyOperation('Auto Enhance (Local)', enhancedMatrix);
    } catch (error) {
      console.error('Auto Enhance failed:', error);
      alert('Local enhancement failed. Please try manual adjustments.');
    } finally {
      set({ isProcessing: false });
    }
  },
}));
