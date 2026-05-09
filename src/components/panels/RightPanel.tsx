import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Activity, Info, History as HistoryIcon, Trash2 } from 'lucide-react';
import { useImageStore } from '../../store/imageStore';
import { computeHistogram, normalizeHistogram } from '../../core/algorithms/histogram';
import { Tooltip } from '../ui/Tooltip';

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

export const RightPanel: React.FC = () => {
  const { 
    currentMatrix, 
    originalMatrix,
    filename, 
    fileSize, 
    imageWidth, 
    imageHeight, 
    zoom,
    undoStack,
    undo,
    resetToOriginal
  } = useImageStore();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [lumStats, setLumStats] = useState({ mean: 0, min: 0, max: 0, stdDev: 0 });

  useEffect(() => {
    if (!currentMatrix || !canvasRef.current) return;
    
    const histData = computeHistogram(currentMatrix);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Compute stats for luminance
    const lum = histData.l;
    const totalPixels = lum.reduce((a, b) => a + b, 0);
    
    if (totalPixels > 0) {
      const sum = lum.reduce((a, b, i) => a + b * i, 0);
      const mean = sum / totalPixels;
      const min = lum.findIndex(val => val > 0);
      let max = 255;
      for (let i = 255; i >= 0; i--) {
        if (lum[i] > 0) { max = i; break; }
      }
      const variance = lum.reduce((a, b, i) => a + b * Math.pow(i - mean, 2), 0) / totalPixels;
      const stdDev = Math.sqrt(variance);

      setLumStats({ mean, min, max, stdDev });
    }

    // Draw Histogram
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
    if (bytes == null) return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleHistoryClick = (index: number) => {
    let times = index + 1;
    while (times > 0) {
      undo();
      times--;
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset image to original state? All current edits will be lost.')) {
      resetToOriginal();
    }
  };

  return (
    <div className="w-[280px] h-full bg-[#0c0c0e] border-l border-zinc-800/60 flex flex-col overflow-y-auto shrink-0 z-10">
      <Section title="Histogram" icon={Activity} defaultOpen={true}>
        <div className="bg-black/40 rounded-lg border border-zinc-800/50 overflow-hidden mb-4 flex items-center justify-center p-2">
          <canvas ref={canvasRef} width={240} height={100} className="w-full h-[100px]" />
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[10px] font-mono tabular-nums">
          <div className="flex justify-between border-b border-zinc-800/40 pb-1"><span className="text-zinc-500 uppercase">Mean</span> <span className="text-zinc-200">{lumStats.mean.toFixed(1)}</span></div>
          <div className="flex justify-between border-b border-zinc-800/40 pb-1"><span className="text-zinc-500 uppercase">Sdev</span> <span className="text-zinc-200">{lumStats.stdDev.toFixed(1)}</span></div>
          <div className="flex justify-between border-b border-zinc-800/40 pb-1"><span className="text-zinc-500 uppercase">Min</span> <span className="text-zinc-200">{lumStats.min}</span></div>
          <div className="flex justify-between border-b border-zinc-800/40 pb-1"><span className="text-zinc-500 uppercase">Max</span> <span className="text-zinc-200">{lumStats.max}</span></div>
        </div>
      </Section>

      <Section title="Metadata" icon={Info} defaultOpen={true}>
        <div className="space-y-4 text-[11px]">
          <div className="flex flex-col">
            <span className="text-zinc-500 uppercase tracking-widest text-[9px] mb-1 font-bold">Filename</span>
            <span className="text-zinc-200 truncate font-medium" title={filename || 'Untitled project'}>{filename || 'Untitled project'}</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col">
              <span className="text-zinc-500 uppercase tracking-widest text-[9px] mb-1 font-bold">Dimensions</span>
              <span className="text-zinc-200 font-mono">{currentMatrix ? `${imageWidth}×${imageHeight}` : '—'}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-zinc-500 uppercase tracking-widest text-[9px] mb-1 font-bold">Size</span>
              <span className="text-zinc-200 font-mono">{formatSize(fileSize)}</span>
            </div>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-zinc-800/40">
            <span className="text-zinc-500 uppercase tracking-widest text-[9px] font-bold">Zoom Level</span>
            <span className="text-indigo-400 font-mono font-bold">{Math.round(zoom * 100)}%</span>
          </div>
        </div>
      </Section>

      <Section title="Workflow" icon={HistoryIcon} defaultOpen={true}>
        <div className="flex justify-between items-center mb-4">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{undoStack.length} Operations</span>
          <Tooltip content="Reset to Original">
            <button 
              onClick={handleReset}
              disabled={undoStack.length === 0}
              className={`p-1.5 rounded-lg transition-all ${undoStack.length > 0 ? 'text-rose-400 hover:bg-rose-500/10' : 'text-zinc-700 cursor-not-allowed'}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
        </div>
        
        <div className="space-y-1 max-h-[240px] overflow-y-auto pr-1">
          {undoStack.length === 0 ? (
            <div className="text-[11px] text-zinc-600 text-center py-8 italic border border-dashed border-zinc-800/60 rounded-lg">No modifications recorded</div>
          ) : (
            [...undoStack].reverse().map((op, i) => (
              <button 
                key={i}
                onClick={() => handleHistoryClick(i)}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-all flex items-center group relative overflow-hidden ${i === 0 ? 'bg-indigo-500/10 border border-indigo-500/20' : 'hover:bg-zinc-800/50 border border-transparent'}`}
              >
                {i === 0 && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" />}
                <div className="flex-1 min-w-0">
                  <div className={`text-[11px] font-bold truncate ${i === 0 ? 'text-indigo-400' : 'text-zinc-300 group-hover:text-zinc-100'}`}>
                    {op.name.toUpperCase()}
                  </div>
                  <div className="text-[9px] text-zinc-500 uppercase tracking-tighter mt-0.5">
                    {i === 0 ? 'Current State' : `${i} action${i !== 1 ? 's' : ''} ago`}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </Section>
    </div>
  );
};
