import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Activity, Info, History as HistoryIcon, Trash2 } from 'lucide-react';
import { useImageStore } from '../../store/imageStore';
import { computeHistogram, normalizeHistogram } from '../../core/algorithms/histogram';
import { Tooltip } from '../ui/Tooltip';
import { BackgroundRemovalPanel } from './BackgroundRemovalPanel';

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

export const RightPanel: React.FC = () => {
  const { 
    currentMatrix, filename, fileSize, imageWidth, imageHeight, zoom, undoStack, undo, resetToOriginal, activeTool
  } = useImageStore();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [lumStats, setLumStats] = useState({ mean: 0, min: 0, max: 0, stdDev: 0 });

  useEffect(() => {
    if (!currentMatrix || !canvasRef.current) return;
    
    const histData = computeHistogram(currentMatrix);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const lum = histData.l;
    const totalPixels = lum.reduce((a, b) => a + b, 0);
    
    if (totalPixels > 0) {
      const sum = lum.reduce((a, b, i) => a + b * i, 0);
      const mean = sum / totalPixels;
      const min = lum.findIndex(val => val > 0);
      let max = 255;
      for (let i = 255; i >= 0; i--) { if (lum[i] > 0) { max = i; break; } }
      const variance = lum.reduce((a, b, i) => a + b * Math.pow(i - mean, 2), 0) / totalPixels;
      const stdDev = Math.sqrt(variance);
      setLumStats({ mean, min, max, stdDev });
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const drawChannel = (data: number[], color: string) => {
      const normalized = normalizeHistogram(data);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, canvas.height);
      const step = canvas.width / 256;
      for (let i = 0; i < 256; i++) {
        const x = i * step;
        const y = canvas.height - (normalized[i] * canvas.height);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(canvas.width, canvas.height);
      ctx.closePath();
      ctx.fill();
    };

    ctx.globalAlpha = 0.5;
    ctx.globalCompositeOperation = 'screen';
    drawChannel(histData.r, '#ef4444');
    drawChannel(histData.g, '#22c55e');
    drawChannel(histData.b, '#3b82f6');
    drawChannel(histData.l, '#ffffff');
    ctx.globalAlpha = 1.0;
    ctx.globalCompositeOperation = 'source-over';
  }, [currentMatrix]);

  const formatSize = (bytes: number | null) => {
    if (bytes == null) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleHistoryClick = (index: number) => {
    let times = index + 1;
    while (times > 0) { undo(); times--; }
  };

  const handleReset = () => {
    if (window.confirm('Reset image to original state? All edits will be lost.')) {
      resetToOriginal();
    }
  };

  return (
    <div className="w-[300px] h-full bg-[#0c0c0e] border-l border-white/5 flex flex-col overflow-y-auto shrink-0 z-10 custom-scrollbar">
      {activeTool === 'background_remove' ? (
        <BackgroundRemovalPanel />
      ) : (
        <>
          <Section title="Histogram" icon={Activity} defaultOpen={true}>
        <div className="premium-card rounded-xl overflow-hidden mb-6 p-3">
          <canvas ref={canvasRef} width={240} height={100} className="w-full h-[100px]" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Mean', value: lumStats.mean.toFixed(1) },
            { label: 'StdDev', value: lumStats.stdDev.toFixed(1) },
            { label: 'Min', value: lumStats.min },
            { label: 'Max', value: lumStats.max }
          ].map((stat, i) => (
            <div key={i} className="flex flex-col border-b border-white/[0.03] pb-2">
              <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-0.5">{stat.label}</span>
              <span className="text-xs font-mono font-bold text-indigo-400">{stat.value}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Image Detail" icon={Info} defaultOpen={true}>
        <div className="space-y-5">
          <div className="flex flex-col">
            <span className="text-zinc-500 uppercase tracking-[0.2em] text-[9px] mb-1.5 font-black">Source File</span>
            <span className="text-zinc-100 truncate font-bold text-[11px] bg-zinc-900/50 p-2 rounded-lg border border-white/[0.03]" title={filename || 'Unsaved Project'}>
              {filename || 'Unsaved Project'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="flex flex-col">
              <span className="text-zinc-500 uppercase tracking-[0.2em] text-[9px] mb-1 font-black">Resolution</span>
              <span className="text-zinc-200 font-mono font-bold text-xs">{currentMatrix ? `${imageWidth} × ${imageHeight}` : '—'}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-zinc-500 uppercase tracking-[0.2em] text-[9px] mb-1 font-black">File Size</span>
              <span className="text-zinc-200 font-mono font-bold text-xs">{formatSize(fileSize)}</span>
            </div>
          </div>
          <div className="flex justify-between items-center pt-4 border-t border-white/[0.05]">
            <span className="text-zinc-500 uppercase tracking-[0.2em] text-[9px] font-black">Magnification</span>
            <span className="text-indigo-400 font-mono font-black text-xs bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">{Math.round(zoom * 100)}%</span>
          </div>
        </div>
      </Section>

      <Section title="Modification Log" icon={HistoryIcon} defaultOpen={true}>
        <div className="flex justify-between items-center mb-6">
          <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest bg-zinc-900/80 px-2 py-1 rounded-md border border-white/5">{undoStack.length} Operations</span>
          <Tooltip content="Purge History">
            <button 
              onClick={handleReset}
              disabled={undoStack.length === 0}
              className={`p-2 rounded-xl transition-all duration-300 ${undoStack.length > 0 ? 'text-rose-400 hover:bg-rose-500/10' : 'text-zinc-800 cursor-not-allowed'}`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </Tooltip>
        </div>
        
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
          {undoStack.length === 0 ? (
            <div className="text-[10px] text-zinc-600 text-center py-12 font-medium uppercase tracking-[0.2em] border-2 border-dashed border-white/[0.03] rounded-2xl">Buffer Empty</div>
          ) : (
            [...undoStack].reverse().map((op, i) => (
              <button 
                key={i}
                onClick={() => handleHistoryClick(i)}
                className={`w-full text-left px-4 py-3.5 rounded-2xl transition-all duration-300 flex items-center group relative overflow-hidden border ${i === 0 ? 'bg-indigo-500/10 border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.05)]' : 'hover:bg-white/[0.03] border-transparent'}`}
              >
                {i === 0 && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" />}
                <div className="flex-1 min-w-0">
                  <div className={`text-[10px] font-black uppercase tracking-widest truncate ${i === 0 ? 'text-indigo-400' : 'text-zinc-300 group-hover:text-white'}`}>
                    {op.name}
                  </div>
                  <div className="text-[9px] text-zinc-600 font-bold uppercase tracking-tighter mt-1 group-hover:text-zinc-400">
                    {i === 0 ? 'Current State' : `${i} action${i !== 1 ? 's' : ''} prior`}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </Section>
        </>
      )}
    </div>
  );
};
