import React, { useState } from 'react';
import { ChevronDown, ChevronRight, SlidersHorizontal, Wand2, Layers, Download, Undo2, Crop, Sparkles, Loader2 } from 'lucide-react';
import { Slider } from '../ui/Slider';
import { Tooltip } from '../ui/Tooltip';
import { useImageStore } from '../../store/imageStore';
import { applyBrightness, applyContrast, applySaturation } from '../../core/filters/adjustments';
import { applyGaussianBlur, applySharpen, applyUnsharpMask, applyEdgeDetection, applyEmboss } from '../../core/filters/convolutionFilters';
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
    <div className="border-b border-zinc-800/40">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/20 transition-all duration-200"
      >
        <div className="flex items-center space-x-2.5">
          <div className={`p-1 rounded-md transition-colors ${isOpen ? 'text-indigo-400 bg-indigo-500/10' : 'text-zinc-500 bg-zinc-800/50'}`}>
            <Icon className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-[11px] uppercase tracking-widest text-zinc-400">{title}</span>
        </div>
        <div className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : 'rotate-0'}`}>
          <ChevronDown className="w-3.5 h-3.5 text-zinc-600" />
        </div>
      </button>
      {isOpen && (
        <div className="px-5 pb-5 pt-1 animate-in fade-in slide-in-from-top-1 duration-200">
          {children}
        </div>
      )}
    </div>
  );
};

export const Toolbar: React.FC = () => {
  const { 
    currentMatrix, applyOperation, setPreview, undo, undoStack, 
    isCropping, toggleCropping, autoEnhance, isProcessing 
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
    <div className="w-[280px] h-full bg-[#0c0c0e] border-r border-zinc-800/60 flex flex-col overflow-y-auto shrink-0 z-10">
      <div className="p-5 border-b border-zinc-800/60 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          <h2 className="text-sm font-bold text-zinc-100 tracking-tight">ENGINE</h2>
        </div>
        <Tooltip content="Undo last action">
          <button 
            onClick={undo} 
            disabled={undoStack.length === 0}
            className={`p-2 rounded-lg transition-all ${undoStack.length > 0 ? 'text-zinc-400 hover:text-indigo-400 hover:bg-indigo-500/10' : 'text-zinc-700 cursor-not-allowed'}`}
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
        </Tooltip>
      </div>

      <Section title="Adjustments" icon={SlidersHorizontal} defaultOpen={true}>
        <div className="mb-6">
          <Tooltip content="Automatically enhance image using AI">
            <button 
              onClick={autoEnhance}
              disabled={isProcessing || !currentMatrix}
              className={`w-full py-2.5 flex items-center justify-center space-x-2 text-[11px] font-bold uppercase tracking-widest rounded-lg transition-all border ${isProcessing ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-400 cursor-wait' : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/20'}`}
            >
              {isProcessing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>{isProcessing ? 'Processing...' : 'Auto Enhance'}</span>
            </button>
          </Tooltip>
        </div>

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
        {hasAdjustments && (
          <div className="flex space-x-2 mt-6 pt-4 border-t border-slate-700/50">
            <Tooltip content="Discard pending adjustments">
              <button 
                onClick={cancelAdjustments}
                className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium rounded transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </Tooltip>
            <Tooltip content="Permanently apply adjustments to image">
              <button 
                onClick={applyAdjustments}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded transition-colors cursor-pointer"
              >
                Apply
              </button>
            </Tooltip>
          </div>
        )}
      </Section>

      <Section title="Transforms" icon={Layers} defaultOpen={true}>
        <div className="space-y-4">
          <div>
            <Tooltip content="Toggle cropping mode">
              <button 
                onClick={toggleCropping}
                className={`w-full py-2.5 flex items-center justify-center space-x-2 text-[11px] font-semibold uppercase tracking-wider rounded-lg transition-all ${isCropping ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-zinc-800/50 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/50'}`}
              >
                <Crop className="w-3.5 h-3.5" />
                <span>{isCropping ? 'Cancel Crop' : 'Crop Area'}</span>
              </button>
            </Tooltip>
          </div>
          
          <div className="pt-3 border-t border-zinc-800/40">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 block">Orientation</label>
            <div className="grid grid-cols-4 gap-2">
              <Tooltip content="90° CW"><button onClick={() => applyFilter((m) => rotateMatrix(m, 90), 'Rotate 90 CW')} className="aspect-square flex items-center justify-center bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 rounded-lg border border-zinc-700/50 transition-all text-[10px]">90°</button></Tooltip>
              <Tooltip content="90° CCW"><button onClick={() => applyFilter((m) => rotateMatrix(m, 270), 'Rotate 90 CCW')} className="aspect-square flex items-center justify-center bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 rounded-lg border border-zinc-700/50 transition-all text-[10px]">-90°</button></Tooltip>
              <Tooltip content="180°"><button onClick={() => applyFilter((m) => rotateMatrix(m, 180), 'Rotate 180')} className="aspect-square flex items-center justify-center bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 rounded-lg border border-zinc-700/50 transition-all text-[10px]">180°</button></Tooltip>
              <Tooltip content="Free Rotation"><button onClick={() => setShowFreeRotate(!showFreeRotate)} className={`aspect-square flex items-center justify-center rounded-lg border transition-all text-[10px] ${showFreeRotate ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 border-zinc-700/50'}`}>Free</button></Tooltip>
            </div>
            
            {showFreeRotate && (
              <div className="mt-3 p-3 bg-slate-900 rounded-md border border-slate-700">
                <Slider 
                  label="Angle" min={-180} max={180} value={freeRotateAngle} 
                  onChange={(val) => {
                    setFreeRotateAngle(val);
                    if (currentMatrix) setPreview(rotateMatrix(currentMatrix, val));
                  }} 
                  onReset={() => {
                    setFreeRotateAngle(0);
                    setPreview(null);
                  }} 
                />
                <div className="flex space-x-2 mt-3">
                  <Tooltip content="Cancel free rotation">
                    <button 
                      onClick={() => {
                        setFreeRotateAngle(0);
                        setPreview(null);
                        setShowFreeRotate(false);
                      }}
                      className="flex-1 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium rounded transition-colors"
                    >
                      Cancel
                    </button>
                  </Tooltip>
                  <Tooltip content="Apply rotation to image">
                    <button 
                      onClick={() => {
                        applyFilter((m) => rotateMatrix(m, freeRotateAngle), `Rotate ${freeRotateAngle}°`);
                        setFreeRotateAngle(0);
                        setPreview(null);
                        setShowFreeRotate(false);
                      }}
                      className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded transition-colors"
                    >
                      Apply
                    </button>
                  </Tooltip>
                </div>
              </div>
            )}
          </div>
          
          <div className="pt-2 border-t border-slate-700/50">
            <label className="text-xs font-semibold text-slate-400 mb-2 block">Flip</label>
            <div className="grid grid-cols-2 gap-2">
              <Tooltip content="Flip left to right"><button onClick={() => applyFilter(flipHorizontal, 'Flip Horizontal')} className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium rounded transition-colors">Horizontal</button></Tooltip>
              <Tooltip content="Flip top to bottom"><button onClick={() => applyFilter(flipVertical, 'Flip Vertical')} className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium rounded transition-colors">Vertical</button></Tooltip>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Filters" icon={Wand2} defaultOpen={true}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Tooltip content="Sharpen"><button onClick={() => applyFilter(applySharpen, 'Sharpen')} className="py-2.5 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-300 text-[11px] font-medium rounded-lg border border-zinc-700/50 transition-all">Sharpen</button></Tooltip>
            <Tooltip content="Blur"><button onClick={() => applyFilter((m) => applyGaussianBlur(m, blurIntensity), 'Blur')} className="py-2.5 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-300 text-[11px] font-medium rounded-lg border border-zinc-700/50 transition-all">Gaussian Blur</button></Tooltip>
            <Tooltip content="Edge Detection"><button onClick={() => applyFilter(applyEdgeDetection, 'Edge Detect')} className="py-2.5 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-300 text-[11px] font-medium rounded-lg border border-zinc-700/50 transition-all">Edges</button></Tooltip>
            <Tooltip content="Emboss"><button onClick={() => applyFilter(applyEmboss, 'Emboss')} className="py-2.5 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-300 text-[11px] font-medium rounded-lg border border-zinc-700/50 transition-all">Emboss</button></Tooltip>
          </div>
          
          <div className="pt-3 border-t border-zinc-800/40">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 block">Blur Strength</label>
            <div className="flex bg-black/40 rounded-lg p-1 border border-zinc-800/50">
              {(['small', 'medium', 'large'] as const).map((level) => (
                <Tooltip key={level} content={`${level} kernel`}>
                  <button
                    onClick={() => setBlurIntensity(level)}
                    className={`flex-1 text-[10px] font-semibold uppercase tracking-wider py-1.5 rounded-md transition-all ${blurIntensity === level ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    {level}
                  </button>
                </Tooltip>
              ))}
            </div>
          </div>
          
          <div className="pt-2 border-t border-slate-700/50">
            <Slider 
              label="Unsharp Mask" min={0} max={2} step={0.1} value={unsharpMaskStrength} 
              onChange={setUnsharpMaskStrength} onReset={() => setUnsharpMaskStrength(1)} 
            />
            <Tooltip content="Apply Unsharp Mask">
              <button 
                onClick={() => applyFilter((m) => applyUnsharpMask(m, unsharpMaskStrength), 'Unsharp Mask')}
                className="w-full mt-2 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium rounded transition-colors"
              >
                Apply Unsharp Mask
              </button>
            </Tooltip>
          </div>
        </div>
      </Section>

    </div>
  );
};
