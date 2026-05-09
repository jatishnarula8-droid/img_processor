import React, { useEffect, useState } from 'react';
import { Undo2, Redo2, Download, Image as ImageIcon, Layers, SplitSquareHorizontal } from 'lucide-react';
import { CanvasContainer } from './components/canvas/CanvasContainer';
import { Toolbar } from './components/toolbar/Toolbar';
import { RightPanel } from './components/panels/RightPanel';
import { ExportPanel } from './components/panels/ExportPanel';
import { BatchPanel } from './components/panels/BatchPanel';
import { ShortcutsModal } from './components/modals/ShortcutsModal';
import { useImageStore } from './store/imageStore';
import { Tooltip } from './components/ui/Tooltip';

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
    setShortcutsPanelOpen
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
    <div className="flex h-screen bg-[#09090b] text-zinc-100 overflow-hidden font-sans selection:bg-indigo-500/30">
      {/* Accent top border */}
      <div className="fixed top-0 left-0 right-0 h-[1px] bg-indigo-500/40 z-50" />
      
      <Toolbar />
      
      <main className="flex-1 flex flex-col relative min-w-0 bg-[#0c0c0e]">
        {/* Top Header */}
        <header className="h-14 border-b border-zinc-800/60 bg-[#09090b]/80 backdrop-blur-md flex items-center justify-between px-6 z-20">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3">
              <div className="p-1.5 bg-indigo-500/10 rounded-lg">
                <Layers className="w-4 h-4 text-indigo-400" />
              </div>
              <span className="text-[13px] font-semibold tracking-tight text-zinc-200">PixelCraft <span className="text-zinc-500 font-normal text-[11px] ml-1 uppercase tracking-widest">Pro</span></span>
            </div>
            
            <nav className="h-6 w-[1px] bg-zinc-800" />
            
            <div className="flex items-center space-x-1">
              <Tooltip content="Undo (Ctrl+Z)">
                <button onClick={undo} disabled={undoStack.length === 0} className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                  <Undo2 className="w-4 h-4" />
                </button>
              </Tooltip>
              <Tooltip content="Redo (Ctrl+Shift+Z)">
                <button onClick={redo} disabled={redoStack.length === 0} className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                  <Redo2 className="w-4 h-4" />
                </button>
              </Tooltip>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {currentMatrix && (
              <Tooltip content="Compare with original">
                <button 
                  onMouseDown={() => setShowOriginal(true)}
                  onMouseUp={() => setShowOriginal(false)}
                  onMouseLeave={() => setShowOriginal(false)}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${showOriginal ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}
                >
                  <SplitSquareHorizontal className="w-3.5 h-3.5" />
                  <span>Compare</span>
                </button>
              </Tooltip>
            )}

            <div className="h-4 w-[1px] bg-zinc-800 mx-2" />

            <Tooltip content="Batch process multiple images">
              <button 
                onClick={() => setBatchPanelOpen(true)}
                className="flex items-center space-x-2 px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-[11px] font-semibold transition-all border border-zinc-700/50"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Batch</span>
              </button>
            </Tooltip>

            <Tooltip content="Export final image">
              <button 
                onClick={() => setExportPanelOpen(true)}
                className="flex items-center space-x-2 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-bold transition-all shadow-lg shadow-indigo-500/20"
              >
                <Download className="w-3.5 h-3.5" />
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
  );
}
