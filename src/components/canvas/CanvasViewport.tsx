import React, { useRef, useEffect, useState, type MouseEvent, type WheelEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { useImageStore } from '../../store/imageStore';
import { matrixToImageData } from '../../core/algorithms/pixelMatrix';

export const CanvasViewport: React.FC<{ showOriginal?: boolean }> = ({ showOriginal }) => {
  const { currentMatrix, originalMatrix, previewMatrix, imageWidth, imageHeight, isProcessing, zoom, pan, isCropping, setZoom, setPan, isRemovingBackground, filename } = useImageStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  
  const [isPanning, setIsPanning] = useState(false);
  const [startPanPosition, setStartPanPosition] = useState({ x: 0, y: 0 });

  const activeMatrix = showOriginal ? originalMatrix : (previewMatrix || currentMatrix);
  const activeWidth = activeMatrix?.[0]?.length || imageWidth;
  const activeHeight = activeMatrix?.length || imageHeight;

  useEffect(() => {
    if (filename && viewportRef.current && activeWidth && activeHeight) {
      const viewportWidth = viewportRef.current.clientWidth;
      const viewportHeight = viewportRef.current.clientHeight;
      const margin = 40;
      const zoomX = (viewportWidth - margin) / activeWidth;
      const zoomY = (viewportHeight - margin) / activeHeight;
      const newZoom = Math.max(0.1, Math.min(zoomX, zoomY, 1));
      setZoom(newZoom);
      setPan({ x: 0, y: 0 });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filename]);


  useEffect(() => {
    if (activeMatrix && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        const imageData = matrixToImageData(activeMatrix);
        ctx.putImageData(imageData, 0, 0);
      }
    }
  }, [activeMatrix]);



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
      ref={viewportRef}
      className={`w-full h-full relative overflow-hidden bg-transparent flex items-center justify-center ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUpOrLeave}
      onMouseLeave={handleMouseUpOrLeave}
    >
      <div
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
          transition: isPanning ? 'none' : 'transform 0.1s ease-out',
          width: activeWidth,
          height: activeHeight,
        }}
        className="relative shadow-2xl"
      >
        <canvas
          ref={canvasRef}
          width={activeWidth}
          height={activeHeight}
          className="rendering-pixelated absolute inset-0"
        />
        {isRemovingBackground && (
          <div className="absolute inset-0 z-50 overflow-hidden bg-indigo-900/10 backdrop-brightness-110">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-500/20 to-transparent w-full h-[200%] animate-scan" />
            <div className="absolute left-0 right-0 h-0.5 bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,1)] animate-scan-line" />
          </div>
        )}
      </div>

      {isProcessing && !isRemovingBackground && (
        <div className="absolute inset-0 bg-[#09090b]/50 backdrop-blur-sm flex items-center justify-center z-50">
          <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
        </div>
      )}
    </div>
  );
};
