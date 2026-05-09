import React, { useRef, useEffect, useState, type MouseEvent, type WheelEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { useImageStore } from '../../store/imageStore';
import { matrixToImageData } from '../../core/algorithms/pixelMatrix';

export const CanvasViewport: React.FC<{ showOriginal?: boolean }> = ({ showOriginal }) => {
  const { currentMatrix, originalMatrix, previewMatrix, imageWidth, imageHeight, isProcessing, zoom, pan, isCropping, setZoom, setPan } = useImageStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [isPanning, setIsPanning] = useState(false);
  const [startPanPosition, setStartPanPosition] = useState({ x: 0, y: 0 });

  const activeMatrix = showOriginal ? originalMatrix : (previewMatrix || currentMatrix);
  const activeWidth = activeMatrix?.[0]?.length || imageWidth;
  const activeHeight = activeMatrix?.length || imageHeight;

  useEffect(() => {
    if (activeMatrix && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        const imageData = matrixToImageData(activeMatrix);
        ctx.putImageData(imageData, 0, 0);
      }
    }
  }, [activeMatrix]);

  const handleWheel = (e: WheelEvent<HTMLDivElement>) => {
    if (isCropping) return;
    const zoomFactor = 1.1;
    setZoom((prevZoom) => {
      let newZoom = prevZoom;
      if (e.deltaY < 0) {
        newZoom = prevZoom * zoomFactor;
      } else {
        newZoom = prevZoom / zoomFactor;
      }
      return Math.min(Math.max(newZoom, 0.1), 10);
    });
  };

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (isCropping) return;
    setIsPanning(true);
    setStartPanPosition({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (isCropping || !isPanning) return;
    setPan({
      x: e.clientX - startPanPosition.x,
      y: e.clientY - startPanPosition.y,
    });
  };

  const handleMouseUpOrLeave = () => {
    setIsPanning(false);
  };

  return (
    <div 
      className={`w-full h-full relative overflow-hidden bg-slate-900 flex items-center justify-center ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUpOrLeave}
      onMouseLeave={handleMouseUpOrLeave}
    >
      <canvas
        ref={canvasRef}
        width={activeWidth}
        height={activeHeight}
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
          // We disable transition while panning for immediate 1:1 mouse tracking
          transition: isPanning ? 'none' : 'transform 0.1s ease-out',
        }}
        className="shadow-2xl max-w-none rendering-pixelated"
      />
      {isProcessing && (
        <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center z-50">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
        </div>
      )}
    </div>
  );
};
