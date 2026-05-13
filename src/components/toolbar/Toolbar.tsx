import React, { useState } from 'react';
import { 
  ChevronDown, SlidersHorizontal, Wand2, Layers, Undo2, Crop, Sparkles, Loader2, 
  RotateCw, RotateCcw, FlipHorizontal, FlipVertical, Maximize, Minus, Plus, Scissors, Palette
} from 'lucide-react';
import { Slider } from '../ui/Slider';
import { Tooltip } from '../ui/Tooltip';
import { useImageStore } from '../../store/imageStore';
import { applyBrightness, applyContrast, applySaturation } from '../../core/filters/adjustments';
import { applyGaussianBlur, applySharpen, applyUnsharpMask, applyEdgeDetection, applyEmboss } from '../../core/filters/convolutionFilters';
import { applyGrayscale, applySepia, applyInvert } from '../../core/filters/colorFilters';
import { rotateMatrix, flipHorizontal, flipVertical } from '../../core/transforms/geometric';
import type { PixelMatrix } from '../../types/image.types';

interface SectionProps {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const Section: React.FC<SectionProps> = ({ title, icon: Icon, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-white/[0.04]">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-all duration-300"
      >
        <div className="flex items-center space-x-3">
          <div className={`p-1.5 rounded-lg transition-all duration-500 ${isOpen ? 'text-indigo-400 bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.1)]' : 'text-zinc-500 bg-zinc-800/30'}`}>
            <Icon className="w-4 h-4" />
          </div>
          <span className={`font-bold text-[11px] uppercase tracking-[0.15em] transition-colors duration-300 ${isOpen ? 'text-zinc-100' : 'text-zinc-500'}`}>{title}</span>
        </div>
        <div className={`transition-transform duration-500 ${isOpen ? 'rotate-180' : 'rotate-0'}`}>
          <ChevronDown className={`w-4 h-4 ${isOpen ? 'text-indigo-400' : 'text-zinc-600'}`} />
        </div>
      </button>
      <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="px-5 pb-6 pt-1">
          {children}
        </div>
      </div>
    </div>
  );
};

export const Toolbar: React.FC = () => {
  const { 
    currentMatrix, applyOperation, setPreview, undo, undoStack, 
    isCropping, toggleCropping, autoEnhance, isProcessing,
    activeTool, setActiveTool, zoom, setZoom
  } = useImageStore();
  
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [saturation, setSaturation] = useState(0);

  const [blurIntensity, setBlurIntensity] = useState<'small' | 'medium' | 'large'>('small');
  const [unsharpMaskStrength, setUnsharpMaskStrength] = useState(1);
  
  const [freeRotateAngle, setFreeRotateAngle] = useState(0);
  const [showFreeRotate, setShowFreeRotate] = useState(false);

  const applyFilter = (filterFn: (matrix: PixelMatrix) => PixelMatrix, name: string) => {
    if (!currentMatrix) return;
    useImageStore.setState({ isProcessing: true });
    
    setTimeout(() => {
      try {
        const result = filterFn(currentMatrix);
        applyOperation(name, result);
      } catch (error) {
        console.error(`Error applying filter ${name}:`, error);
      } finally {
        useImageStore.setState({ isProcessing: false });
      }
    }, 50);
  };

  const handlePreview = (b: number, c: number, s: number) => {
    if (!currentMatrix) return;
    
    if (b === 0 && c === 0 && s === 0) {
      setPreview(null);
      return;
    }

    let m = currentMatrix;
    // Apply filters sequentially for the preview
    if (b !== 0) m = applyBrightness(m, b);
    if (c !== 0) m = applyContrast(m, c);
    if (s !== 0) m = applySaturation(m, s);
    setPreview(m);
  };

  const handleBrightnessChange = (val: number) => {
    setBrightness(val);
    handlePreview(val, contrast, saturation);
  };

  const handleContrastChange = (val: number) => {
    setContrast(val);
    handlePreview(brightness, val, saturation);
  };

  const handleSaturationChange = (val: number) => {
    setSaturation(val);
    handlePreview(brightness, contrast, val);
  };

  const applyAdjustments = () => {
    const { previewMatrix } = useImageStore.getState();
    if (previewMatrix) {
      applyOperation('Adjustments', previewMatrix);
      setPreview(null);
      setBrightness(0);
      setContrast(0);
      setSaturation(0);
    }
  };

  const cancelAdjustments = () => {
    setPreview(null);
    setBrightness(0);
    setContrast(0);
    setSaturation(0);
  };

  const hasAdjustments = brightness !== 0 || contrast !== 0 || saturation !== 0;

  return (
    <div className="w-[300px] h-full bg-[#0c0c0e] border-r border-white/5 flex flex-col overflow-y-auto shrink-0 z-10 custom-scrollbar">
      <div className="p-5 border-b border-white/5 flex justify-between items-center bg-zinc-900/20">
        <div className="flex items-center space-x-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 glow-indigo animate-pulse-soft" />
          <h2 className="text-[11px] font-black text-zinc-400 tracking-[0.2em] uppercase">Control Engine</h2>
        </div>
        <Tooltip content="Quick Undo">
          <button 
            onClick={undo} 
            disabled={undoStack.length === 0}
            className={`p-2 rounded-xl transition-all duration-300 ${undoStack.length > 0 ? 'text-zinc-400 hover:text-indigo-400 hover:bg-indigo-500/10' : 'text-zinc-800 cursor-not-allowed'}`}
          >
            <Undo2 className="w-4 h-4" />
          </button>
        </Tooltip>
      </div>

      <Section title="Adjustments" icon={SlidersHorizontal} defaultOpen={true}>
        <div className="mb-8">
          <Tooltip content="Intelligent AI Enhancement">
            <button 
              onClick={autoEnhance}
              disabled={isProcessing || !currentMatrix}
              className={`w-full py-3.5 btn-primary flex items-center justify-center space-x-2.5 group ${isProcessing ? 'opacity-70 cursor-wait' : ''}`}
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform duration-500" />
              )}
              <span className="text-[11px] font-bold uppercase tracking-widest">{isProcessing ? 'Analyzing...' : 'Auto Enhance'}</span>
            </button>
          </Tooltip>
        </div>

