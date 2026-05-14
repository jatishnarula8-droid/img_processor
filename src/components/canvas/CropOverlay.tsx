import React, { useState, useRef, useEffect } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { Check, X } from 'lucide-react';
import { useImageStore } from '../../store/imageStore';
import { cropMatrix } from '../../core/transforms/geometric';
import type { BoundingBox } from '../../types/image.types';
import Dock from '../ui/Dock';

const ASPECT_RATIOS = [
  { label: 'Free', ratio: 0 },
  { label: 'Original', ratio: -1 },
  { label: 'Square', ratio: 1 },
  { label: '9:16', ratio: 9/16 },
  { label: '16:9', ratio: 16/9 },
  { label: '4:5', ratio: 4/5 },
  { label: '5:4', ratio: 5/4 },
  { label: '3:4', ratio: 3/4 },
  { label: '4:3', ratio: 4/3 },
  { label: '2:3', ratio: 2/3 },
  { label: '3:2', ratio: 3/2 },
  { label: '5:7', ratio: 5/7 },
  { label: '7:5', ratio: 7/5 },
  { label: '1:2', ratio: 1/2 },
  { label: '2:1', ratio: 2/1 },
];

const RotationSlider: React.FC<{ value: number, onChange: (v: number) => void }> = ({ value, onChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const startValRef = useRef(0);

  const handleMouseDown = (e: ReactMouseEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    startXRef.current = e.clientX;
    startValRef.current = value;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - startXRef.current;
      // 7 pixels per degree to perfectly track the finger (1px line + 6px space)
      // Subtracting dx to make dragging left rotate clockwise (standard UX)
      let newVal = startValRef.current - dx / 7;
      newVal = Math.max(-45, Math.min(45, newVal)); // removed Math.round for smoother internal tracking
      onChange(newVal);
    };
    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
  }, [isDragging, onChange]);

  return (
    <div className="flex flex-col items-center select-none pointer-events-auto" onMouseDown={(e) => e.stopPropagation()}>
      <span className="text-[11px] text-zinc-300 font-mono mb-2 drop-shadow-md">{Math.round(value)} °</span>
      <div 
        ref={containerRef}
        className="w-64 h-8 relative flex items-center justify-center cursor-ew-resize overflow-hidden mask-edges"
        onMouseDown={handleMouseDown}
      >
        <div 
          className="flex items-center space-x-[6px] absolute"
          style={{ transform: `translateX(${-value * 7}px)` }}
        >
          {Array.from({length: 91}).map((_, i) => {
            const val = i - 45;
            const isCenter = val === 0;
            const isMajor = Math.abs(val) % 10 === 0;
            return (
              <div 
                key={i} 
                className={`w-[1px] rounded-full ${isCenter ? 'h-6 bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]' : isMajor ? 'h-3 bg-zinc-400' : 'h-1.5 bg-zinc-600'}`} 
              />
            )
          })}
        </div>
        {/* Center fixed indicator */}
        <div className="absolute w-[3px] h-6 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,1)]" />
      </div>
    </div>
  )
}

