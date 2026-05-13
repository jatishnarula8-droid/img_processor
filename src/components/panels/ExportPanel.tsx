import React, { useState, useEffect } from 'react';
import { X, Download, FileJson } from 'lucide-react';
import { useImageStore } from '../../store/imageStore';
import { computeFileSize, exportAsImage, exportAsJSON } from '../../core/export';
import { scaleMatrix } from '../../core/transforms/geometric';
import { Slider } from '../ui/Slider';
import { Tooltip } from '../ui/Tooltip';

export const ExportPanel: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { currentMatrix, filename, undoStack, imageWidth, imageHeight } = useImageStore();
  
  const [format, setFormat] = useState<'png' | 'jpeg' | 'webp'>('png');
  const [quality, setQuality] = useState(92);
  const [scale, setScale] = useState(1);
  const [exportName, setExportName] = useState('');
  const [estimatedSize, setEstimatedSize] = useState<number | null>(null);
  const [hasAlpha, setHasAlpha] = useState(false);
  
  useEffect(() => {
    if (filename) {
      setExportName(filename.replace(/\.[^/.]+$/, ""));
    }
    
    if (currentMatrix) {
      let isTransparent = false;
      // Fast check for transparency
      outerLoop: for (let y = 0; y < currentMatrix.length; y += Math.max(1, Math.floor(currentMatrix.length / 50))) {
        for (let x = 0; x < currentMatrix[0].length; x += Math.max(1, Math.floor(currentMatrix[0].length / 50))) {
          if (currentMatrix[y][x][3] < 255) {
            isTransparent = true;
            break outerLoop;
          }
        }
      }
      setHasAlpha(isTransparent);
      if (isTransparent) {
        setFormat('png');
      }
    }
  }, [filename, currentMatrix]);
  
  useEffect(() => {
    if (!currentMatrix || !isOpen) return;
    
    setEstimatedSize(null);
    const timer = setTimeout(async () => {
      let matToExport = currentMatrix;
      if (scale !== 1) {
        matToExport = scaleMatrix(currentMatrix, scale);
      }
      const size = await computeFileSize(matToExport, format, quality / 100);
      setEstimatedSize(size);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [currentMatrix, format, quality, scale, isOpen]);

  if (!isOpen || !currentMatrix) return null;

  const handleExport = () => {
    let matToExport = currentMatrix;
    if (scale !== 1) {
      matToExport = scaleMatrix(currentMatrix, scale);
    }
    exportAsImage(matToExport, exportName || 'image', format, quality / 100);
    onClose();
  };

  const handleExportJSON = () => {
    exportAsJSON(undoStack, exportName || 'image', imageWidth, imageHeight);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-500">
      <div className="bg-[#0c0c0e] border border-white/5 rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col scale-in-95 animate-in duration-500">
        {/* Header */}
        <div className="px-10 py-8 border-b border-white/[0.04] flex justify-between items-center bg-zinc-900/10">
          <div className="flex items-center space-x-4">
            <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
              <Download className="w-6 h-6 text-indigo-400" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-sm font-black text-zinc-100 uppercase tracking-[0.2em] font-display">Export Studio</h2>
              <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold mt-1">Configure output parameters</span>
            </div>
          </div>
          <button onClick={onClose} className="p-3 btn-ghost">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-10 space-y-10">
          {/* Filename */}
          <div className="space-y-4">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] block ml-1">Asset Name</label>
            <div className="relative group">
              <input 
                type="text" 
                value={exportName}
                onChange={(e) => setExportName(e.target.value)}
                className="w-full bg-zinc-900/40 border border-white/[0.04] rounded-2xl px-5 py-4 text-[14px] text-zinc-100 focus:outline-none focus:border-indigo-500/40 focus:bg-zinc-900/60 transition-all font-medium placeholder-zinc-700"
                placeholder="untitiled_asset"
              />
              <div className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-zinc-600">.{format}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Format */}
            <div className="space-y-4">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] block ml-1">Encoding Format</label>
              <div className="flex bg-black/40 border border-white/[0.04] rounded-2xl p-1.5">
                {(['png', 'jpeg', 'webp'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFormat(f)}
                    disabled={hasAlpha && f !== 'png'}
                    className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 ${format === f ? 'bg-zinc-800 text-indigo-400 shadow-xl' : 'text-zinc-600 hover:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed'}`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Scale */}
            <div className="space-y-4">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] block ml-1">Resolution Scale</label>
              <div className="grid grid-cols-4 gap-2">
                {[0.25, 0.5, 0.75, 1].map((s) => (
                  <button
                    key={s}
                    onClick={() => setScale(s)}
                    className={`py-2.5 text-[10px] font-black rounded-xl border transition-all duration-300 ${scale === s ? 'bg-indigo-600/10 border-indigo-500/40 text-indigo-400' : 'bg-black/20 border-white/[0.02] text-zinc-600 hover:text-zinc-300 hover:border-white/[0.08]'}`}
                  >
                    {s * 100}%
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {/* Summary / Size */}
          <div className="premium-card rounded-3xl p-8 flex justify-between items-center group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform duration-700">
              <Download className="w-24 h-24 text-indigo-400" />
            </div>
            <div className="flex flex-col relative z-10">
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Estimated Output Size</span>
              <span className="text-3xl font-black text-zinc-100 tracking-tighter mt-1 font-display">
                {estimatedSize === null ? '...' : formatBytes(estimatedSize)}
              </span>
              <div className="flex items-center space-x-2 mt-2">
                <span className="text-[9px] font-mono text-indigo-400/60 font-bold bg-indigo-500/5 px-2 py-0.5 rounded border border-indigo-500/10 uppercase tracking-tighter">
                  {Math.round(imageWidth * scale)} × {Math.round(imageHeight * scale)} PX
                </span>
              </div>
            </div>
            <div className="text-right relative z-10">
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full glow-indigo animate-pulse-soft ml-auto mb-2" />
              <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">Ready</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-10 py-10 bg-zinc-900/10 border-t border-white/[0.04] flex flex-col space-y-4">
          <button 
            onClick={handleExport}
            className="w-full py-5 btn-primary flex items-center justify-center space-x-3"
          >
            <Download className="w-5 h-5" />
            <span className="text-xs font-black uppercase tracking-[0.2em]">Initiate Export</span>
          </button>
          
          <button 
            onClick={handleExportJSON}
            className="w-full py-4 btn-secondary flex items-center justify-center space-x-3"
          >
            <FileJson className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Save Manifest (JSON)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