        <div className="space-y-2">
          <Slider 
            label="Brightness" min={-100} max={100} value={brightness} 
            onChange={handleBrightnessChange} onReset={() => handleBrightnessChange(0)} 
          />
          <Slider 
            label="Contrast" min={-100} max={100} value={contrast} 
            onChange={handleContrastChange} onReset={() => handleContrastChange(0)} 
          />
          <Slider 
            label="Saturation" min={-100} max={100} value={saturation} 
            onChange={handleSaturationChange} onReset={() => handleSaturationChange(0)} 
          />
        </div>

        {hasAdjustments && (
          <div className="flex space-x-3 mt-8 pt-6 border-t border-white/[0.05] animate-in fade-in zoom-in-95 duration-300">
            <button 
              onClick={cancelAdjustments}
              className="flex-1 py-2.5 btn-secondary text-[11px] uppercase tracking-wider font-bold"
            >
              Discard
            </button>
            <button 
              onClick={applyAdjustments}
              className="flex-1 py-2.5 btn-primary text-[11px] uppercase tracking-wider font-bold"
            >
              Apply
            </button>
          </div>
        )}
      </Section>

      <Section title="View Controls" icon={Maximize} defaultOpen={true}>
        <div className="space-y-2">
          <Slider 
            label="Magnification" min={0.1} max={5} step={0.1} value={zoom} 
            onChange={(val) => setZoom(val)} onReset={zoom !== 1 ? () => setZoom(1) : undefined} 
          />
        </div>
      </Section>

      <Section title="AI Tools" icon={Scissors} defaultOpen={false}>
        <button 
          onClick={() => setActiveTool(activeTool === 'background_remove' ? null : 'background_remove')}
          className={`w-full py-3 flex items-center justify-center space-x-2.5 text-[11px] font-bold uppercase tracking-widest rounded-xl transition-all duration-300 border ${activeTool === 'background_remove' ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'btn-secondary'}`}
        >
          <Scissors className="w-4 h-4" />
          <span>{activeTool === 'background_remove' ? 'Exit BG Remove' : 'Background Remove'}</span>
        </button>
      </Section>

      <Section title="Geometry" icon={Layers} defaultOpen={true}>
        <div className="space-y-6">
          <div>
            <Tooltip content="Freeform Crop">
              <button 
                onClick={toggleCropping}
                className={`w-full py-3 flex items-center justify-center space-x-2.5 text-[11px] font-bold uppercase tracking-widest rounded-xl transition-all duration-300 border ${isCropping ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'btn-secondary'}`}
              >
                <Crop className="w-4 h-4" />
                <span>{isCropping ? 'Exit Crop' : 'Crop Image'}</span>
              </button>
            </Tooltip>
          </div>
          
