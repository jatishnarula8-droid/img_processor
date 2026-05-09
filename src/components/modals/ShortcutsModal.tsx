import React, { useEffect } from 'react';
import { X, Command } from 'lucide-react';
import { useImageStore } from '../../store/imageStore';

export const ShortcutsModal: React.FC = () => {
  const { isShortcutsPanelOpen, toggleShortcutsPanel } = useImageStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle on ? (Shift + /)
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Prevent typing it into inputs
        if (document.activeElement?.tagName === 'INPUT') return;
        e.preventDefault();
        toggleShortcutsPanel();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [toggleShortcutsPanel]);

  if (!isShortcutsPanelOpen) return null;

  const shortcuts = [
    { key: 'Ctrl + Z', label: 'Undo last action' },
    { key: 'Ctrl + Shift + Z', label: 'Redo action' },
    { key: 'Shift + Scroll', label: 'Pan canvas horizontally' },
    { key: 'Scroll', label: 'Pan canvas vertically' },
    { key: 'Ctrl + Scroll', label: 'Zoom canvas in/out' },
    { key: 'Middle Click + Drag', label: 'Pan canvas freely' },
    { key: '?', label: 'Toggle this shortcuts menu' },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 transition-all duration-150">
      <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
          <h2 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
            <Command className="w-5 h-5 text-blue-500" />
            <span>Keyboard Shortcuts</span>
          </h2>
          <button onClick={toggleShortcutsPanel} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 gap-3">
            {shortcuts.map((sc, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-slate-700/50 last:border-0">
                <span className="text-sm font-medium text-slate-300">{sc.label}</span>
                <kbd className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs font-mono text-slate-400 shadow-sm">
                  {sc.key}
                </kbd>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
