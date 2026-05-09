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
  
  useEffect(() => {
    if (filename) {
      setExportName(filename.replace(/\.[^/.]+$/, ""));
    }
  }, [filename]);
  
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-[#121214] border border-zinc-800/60 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col scale-in-95 animate-in duration-300">
        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-800/60 flex justify-between items-center bg-zinc-900/40">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg">
              <Download className="w-5 h-5 text-indigo-400" />
            </div>
            <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-widest">Export Project</h2>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-8 space-y-8">
          {/* Filename */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block ml-1">Filename</label>
            <input 
              type="text" 
              value={exportName}
              onChange={(e) => setExportName(e.target.value)}
              className="w-full bg-black/20 border border-zinc-800 rounded-xl px-4 py-3 text-[13px] text-zinc-100 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-medium"
              placeholder="project_name"
            />
          </div>

          {/* Format */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block ml-1">Format</label>
            <div className="grid grid-cols-3 gap-2 p-1 bg-black/40 border border-zinc-800/60 rounded-xl">
              {(['png', 'jpeg', 'webp'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`py-2 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all ${format === f ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Quality */}
          {format !== 'png' && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <Slider 
                label="Encoding Quality" 
                min={1} 
                max={100} 
                value={quality} 
                onChange={setQuality} 
              />
            </div>
          )}

          {/* Scale */}
          <div className="space-y-4">
            <div className="flex justify-between items-center ml-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Output Scale</label>
              <span className="text-[10px] font-mono text-indigo-400 font-bold bg-indigo-500/5 px-2 py-0.5 rounded border border-indigo-500/10">
                {Math.round(imageWidth * scale)} × {Math.round(imageHeight * scale)} PX
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[0.25, 0.5, 0.75, 1].map((s) => (
                <button
                  key={s}
                  onClick={() => setScale(s)}
                  className={`py-2 text-[11px] font-bold rounded-lg border transition-all ${scale === s ? 'bg-indigo-500 border-indigo-400 text-white shadow-lg shadow-indigo-500/20' : 'bg-black/20 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'}`}
                >
                  {s * 100}%
                </button>
              ))}
            </div>
          </div>
          
          {/* Estimated Size */}
          <div className="bg-indigo-500/5 rounded-2xl p-5 border border-indigo-500/10 flex justify-between items-center group overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
              <Download className="w-16 h-16 text-indigo-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Est. Payload</span>
              <span className="text-xl font-mono font-bold text-zinc-100 tracking-tighter">
                {estimatedSize === null ? '...' : formatBytes(estimatedSize)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[9px] font-bold text-indigo-400/60 uppercase tracking-tighter block">Optimized</span>
              <span className="text-[10px] text-zinc-500 font-mono">READY</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-zinc-900/40 border-t border-zinc-800/60 flex flex-col space-y-3">
          <button 
            onClick={handleExport}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold uppercase tracking-widest rounded-xl shadow-xl shadow-indigo-500/20 transition-all active:scale-[0.98] flex items-center justify-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Confirm Export</span>
          </button>
          
          <button 
            onClick={handleExportJSON}
            className="w-full py-3 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all flex items-center justify-center space-x-2 border border-zinc-700/30"
          >
            <FileJson className="w-3.5 h-3.5" />
            <span>Download Pipeline (JSON)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
