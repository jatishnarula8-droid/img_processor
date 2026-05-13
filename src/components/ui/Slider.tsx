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
    <div className="flex flex-col space-y-3 mb-6 last:mb-0 group">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest group-hover:text-zinc-300 transition-colors duration-300">
          {label}
        </label>
        <div className="flex items-center space-x-2">
          <div className="bg-zinc-900/50 px-2 py-0.5 rounded border border-white/5">
            <span className="text-[11px] text-indigo-400 font-mono font-bold tabular-nums">
              {value > 0 ? `+${value}` : value}
            </span>
          </div>
          {onReset && value !== 0 && (
            <button 
              onClick={onReset}
              className="p-1 text-zinc-600 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-md transition-all duration-300"
              title="Reset"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
      <div className="relative flex items-center px-0.5">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          className="w-full custom-range"
          style={{
            background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${((value - min) / (max - min)) * 100}%, rgba(39, 39, 42, 0.5) ${((value - min) / (max - min)) * 100}%, rgba(39, 39, 42, 0.5) 100%)`
          }}
        />
      </div>
    </div>
  );
};
