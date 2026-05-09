import React, { type ChangeEvent } from 'react';
import { RotateCcw } from 'lucide-react';
import { Tooltip } from './Tooltip';

interface SliderProps {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  onReset?: () => void;
}

export const Slider: React.FC<SliderProps> = ({ label, min, max, step = 1, value, onChange, onReset }) => {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(Number(e.target.value));
  };

  return (
    <div className="flex flex-col space-y-2 mb-5 last:mb-0 group">
      <div className="flex items-center justify-between">
        <Tooltip content={`Adjust ${label}`}>
          <label className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider group-hover:text-zinc-200 transition-colors">
            {label}
          </label>
        </Tooltip>
        <div className="flex items-center space-x-2">
          <span className="text-[10px] text-zinc-500 font-mono w-8 text-right tabular-nums">
            {value}
          </span>
          {onReset && (
            <button 
              onClick={onReset}
              className="p-1 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 rounded transition-all opacity-0 group-hover:opacity-100"
              title="Reset"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
      <div className="relative flex items-center">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          className="w-full h-[2px] bg-zinc-800 rounded-full appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 transition-all"
          style={{
            background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${((value - min) / (max - min)) * 100}%, #27272a ${((value - min) / (max - min)) * 100}%, #27272a 100%)`
          }}
        />
      </div>
    </div>
  );
};
