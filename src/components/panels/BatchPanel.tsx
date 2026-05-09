import React, { useState, useRef } from 'react';
import { X, UploadCloud, Play, Trash2, Plus, GripVertical, Layers, Loader2, CheckCircle2, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { useImageStore } from '../../store/imageStore';
import { processBatch, type BatchJob } from '../../core/batchProcessor';
import { applyBrightness, applyContrast } from '../../core/filters/adjustments';
import { applyGaussianBlur, applySharpen } from '../../core/filters/convolutionFilters';
import { flipHorizontal, flipVertical } from '../../core/transforms/geometric';
import type { PixelMatrix } from '../../types/image.types';
import { Tooltip } from '../ui/Tooltip';

type FilterType = 'brightness' | 'contrast' | 'blur' | 'sharpen' | 'grayscale' | 'flipH' | 'flipV';

interface PipelineStep {
  id: string;
  type: FilterType;
  value?: number;
}

const FILTER_CONFIG: Record<FilterType, { name: string, hasValue: boolean, default: number, min?: number, max?: number, step?: number }> = {
  brightness: { name: 'Brightness', hasValue: true, default: 0, min: -100, max: 100 },
  contrast: { name: 'Contrast', hasValue: true, default: 0, min: -100, max: 100 },
  blur: { name: 'Blur', hasValue: false, default: 0 },
  sharpen: { name: 'Sharpen', hasValue: false, default: 0 },
  grayscale: { name: 'Grayscale', hasValue: false, default: 0 },
  flipH: { name: 'Flip Horizontal', hasValue: false, default: 0 },
  flipV: { name: 'Flip Vertical', hasValue: false, default: 0 },
};

export const BatchPanel: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [pipeline, setPipeline] = useState<PipelineStep[]>([]);
  const [jobs, setJobs] = useState<BatchJob[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      const newFiles = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const addPipelineStep = (type: FilterType) => {
    setPipeline(prev => [...prev, { 
      id: Math.random().toString(36).substr(2, 9), 
      type, 
      value: FILTER_CONFIG[type].default 
    }]);
  };

  const updatePipelineStep = (id: string, value: number) => {
    setPipeline(prev => prev.map(step => step.id === id ? { ...step, value } : step));
  };

  const removePipelineStep = (id: string) => {
    setPipeline(prev => prev.filter(step => step.id !== id));
  };

  const createFilterFn = (step: PipelineStep): (m: PixelMatrix) => PixelMatrix => {
    switch (step.type) {
      case 'brightness': return (m) => applyBrightness(m, step.value || 0);
      case 'contrast': return (m) => applyContrast(m, step.value || 0);
      case 'blur': return (m) => applyGaussianBlur(m, 'medium');
      case 'sharpen': return applySharpen;
      case 'flipH': return flipHorizontal;
      case 'flipV': return flipVertical;
      case 'grayscale': return (m) => {
        const h = m.length, w = m[0].length;
        const out: PixelMatrix = [];
        for (let y=0; y<h; y++) {
          const row: [number,number,number,number][] = [];
          for (let x=0; x<w; x++) {
            const p = m[y][x];
            const g = Math.round(0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]);
            row.push([g, g, g, p[3]]);
          }
          out.push(row);
        }
        return out;
      };
      default: return (m) => m;
    }
  };

  const handleStartBatch = async () => {
    if (files.length === 0 || pipeline.length === 0) return;
    
    setIsProcessing(true);
    
    const operations = pipeline.map(step => ({
      name: FILTER_CONFIG[step.type].name,
      filterFn: createFilterFn(step)
    }));

    const newJobs: BatchJob[] = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      operations,
      format: 'png',
      quality: 0.92,
      status: 'pending'
    }));

    setJobs(newJobs);

    await processBatch(newJobs, (jobId, status, error) => {
      setJobs(prev => prev.map(job => 
        job.id === jobId ? { ...job, status, error } : job
      ));
    });

    setIsProcessing(false);
  };

  if (!isOpen) return null;

  const completed = jobs.filter(j => j.status === 'done').length;
  const progress = jobs.length > 0 ? (completed / jobs.length) * 100 : 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-6 animate-in fade-in duration-300">
      <div className="bg-[#121214] border border-zinc-800/60 rounded-3xl shadow-2xl w-full max-w-5xl h-[85vh] overflow-hidden flex flex-col scale-in-95 animate-in duration-300">
        {/* Header */}
        <div className="px-8 py-6 border-b border-zinc-800/60 flex justify-between items-center bg-zinc-900/40 shrink-0">
          <div className="flex items-center space-x-4">
            <div className="p-2.5 bg-indigo-500/10 rounded-xl">
              <Layers className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-widest">Batch Processor</h2>
              <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-tighter mt-0.5">Sequential rendering engine</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded-xl transition-all" disabled={isProcessing}>
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column: Files */}
          <div className="w-1/2 border-r border-zinc-800/60 flex flex-col bg-black/20 p-6 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Job Queue ({files.length})</h3>
              <input type="file" multiple accept="image/*" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest hover:text-indigo-300 disabled:opacity-30"
                disabled={isProcessing}
              >
                + Append Files
              </button>
            </div>

            {files.length === 0 ? (
              <div 
                className="flex-1 border-2 border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center text-zinc-600 hover:border-zinc-700 hover:text-zinc-500 transition-all cursor-pointer group bg-zinc-900/40"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadCloud className="w-10 h-10 mb-4 group-hover:scale-110 transition-transform text-zinc-700" />
                <p className="text-[11px] font-bold uppercase tracking-wider">Drop Assets</p>
                <p className="text-[10px] uppercase tracking-tighter mt-1 opacity-60">or browse filesystem</p>
              </div>
            ) : (
              <div className="space-y-2">
                {files.map((file, i) => {
                  const job = jobs.find(j => j.file === file);
                  return (
                    <div key={i} className="group flex items-center justify-between bg-zinc-900/60 p-3 rounded-xl border border-zinc-800/40 hover:border-zinc-700 transition-all">
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                          <ImageIcon className="w-4 h-4 text-zinc-500" />
                        </div>
                        <span className="text-[11px] text-zinc-300 truncate font-medium">{file.name}</span>
                      </div>
                      <div className="flex items-center space-x-3 shrink-0">
                        {job && (
                          <div className={`flex items-center space-x-1.5 px-2 py-1 rounded-md ${
                            job.status === 'done' ? 'bg-emerald-500/10 text-emerald-400' :
                            job.status === 'processing' ? 'bg-indigo-500/10 text-indigo-400' :
                            job.status === 'error' ? 'bg-rose-500/10 text-rose-400' :
                            'bg-zinc-800 text-zinc-500'
                          }`}>
                            {job.status === 'done' && <CheckCircle2 className="w-3 h-3" />}
                            {job.status === 'processing' && <Loader2 className="w-3 h-3 animate-spin" />}
                            {job.status === 'error' && <AlertCircle className="w-3 h-3" />}
                            <span className="text-[9px] font-bold uppercase tracking-widest">{job.status}</span>
                          </div>
                        )}
                        {!isProcessing && (
                          <button onClick={() => removeFile(i)} className="p-1 text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-all">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Pipeline */}
          <div className="w-1/2 flex flex-col bg-[#0c0c0e] p-6 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Filter Pipeline</h3>
              <div className="relative group">
                <button className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest hover:text-indigo-300 flex items-center space-x-1.5" disabled={isProcessing}>
                  <Plus className="w-3 h-3" /> <span>Append Step</span>
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-[#121214] border border-zinc-800 rounded-xl shadow-2xl hidden group-hover:block z-10 overflow-hidden">
                  {(Object.keys(FILTER_CONFIG) as FilterType[]).map(type => (
                    <button 
                      key={type} 
                      onClick={() => addPipelineStep(type)}
                      className="block w-full text-left px-4 py-3 text-[11px] font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors border-b border-zinc-800/40 last:border-0"
                    >
                      {FILTER_CONFIG[type].name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {pipeline.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 text-center px-12 border border-dashed border-zinc-800 rounded-2xl bg-black/20">
                <Layers className="w-8 h-8 mb-4 opacity-20" />
                <p className="text-[11px] font-medium uppercase tracking-wider opacity-60">No operations defined</p>
                <p className="text-[10px] uppercase tracking-tighter mt-1 opacity-40">Add filters to construct your transformation pipeline</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pipeline.map((step, index) => {
                  const config = FILTER_CONFIG[step.type];
                  return (
                    <div key={step.id} className="bg-zinc-900/40 border border-zinc-800/60 p-4 rounded-2xl flex flex-col relative group">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-6 h-6 bg-zinc-800 rounded-md flex items-center justify-center text-[10px] font-bold text-zinc-500 font-mono">
                            0{index + 1}
                          </div>
                          <span className="text-[11px] font-bold text-zinc-200 uppercase tracking-widest">{config.name}</span>
                        </div>
                        {!isProcessing && (
                          <button onClick={() => removePipelineStep(step.id)} className="p-1.5 text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      {config.hasValue && (
                        <div className="px-2">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-tighter">Intensity</span>
                            <span className="text-[10px] font-mono text-zinc-300">{step.value}</span>
                          </div>
                          <input 
                            type="range" 
                            min={config.min} 
                            max={config.max} 
                            step={config.step || 1}
                            value={step.value}
                            onChange={(e) => updatePipelineStep(step.id, Number(e.target.value))}
                            disabled={isProcessing}
                            className="w-full h-[2px] bg-zinc-800 rounded-full appearance-none accent-indigo-500"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-zinc-800/60 bg-zinc-900/40 flex items-center justify-between shrink-0">
          <div className="w-1/2 pr-8">
            {jobs.length > 0 && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">
                  <span>Engine status: {isProcessing ? 'Active' : 'Completed'}</span>
                  <span>{completed} / {jobs.length} Assets</span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-[3px] overflow-hidden">
                  <div className="bg-indigo-500 h-full transition-all duration-500 ease-out shadow-[0_0_8px_rgba(99,102,241,0.5)]" style={{ width: `${progress}%` }}></div>
                </div>
              </div>
            )}
          </div>
          <button 
            onClick={handleStartBatch}
            disabled={isProcessing || files.length === 0 || pipeline.length === 0}
            className="h-12 px-8 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-[11px] font-bold uppercase tracking-widest rounded-xl shadow-xl shadow-indigo-500/20 transition-all flex items-center space-x-2 active:scale-[0.98]"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            <span>{isProcessing ? 'Executing Pipeline...' : 'Start Job Run'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
