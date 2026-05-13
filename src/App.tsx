import React, { useEffect, useState } from 'react';
import { Undo2, Redo2, Download, Image as ImageIcon, Layers, SplitSquareHorizontal, Trash2 } from 'lucide-react';
import { CanvasContainer } from './components/canvas/CanvasContainer';
import { Toolbar } from './components/toolbar/Toolbar';
import { RightPanel } from './components/panels/RightPanel';
import { ExportPanel } from './components/panels/ExportPanel';
import { BatchPanel } from './components/panels/BatchPanel';
import { ShortcutsModal } from './components/modals/ShortcutsModal';
import { useImageStore } from './store/imageStore';
import { Tooltip } from './components/ui/Tooltip';
import ClickSpark from './components/ui/ClickSpark';

export default function App() {
  const { 
    currentMatrix, 
    undo, 
    redo, 
    undoStack, 
    redoStack, 
    isExportPanelOpen, 
    setExportPanelOpen,
    isBatchPanelOpen,
    setBatchPanelOpen,
    isShortcutsPanelOpen,
    setShortcutsPanelOpen,
    clearImage
  } = useImageStore();

  const [showOriginal, setShowOriginal] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          if (e.shiftKey) redo();
          else undo();
        }
      }
      if (e.key === '?' && !isShortcutsPanelOpen) {
        setShortcutsPanelOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, isShortcutsPanelOpen, setShortcutsPanelOpen]);

  return (
    <ClickSpark
      sparkColor="#ffffff"
      sparkSize={10}
      sparkRadius={15}
      sparkCount={8}
      duration={400}
    >
      <div className="flex h-screen bg-[#09090b] text-zinc-100 overflow-hidden font-sans selection:bg-indigo-500/30">
        {/* Accent top border */}
      <div className="fixed top-0 left-0 right-0 h-[1px] bg-indigo-500/30 z-50 animate-pulse-soft" />
      
      <Toolbar />
      
      <main className="flex-1 flex flex-col relative min-w-0 bg-[#070708]">
        {/* Top Header */}
        <header className="h-16 border-b border-white/[0.04] bg-[#09090b]/90 backdrop-blur-xl flex items-center justify-between px-8 z-20">
          <div className="flex items-center space-x-10">
            <div className="flex items-center space-x-3.5 group cursor-default">
              <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20 group-hover:border-indigo-500/40 transition-all duration-500">
                <Layers className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform duration-500" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-[15px] font-black tracking-tight text-zinc-100 font-display">PixelCraft</span>
                <span className="text-indigo-400 font-black text-[9px] uppercase tracking-[0.3em] mt-1 opacity-80">Studio Pro</span>
              </div>
            </div>
            
            <div className="h-8 w-[1px] bg-white/[0.06]" />
            
            <div className="flex items-center space-x-2">
              <Tooltip content="Undo (Ctrl+Z)">
                <button onClick={undo} disabled={undoStack.length === 0} className="p-2.5 btn-ghost disabled:opacity-20 disabled:cursor-not-allowed">
                  <Undo2 className="w-4 h-4" />
                </button>
              </Tooltip>
              <Tooltip content="Redo (Ctrl+Shift+Z)">
                <button onClick={redo} disabled={redoStack.length === 0} className="p-2.5 btn-ghost disabled:opacity-20 disabled:cursor-not-allowed">
                  <Redo2 className="w-4 h-4" />
                </button>
              </Tooltip>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {currentMatrix && (
              <Tooltip content="Hold to see original">
                <button 
                  onMouseDown={() => setShowOriginal(true)}
                  onMouseUp={() => setShowOriginal(false)}
                  onMouseLeave={() => setShowOriginal(false)}
                  className={`flex items-center space-x-2.5 px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all duration-300 border ${showOriginal ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/40' : 'btn-secondary'}`}
                >
                  <SplitSquareHorizontal className="w-4 h-4" />
                  <span>Compare</span>
                </button>
              </Tooltip>
            )}

            <div className="h-6 w-[1px] bg-white/[0.06] mx-1" />

            <Tooltip content="Process multiple images">
              <button 
                onClick={() => setBatchPanelOpen(true)}
                className="flex items-center space-x-2.5 px-5 py-2.5 btn-secondary text-[11px] font-bold uppercase tracking-widest"
              >
                <ImageIcon className="w-4 h-4 text-zinc-400" />
                <span>Batch</span>
              </button>
            </Tooltip>

            {currentMatrix && (
              <Tooltip content="Delete current image">
                <button 
                  onClick={clearImage}
                  className="flex items-center space-x-2.5 px-4 py-2.5 btn-secondary text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30 text-[11px] font-bold uppercase tracking-widest transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </Tooltip>
            )}

            <Tooltip content="Save high-quality output">
              <button 
                onClick={() => setExportPanelOpen(true)}
                className="flex items-center space-x-2.5 px-6 py-2.5 btn-primary text-[11px] font-bold uppercase tracking-widest"
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
            </Tooltip>
          </div>
        </header>

        <div className="flex-1 relative">
          <CanvasContainer showOriginal={showOriginal} />
        </div>
      </main>

      <RightPanel />

      <ExportPanel isOpen={isExportPanelOpen} onClose={() => setExportPanelOpen(false)} />
      <BatchPanel isOpen={isBatchPanelOpen} onClose={() => setBatchPanelOpen(false)} />
      <ShortcutsModal isOpen={isShortcutsPanelOpen} onClose={() => setShortcutsPanelOpen(false)} />
      </div>
    </ClickSpark>
  );
}
