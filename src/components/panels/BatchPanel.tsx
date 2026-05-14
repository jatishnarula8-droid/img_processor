import React, { useState, useRef } from 'react';
import { X, UploadCloud, Play, Trash2, Plus, GripVertical, Layers, Loader2, CheckCircle2, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { useImageStore } from '../../store/imageStore';
import { processBatch, type BatchJob } from '../../core/batchProcessor';
import { applyBrightness, applyContrast } from '../../core/filters/adjustments';
import { applyGaussianBlur, applySharpen } from '../../core/filters/convolutionFilters';
import { flipHorizontal, flipVertical } from '../../core/transforms/geometric';
import { applyBackgroundRemoval } from '../../core/filters/backgroundRemoval';
import type { PixelMatrix } from '../../types/image.types';
import { Tooltip } from '../ui/Tooltip';

type FilterType = 'brightness' | 'contrast' | 'blur' | 'sharpen' | 'grayscale' | 'flipH' | 'flipV' | 'bgRemoval';

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
  bgRemoval: { name: 'Remove Background', hasValue: false, default: 0 },
};

export const BatchPanel: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [pipeline, setPipeline] = useState<PipelineStep[]>([]);
  const [jobs, setJobs] = useState<BatchJob[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isProtocolOpen, setIsProtocolOpen] = useState(false);
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

  const createFilterFn = (step: PipelineStep): (m: PixelMatrix) => PixelMatrix | Promise<PixelMatrix> => {
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
      case 'bgRemoval': return async (m) => await applyBackgroundRemoval(m);
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-6 animate-in fade-in duration-500">
      <div className="bg-[#0c0c0e] border border-white/5 rounded-[2.5rem] shadow-2xl w-full max-w-6xl h-[85vh] overflow-hidden flex flex-col scale-in-95 animate-in duration-500">
        {/* Header */}
        <div className="px-10 py-8 border-b border-white/[0.04] flex justify-between items-center bg-zinc-900/10 shrink-0">
          <div className="flex items-center space-x-5">
            <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
              <Layers className="w-7 h-7 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-black text-zinc-100 uppercase tracking-[0.2em] font-display">Rendering Engine</h2>
              <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mt-1 opacity-80">Asynchronous Batch Transformation Studio</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 btn-ghost" disabled={isProcessing}>
            <X className="w-7 h-7" />
          </button>
        </div>
        
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column: Files */}
          <div className="w-1/2 border-r border-white/[0.04] flex flex-col bg-black/20 p-8 overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Job Queue <span className="text-indigo-400 ml-2">({files.length})</span></h3>
              <input type="file" multiple accept="image/*" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] hover:text-indigo-300 disabled:opacity-30 transition-all"
                disabled={isProcessing}
              >
                + Append Assets
              </button>
            </div>

            {files.length === 0 ? (
              <div 
                className="flex-1 border-2 border-dashed border-white/[0.03] rounded-3xl flex flex-col items-center justify-center text-zinc-600 hover:border-indigo-500/30 hover:text-zinc-400 transition-all duration-500 cursor-pointer group bg-zinc-900/10"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="p-6 rounded-full bg-white/[0.02] mb-6 group-hover:scale-110 group-hover:bg-indigo-500/5 transition-all duration-500">
                  <UploadCloud className="w-12 h-12 text-zinc-700 group-hover:text-indigo-500/60 transition-colors" />
                </div>
                <p className="text-[12px] font-black uppercase tracking-[0.2em]">Ingest Media</p>
                <p className="text-[10px] uppercase tracking-widest mt-2 opacity-40">Drag and drop or select files</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {files.map((file, i) => {
                  const job = jobs.find(j => j.file === file);
                  return (
                    <div key={i} className="group flex items-center justify-between bg-zinc-900/30 p-4 rounded-2xl border border-white/[0.02] hover:border-white/[0.08] transition-all duration-300">
                      <div className="flex items-center space-x-4 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center shrink-0 border border-white/[0.03]">
                          <ImageIcon className="w-5 h-5 text-zinc-600" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[12px] text-zinc-200 truncate font-bold">{file.name}</span>
                          <span className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">{(file.size / 1024).toFixed(1)} KB</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 shrink-0">
                        {job && (
                          <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border ${
                            job.status === 'done' ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' :
                            job.status === 'processing' ? 'bg-indigo-500/5 border-indigo-500/20 text-indigo-400' :
                            job.status === 'error' ? 'bg-rose-500/5 border-rose-500/20 text-rose-400' :
                            'bg-zinc-900 border-white/5 text-zinc-600'
                          }`}>
                            {job.status === 'done' && <CheckCircle2 className="w-3.5 h-3.5" />}
                            {job.status === 'processing' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            {job.status === 'error' && <AlertCircle className="w-3.5 h-3.5" />}
                            <span className="text-[9px] font-black uppercase tracking-[0.2em]">{job.status}</span>
                          </div>
                        )}
                        {!isProcessing && (
                          <button onClick={() => removeFile(i)} className="p-2 btn-ghost hover:text-rose-400">
                            <X className="w-4 h-4" />
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
          <div className="w-1/2 flex flex-col bg-[#0c0c0e] p-8 overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Transformation Pipeline</h3>
              <div className="relative">
                <button 
                  onClick={() => setIsProtocolOpen(!isProtocolOpen)}
                  className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] hover:text-indigo-300 flex items-center space-x-2 transition-all" 
                  disabled={isProcessing}
                >
                  <Plus className="w-4 h-4" /> <span>Add Protocol</span>
                </button>
                {isProtocolOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setIsProtocolOpen(false)}
                    />
                    <div className="absolute right-0 mt-3 w-56 glass-panel rounded-2xl shadow-2xl z-50 overflow-hidden animate-in zoom-in-95 duration-200">
                      {(Object.keys(FILTER_CONFIG) as FilterType[]).map(type => (
                        <button 
                          key={type} 
                          onClick={() => {
                            addPipelineStep(type);
                            setIsProtocolOpen(false);
                          }}
                          className="block w-full text-left px-5 py-4 text-[11px] font-black uppercase tracking-widest text-zinc-400 hover:bg-indigo-500/10 hover:text-indigo-400 transition-all border-b border-white/[0.03] last:border-0"
                        >
                          {FILTER_CONFIG[type].name}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {pipeline.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-700 text-center px-16 border-2 border-dashed border-white/[0.03] rounded-3xl bg-zinc-900/5">
                <div className="p-5 bg-white/[0.01] rounded-3xl mb-6">
                  <Layers className="w-10 h-10 opacity-20" />
                </div>
                <p className="text-[12px] font-black uppercase tracking-[0.2em] opacity-60">Pipeline Latent</p>
                <p className="text-[10px] uppercase tracking-widest mt-2 opacity-30 leading-relaxed">Sequence filters to establish your automated rendering workflow</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pipeline.map((step, index) => {
                  const config = FILTER_CONFIG[step.type];
                  return (
                    <div key={step.id} className="premium-card p-6 rounded-[1.5rem] flex flex-col relative group animate-in slide-in-from-right-4 duration-500">
                      <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center space-x-4">
                          <div className="w-8 h-8 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-center text-[11px] font-black text-indigo-400 font-display">
                            {index + 1}
                          </div>
                          <span className="text-[12px] font-black text-zinc-100 uppercase tracking-[0.2em]">{config.name}</span>
                        </div>
                        {!isProcessing && (
                          <button onClick={() => removePipelineStep(step.id)} className="p-2 btn-ghost hover:text-rose-400">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      {config.hasValue && (
                        <div className="px-1">
                          <Slider 
                            label="Parameter" 
                            min={config.min!} 
                            max={config.max!} 
                            step={config.step || 1}
                            value={step.value!}
                            onChange={(val) => updatePipelineStep(step.id, val)}
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
        <div className="px-10 py-8 border-t border-white/[0.04] bg-zinc-900/10 flex items-center justify-between shrink-0">
          <div className="w-1/2 pr-12">
            {jobs.length > 0 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex justify-between text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-3">
                  <span className="flex items-center space-x-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${isProcessing ? 'bg-indigo-500 animate-pulse' : 'bg-emerald-500'}`} />
                    <span>Engine: {isProcessing ? 'Processing Cluster' : 'Standby'}</span>
                  </span>
                  <span>{completed} / {jobs.length} Units Finalized</span>
                </div>
                <div className="w-full bg-zinc-900 border border-white/[0.03] rounded-full h-[6px] overflow-hidden p-[1px]">
                  <div className="bg-gradient-to-r from-indigo-600 to-indigo-400 h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(99,102,241,0.4)]" style={{ width: `${progress}%` }}></div>
                </div>
              </div>
            )}
          </div>
          <button 
            onClick={handleStartBatch}
            disabled={isProcessing || files.length === 0 || pipeline.length === 0}
            className="h-14 px-10 btn-primary disabled:opacity-30 disabled:grayscale transition-all flex items-center space-x-3"
          >
            {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
            <span className="text-[12px] font-black uppercase tracking-[0.3em]">{isProcessing ? 'Rendering...' : 'Execute Run'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
