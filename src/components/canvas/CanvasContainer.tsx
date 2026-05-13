import React, { useRef } from 'react';
import { UploadCloud } from 'lucide-react';
import { useImageStore } from '../../store/imageStore';
import { CropOverlay } from './CropOverlay';
import { CanvasViewport } from './CanvasViewport';

export const CanvasContainer: React.FC<{ showOriginal?: boolean }> = ({ showOriginal }) => {
  const { currentMatrix, loadImage, isProcessing } = useImageStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await loadImage(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      await loadImage(file);
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#09090b] relative overflow-hidden">
      {/* Checkerboard Background */}
      <div className="absolute inset-0 opacity-[0.03]" 
           style={{ backgroundImage: 'conic-gradient(#fff 90deg, #000 90deg 180deg, #fff 180deg 270deg, #000 270deg)', backgroundSize: '20px 20px' }} />

      {!currentMatrix ? (
        <div 
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="relative group cursor-pointer"
        >
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative w-[480px] h-64 bg-[#121214] border border-zinc-800/50 rounded-2xl flex flex-col items-center justify-center transition-all group-hover:border-zinc-700">
            <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mb-6 shadow-inner border border-zinc-800 group-hover:scale-110 transition-transform">
              <UploadCloud className="w-8 h-8 text-indigo-400" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-100 tracking-tight">
              {isProcessing ? "Processing workspace..." : "Start a new project"}
            </h3>
            <p className="text-zinc-500 text-[13px] mt-2">Drag and drop an image or click to browse</p>
            <div className="mt-8 flex items-center space-x-4">
              <span className="px-2 py-1 bg-zinc-800 rounded text-[10px] text-zinc-500 font-mono">PNG</span>
              <span className="px-2 py-1 bg-zinc-800 rounded text-[10px] text-zinc-500 font-mono">JPG</span>
              <span className="px-2 py-1 bg-zinc-800 rounded text-[10px] text-zinc-500 font-mono">WEBP</span>
            </div>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>
      ) : (
        <div className="relative w-full h-full">
          <CanvasViewport showOriginal={showOriginal} />
          <CropOverlay />
        </div>
      )}
    </div>
  );
};