export const CropOverlay: React.FC = () => {
  const { currentMatrix, imageWidth, imageHeight, zoom, pan, isCropping, toggleCropping, applyOperation } = useImageStore();
  const overlayRef = useRef<HTMLDivElement>(null);
  
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [endX, setEndX] = useState(0);
  const [endY, setEndY] = useState(0);
  const [activeRatio, setActiveRatio] = useState<number>(0);
  const [rotationAngle, setRotationAngle] = useState<number>(0);
  const { setPreview } = useImageStore.getState();
  const rotationTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const applyRatio = (ratioValue: number) => {
    if (ratioValue === 0) {
      setStartX(0); setStartY(0); setEndX(0); setEndY(0);
      return;
    }
    
    let targetRatio = ratioValue === -1 ? imageWidth / imageHeight : ratioValue;
    
    let newW = imageWidth;
    let newH = imageWidth / targetRatio;
    
    if (newH > imageHeight) {
      newH = imageHeight;
      newW = imageHeight * targetRatio;
    }
    
    const cx = imageWidth / 2;
    const cy = imageHeight / 2;
    
    setStartX(cx - newW / 2);
    setStartY(cy - newH / 2);
    setEndX(cx + newW / 2);
    setEndY(cy + newH / 2);
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
    let { x, y } = containerToImage(e.clientX - rect.left, e.clientY - rect.top, rect);
    
    if (activeRatio !== 0) {
      const targetRatio = activeRatio === -1 ? imageWidth / imageHeight : activeRatio;
      const w = Math.abs(x - startX);
      const h = Math.abs(y - startY);
      
      // Determine dominant axis to maintain ratio smoothly
      if (w / targetRatio > h) {
        y = startY + Math.sign(y - startY) * (w / targetRatio);
      } else {
        x = startX + Math.sign(x - startX) * (h * targetRatio);
      }
    }
    
    setEndX(x);
    setEndY(y);
  };

  const handleRotationChange = (angle: number) => {
    setRotationAngle(angle);
    if (rotationTimeout.current) clearTimeout(rotationTimeout.current);
    rotationTimeout.current = setTimeout(async () => {
      if (angle !== 0) {
        const { rotateMatrix } = await import('../../core/transforms/geometric');
        setPreview(rotateMatrix(currentMatrix, angle));
      } else {
        setPreview(null);
      }
    }, 100);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const confirmCrop = async () => {
    let finalMatrix = currentMatrix;
    
    // Apply rotation first if exists
    if (rotationAngle !== 0) {
      const { rotateMatrix } = await import('../../core/transforms/geometric');
      finalMatrix = rotateMatrix(currentMatrix, rotationAngle);
    }

    const box: BoundingBox = {
      x: Math.max(0, Math.min(startX, endX)),
      y: Math.max(0, Math.min(startY, endY)),
      width: Math.min(finalMatrix[0].length, Math.abs(endX - startX)),
      height: Math.min(finalMatrix.length, Math.abs(endY - startY))
    };
    
    if (box.width > 0 && box.height > 0) {
      const result = cropMatrix(finalMatrix, box);
      applyOperation('Crop & Rotate', result);
    } else if (rotationAngle !== 0) {
      applyOperation('Rotate', finalMatrix);
    }
    
    setPreview(null);
    setRotationAngle(0);
    toggleCropping();
  };

  const cancelCrop = () => {
    setPreview(null);
    setRotationAngle(0);
    toggleCropping();
  };

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
          <div className="absolute bg-black/60" style={{ top: 0, left: 0, right: 0, height: renderBox.top }} />
          <div className="absolute bg-black/60" style={{ top: renderBox.top + renderBox.height, left: 0, right: 0, bottom: 0 }} />
          <div className="absolute bg-black/60" style={{ top: renderBox.top, left: 0, width: renderBox.left, height: renderBox.height }} />
          <div className="absolute bg-black/60" style={{ top: renderBox.top, left: renderBox.left + renderBox.width, right: 0, height: renderBox.height }} />
          
          <div 
            className="absolute border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.3)] pointer-events-none grid grid-cols-3 grid-rows-3"
            style={{ 
              left: renderBox.left, 
              top: renderBox.top, 
              width: renderBox.width, 
              height: renderBox.height 
            }}
          >
            {/* Rule of Thirds Grid */}
            <div className="border-r border-b border-white/30" />
            <div className="border-r border-b border-white/30" />
            <div className="border-b border-white/30" />
            <div className="border-r border-b border-white/30" />
            <div className="border-r border-b border-white/30" />
            <div className="border-b border-white/30" />
            <div className="border-r border-white/30" />
            <div className="border-r border-white/30" />
            <div className="" />
            
            {/* Corner handles purely for visuals */}
            <div className="absolute -top-1 -left-1 w-3 h-3 border-t-4 border-l-4 border-white" />
            <div className="absolute -top-1 -right-1 w-3 h-3 border-t-4 border-r-4 border-white" />
            <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-4 border-l-4 border-white" />
            <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-4 border-r-4 border-white" />
          </div>
          
          {!isDragging && renderBox.width > 20 && renderBox.height > 20 && (
            <div 
              className="absolute bg-zinc-900/90 backdrop-blur-md rounded-xl shadow-2xl border border-white/10 flex p-1 space-x-1 z-50 pointer-events-auto"
              style={{ 
                left: renderBox.left + renderBox.width / 2 - 40, 
                top: Math.max(10, renderBox.top - 50)
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <button onClick={confirmCrop} className="p-2 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition-colors">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={cancelCrop} className="p-2 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}

      {/* Rotation and Aspect Ratio Container */}
      <div 
        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center space-y-6 pointer-events-auto"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Rotation Slider */}
        <RotationSlider value={rotationAngle} onChange={handleRotationChange} />

        {/* Aspect Ratio Toolbar as Dock */}
        <div className="pointer-events-auto max-w-[95vw] overflow-x-auto overflow-y-visible custom-scrollbar pb-6 pt-8 -mt-8 flex justify-center">
          <Dock 
            items={ASPECT_RATIOS.map((ar) => ({
              label: ar.label, // Tooltip on hover
              onClick: () => { setActiveRatio(ar.ratio); applyRatio(ar.ratio); },
              className: activeRatio === ar.ratio 
                ? '!bg-indigo-600/30 !border-indigo-500/50' 
                : '!bg-zinc-900/50 !border-white/5 hover:!bg-white/10',
              icon: (
                <div 
                  className={`border-2 rounded-[3px] transition-all duration-200 ${activeRatio === ar.ratio ? 'border-indigo-400' : 'border-zinc-500'}`}
                  style={{ 
                    width: '18px',
                    height: ar.ratio === 0 ? '18px' : (ar.ratio === -1 ? `${18 / (imageWidth / imageHeight)}px` : `${18 / ar.ratio}px`),
                    maxHeight: '18px',
                    maxWidth: '18px',
                    aspectRatio: ar.ratio === 0 ? '1/1' : (ar.ratio === -1 ? `${imageWidth}/${imageHeight}` : `${ar.ratio}`),
                    borderStyle: ar.ratio === 0 ? 'dashed' : 'solid',
                  }} 
                />
              )
            }))}
            panelHeight={74}
            baseItemSize={58}
            magnification={85}
          />
        </div>
      </div>
    </div>
  );
};
