import React, { useState, useEffect } from 'react';
import { Scissors, CheckCircle2, Loader2, RefreshCw, Palette, Image as ImageIcon } from 'lucide-react';
import { useImageStore } from '../../store/imageStore';
import { applyBackgroundRemoval } from '../../core/filters/backgroundRemoval';
import { matrixToImageData, imageDataToMatrix } from '../../core/algorithms/pixelMatrix';
import { Tooltip } from '../ui/Tooltip';

export const BackgroundRemovalPanel: React.FC = () => {
  const { 
    currentMatrix, 
    isRemovingBackground, 
    setIsRemovingBackground, 
    backgroundRemovedImage, 
    setBackgroundRemovedImage,
    backgroundType,
    setBackgroundType,
    customBackgroundColor,
    setCustomBackgroundColor,
    setPreview,
    applyOperation,
    setActiveTool
  } = useImageStore();

  const [error, setError] = useState<string | null>(null);

  const [blurIntensity, setBlurIntensity] = useState(12);

  useEffect(() => {
    if (backgroundRemovedImage) {
      updatePreview(backgroundType, customBackgroundColor);
    } else {
      setPreview(null);
    }
  }, [backgroundType, customBackgroundColor, backgroundRemovedImage, blurIntensity]);

  const updatePreview = (bgType: string, color: string) => {
    if (!backgroundRemovedImage) return;
    
    if (bgType === 'transparent') {
      setPreview(backgroundRemovedImage);
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = backgroundRemovedImage[0].length;
    canvas.height = backgroundRemovedImage.length;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (bgType === 'blur' && currentMatrix) {
      const origImageData = matrixToImageData(currentMatrix);
      const bgCanvas = document.createElement('canvas');
      bgCanvas.width = canvas.width;
      bgCanvas.height = canvas.height;
      bgCanvas.getContext('2d')!.putImageData(origImageData, 0, 0);

      ctx.filter = `blur(${blurIntensity}px)`;
      ctx.drawImage(bgCanvas, 0, 0);
      ctx.filter = 'none';
    } else {
      ctx.fillStyle = bgType === 'white' ? '#ffffff' : bgType === 'black' ? '#000000' : color;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    const fgImageData = matrixToImageData(backgroundRemovedImage);
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    tempCanvas.getContext('2d')!.putImageData(fgImageData, 0, 0);

    ctx.drawImage(tempCanvas, 0, 0);

    const resultImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const newMatrix = imageDataToMatrix(resultImageData);
    setPreview(newMatrix);
  };

  const handleRemoveBackground = async () => {
    if (!currentMatrix) return;
    
    setIsRemovingBackground(true);
    setError(null);
    try {
      const resultMatrix = await applyBackgroundRemoval(currentMatrix);
      setBackgroundRemovedImage(resultMatrix);
      setBackgroundType('transparent');
    } catch (err) {
      setError("Failed to process background removal. Make sure the image is valid.");
      console.error(err);
    } finally {
      setIsRemovingBackground(false);
    }
  };

  const handleApply = () => {
    const { previewMatrix } = useImageStore.getState();
    if (previewMatrix) {
      applyOperation('Background Removal', previewMatrix);
    } else if (backgroundRemovedImage) {
      applyOperation('Background Removal', backgroundRemovedImage);
    }
    setBackgroundRemovedImage(null);
    setPreview(null);
    setActiveTool(null);
  };

  const handleDiscard = () => {
    setBackgroundRemovedImage(null);
    setPreview(null);
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="px-5 py-4 border-b border-white/[0.04] bg-zinc-900/20">
        <h3 className="text-zinc-100 font-bold uppercase tracking-[0.2em] text-[11px] flex items-center space-x-3">
          <div className="p-1.5 rounded-lg text-indigo-400 bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.1)]">
            <Scissors className="w-4 h-4" />
          </div>
          <span>Background Removal</span>
        </h3>
      </div>

      <div className="px-5 space-y-6">
        {!backgroundRemovedImage ? (
          <div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-4 leading-relaxed">
              Use AI to automatically detect the main subject and remove the background.
            </p>
            
            <button 
              onClick={handleRemoveBackground}
              disabled={isRemovingBackground || !currentMatrix}
              className={`w-full py-3.5 btn-primary flex items-center justify-center space-x-2.5 group ${isRemovingBackground ? 'opacity-70 cursor-wait' : ''}`}
            >
              {isRemovingBackground ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Scissors className="w-4 h-4" />
              )}
              <span className="text-[11px] font-bold uppercase tracking-widest">
                {isRemovingBackground ? 'Processing AI...' : 'Remove Background'}
              </span>
            </button>
            
            {error && (
              <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center space-x-2 text-rose-400">
                <RefreshCw className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-widest">{error}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6">
            <div className="flex items-center space-x-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Background Removed</span>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Replacement Options</label>
              
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'transparent', label: 'Transparent' },
                  { id: 'blur', label: 'Blur BG' },
                  { id: 'white', label: 'White' },
                  { id: 'black', label: 'Black' },
                  { id: 'custom', label: 'Custom Color' }
                ].map((opt, i, arr) => (
                  <button
                    key={opt.id}
                    onClick={() => setBackgroundType(opt.id)}
                    className={`py-2 px-3 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all duration-300 border ${
                      backgroundType === opt.id 
                        ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-400' 
                        : 'bg-zinc-900 border-white/5 text-zinc-400 hover:bg-zinc-800'
                    } ${arr.length % 2 !== 0 && i === arr.length - 1 ? 'col-span-2' : ''}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {backgroundType === 'custom' && (
                <div className="flex items-center space-x-3 mt-3 animate-in fade-in zoom-in-95 duration-300">
                  <Palette className="w-4 h-4 text-zinc-500" />
                  <input 
                    type="color" 
                    value={customBackgroundColor}
                    onChange={(e) => setCustomBackgroundColor(e.target.value)}
                    className="flex-1 h-8 bg-transparent border-none rounded cursor-pointer"
                  />
                </div>
              )}

              {backgroundType === 'blur' && (
                <div className="mt-3 animate-in fade-in zoom-in-95 duration-300">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Blur Intensity</label>
                    <span className="text-[9px] font-mono text-zinc-400 bg-zinc-800/50 px-1.5 py-0.5 rounded">{blurIntensity}px</span>
                  </div>
                  <input 
                    type="range" 
                    min="2" max="30" 
                    value={blurIntensity}
                    onChange={(e) => setBlurIntensity(Number(e.target.value))}
                    className="w-full custom-range"
                  />
                </div>
              )}
            </div>

            <div className="flex space-x-3 pt-6 border-t border-white/[0.05]">
              <button 
                onClick={handleDiscard}
                className="flex-1 py-2.5 btn-secondary text-[11px] uppercase tracking-wider font-bold"
              >
                Discard
              </button>
              <button 
                onClick={handleApply}
                className="flex-1 py-2.5 btn-primary text-[11px] uppercase tracking-wider font-bold"
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