          <div className="pt-4">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4 block">Rotation & Orientation</label>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { label: '90° CW', icon: RotateCw, fn: () => rotateMatrix(currentMatrix!, 90), name: 'Rotate 90° CW' },
                { label: '90° CCW', icon: RotateCcw, fn: () => rotateMatrix(currentMatrix!, 270), name: 'Rotate 90° CCW' },
                { label: 'Free', icon: Maximize, isFree: true }
              ].map((item, idx) => (
                <Tooltip key={idx} content={item.label}>
                  <button 
                    onClick={() => item.isFree ? setShowFreeRotate(!showFreeRotate) : applyFilter(item.fn!, item.name!)} 
                    className={`aspect-square flex items-center justify-center btn-secondary group ${item.isFree && showFreeRotate ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-400' : ''}`}
                  >
                    {item.icon && <item.icon className={`w-4 h-4 group-hover:scale-110 transition-transform duration-300`} />}
                  </button>
                </Tooltip>
              ))}
            </div>
            
            {showFreeRotate && (
              <div className="mt-4 p-4 premium-card rounded-xl animate-in slide-in-from-top-2 duration-300">
                <Slider 
                  label="Free Angle" min={-180} max={180} value={freeRotateAngle} 
                  onChange={(val) => {
                    setFreeRotateAngle(val);
                    if (currentMatrix) setPreview(rotateMatrix(currentMatrix, val));
                  }} 
                  onReset={() => {
                    setFreeRotateAngle(0);
                    setPreview(null);
                  }} 
                />
                <div className="flex space-x-2 mt-4">
                  <button 
                    onClick={() => { setFreeRotateAngle(0); setPreview(null); setShowFreeRotate(false); }}
                    className="flex-1 py-2 btn-secondary text-[10px] uppercase font-bold"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => {
                      applyFilter((m) => rotateMatrix(m, freeRotateAngle), `Rotate ${freeRotateAngle}°`);
                      setFreeRotateAngle(0); setPreview(null); setShowFreeRotate(false);
                    }}
                    className="flex-1 py-2 btn-primary text-[10px] uppercase font-bold"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <div className="pt-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4 block">Reflections</label>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => applyFilter(flipHorizontal, 'Flip Horizontal')} className="w-full py-3 btn-secondary flex items-center justify-center space-x-2 group">
                <FlipHorizontal className="w-4 h-4 group-hover:scale-x-[-1] transition-transform duration-500" />
                <span className="text-[11px] font-bold uppercase tracking-wider">Horizontal</span>
              </button>
              <button onClick={() => applyFilter(flipVertical, 'Flip Vertical')} className="w-full py-3 btn-secondary flex items-center justify-center space-x-2 group">
                <FlipVertical className="w-4 h-4 group-hover:scale-y-[-1] transition-transform duration-500" />
                <span className="text-[11px] font-bold uppercase tracking-wider">Vertical</span>
              </button>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Color Filters" icon={Palette} defaultOpen={true}>
        <div className="grid grid-cols-2 gap-3">
          {[
            { name: 'Grayscale', fn: applyGrayscale },
            { name: 'Sepia', fn: applySepia },
            { name: 'Invert', fn: applyInvert }
          ].map((f, idx) => (
            <button 
              key={idx}
              onClick={() => applyFilter(f.fn, f.name)} 
              className="w-full py-3 btn-secondary flex items-center justify-center space-x-2 group"
            >
              <Palette className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" />
              <span className="text-[11px] font-bold uppercase tracking-wider">{f.name}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="FX Filters" icon={Wand2} defaultOpen={true}>
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3">
            {[
              { name: 'Sharpen', icon: Plus, fn: applySharpen },
              { name: 'Blur', icon: Minus, fn: (m: PixelMatrix) => applyGaussianBlur(m, blurIntensity) },
              { name: 'Edges', icon: Layers, fn: applyEdgeDetection },
              { name: 'Emboss', icon: Maximize, fn: applyEmboss }
            ].map((f, idx) => (
              <button 
                key={idx}
                onClick={() => applyFilter(f.fn, f.name)} 
                className="w-full py-3 btn-secondary flex items-center justify-center space-x-2 group"
              >
                <f.icon className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" />
                <span className="text-[11px] font-bold uppercase tracking-wider">{f.name}</span>
              </button>
            ))}
          </div>
          
          <div className="pt-4 border-t border-white/[0.04]">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4 block">Blur Intensity</label>
            <div className="flex bg-black/40 rounded-xl p-1 border border-white/[0.04]">
              {(['small', 'medium', 'large'] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => setBlurIntensity(level)}
                  className={`flex-1 text-[10px] font-bold uppercase tracking-[0.1em] py-2 rounded-lg transition-all duration-300 ${blurIntensity === level ? 'bg-zinc-800 text-indigo-400 shadow-xl' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
          
          <div className="pt-2 border-t border-white/[0.04]">
            <Slider 
              label="Unsharp Mask" min={0} max={2} step={0.1} value={unsharpMaskStrength} 
              onChange={setUnsharpMaskStrength} onReset={() => setUnsharpMaskStrength(1)} 
            />
            <button 
              onClick={() => applyFilter((m) => applyUnsharpMask(m, unsharpMaskStrength), 'Unsharp Mask')}
              className="w-full mt-2 py-3 btn-secondary text-[11px] font-bold uppercase tracking-widest flex items-center justify-center space-x-2"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>Apply Mask</span>
            </button>
          </div>
        </div>
      </Section>

    </div>
  );
};
