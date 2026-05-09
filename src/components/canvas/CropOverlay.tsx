import React, { useState, useRef } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { Check, X } from 'lucide-react';
import { useImageStore } from '../../store/imageStore';
import { cropMatrix } from '../../core/transforms/geometric';
import type { BoundingBox } from '../../types/image.types';

export const CropOverlay: React.FC = () => {
  const { currentMatrix, imageWidth, imageHeight, zoom, pan, isCropping, toggleCropping, applyOperation } = useImageStore();
  const overlayRef = useRef<HTMLDivElement>(null);
  
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [endX, setEndX] = useState(0);
  const [endY, setEndY] = useState(0);

  if (!isCropping || !currentMatrix) return null;

  // Convert container coordinates to image coordinates
  const containerToImage = (cx: number, cy: number, rect: DOMRect) => {
    const cw = rect.width;
    const ch = rect.height;
    
    const ix = (cx - cw / 2 - pan.x) / zoom + imageWidth / 2;
    const iy = (cy - ch / 2 - pan.y) / zoom + imageHeight / 2;
    
    return { x: ix, y: iy };
  };

  // Convert image coordinates to container coordinates (for rendering the selection box)
  const imageToContainer = (ix: number, iy: number, rect: DOMRect) => {
    const cw = rect.width;
    const ch = rect.height;
    
    const cx = (ix - imageWidth / 2) * zoom + cw / 2 + pan.x;
    const cy = (iy - imageHeight / 2) * zoom + ch / 2 + pan.y;
    
    return { x: cx, y: cy };
  };

  const handleMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!overlayRef.current) return;
    const rect = overlayRef.current.getBoundingClientRect();
    const { x, y } = containerToImage(e.clientX - rect.left, e.clientY - rect.top, rect);
    
    setStartX(x);
    setStartY(y);
    setEndX(x);
    setEndY(y);
    setIsDragging(true);
  };

  const handleMouseMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!isDragging || !overlayRef.current) return;
    const rect = overlayRef.current.getBoundingClientRect();
    const { x, y } = containerToImage(e.clientX - rect.left, e.clientY - rect.top, rect);
    setEndX(x);
    setEndY(y);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const confirmCrop = () => {
    const box: BoundingBox = {
      x: Math.min(startX, endX),
      y: Math.min(startY, endY),
      width: Math.abs(endX - startX),
      height: Math.abs(endY - startY)
    };
    
    // Ensure box has size
    if (box.width > 0 && box.height > 0) {
      const result = cropMatrix(currentMatrix, box);
      applyOperation('Crop', result);
    }
    toggleCropping();
  };

  const cancelCrop = () => {
    toggleCropping();
  };

  // Render variables
  let renderBox = null;
  if (overlayRef.current && (startX !== endX || startY !== endY)) {
    const rect = overlayRef.current.getBoundingClientRect();
    
    const minIX = Math.min(startX, endX);
    const minIY = Math.min(startY, endY);
    const maxIX = Math.max(startX, endX);
    const maxIY = Math.max(startY, endY);
    
    const tl = imageToContainer(minIX, minIY, rect);
    const br = imageToContainer(maxIX, maxIY, rect);
    
    const boxWidth = Math.max(0, br.x - tl.x);
    const boxHeight = Math.max(0, br.y - tl.y);
    
    // Keep it within container bounds for rendering UI nicely
    const left = tl.x;
    const top = tl.y;
    
    renderBox = { left, top, width: boxWidth, height: boxHeight };
  }

  return (
    <div 
      ref={overlayRef}
      className="absolute inset-0 z-40 cursor-crosshair"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {renderBox && (
        <>
          {/* Dark overlay top */}
          <div className="absolute bg-black/60" style={{ top: 0, left: 0, right: 0, height: renderBox.top }} />
          {/* Dark overlay bottom */}
          <div className="absolute bg-black/60" style={{ top: renderBox.top + renderBox.height, left: 0, right: 0, bottom: 0 }} />
          {/* Dark overlay left */}
          <div className="absolute bg-black/60" style={{ top: renderBox.top, left: 0, width: renderBox.left, height: renderBox.height }} />
          {/* Dark overlay right */}
          <div className="absolute bg-black/60" style={{ top: renderBox.top, left: renderBox.left + renderBox.width, right: 0, height: renderBox.height }} />
          
          {/* Selection Box */}
          <div 
            className="absolute border-2 border-white border-dashed shadow-[0_0_0_1px_rgba(0,0,0,0.3)] pointer-events-none"
            style={{ 
              left: renderBox.left, 
              top: renderBox.top, 
              width: renderBox.width, 
              height: renderBox.height 
            }}
          />
          
          {/* Action Bar */}
          {!isDragging && renderBox.width > 20 && renderBox.height > 20 && (
            <div 
              className="absolute bg-slate-800 rounded-md shadow-lg border border-slate-700 flex p-1 space-x-1 z-50 pointer-events-auto"
              style={{ 
                left: renderBox.left + renderBox.width / 2 - 40, 
                top: renderBox.top + renderBox.height + 10 
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <button onClick={confirmCrop} className="p-1.5 hover:bg-green-600/20 text-green-500 rounded transition-colors">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={cancelCrop} className="p-1.5 hover:bg-red-600/20 text-red-500 rounded transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
