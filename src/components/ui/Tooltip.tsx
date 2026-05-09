import React, { useState, useRef, useEffect } from 'react';

interface TooltipProps {
  children: React.ReactNode;
  content: string;
  delay?: number;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const Tooltip: React.FC<TooltipProps> = ({ 
  children, 
  content, 
  delay = 500,
  position = 'top'
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const handleMouseEnter = () => {
    timeoutRef.current = window.setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  let positionClasses = '';
  switch (position) {
    case 'top': positionClasses = 'bottom-full left-1/2 -translate-x-1/2 mb-2'; break;
    case 'bottom': positionClasses = 'top-full left-1/2 -translate-x-1/2 mt-2'; break;
    case 'left': positionClasses = 'right-full top-1/2 -translate-y-1/2 mr-2'; break;
    case 'right': positionClasses = 'left-full top-1/2 -translate-y-1/2 ml-2'; break;
  }

  return (
    <div 
      className="relative flex items-center justify-center group"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {isVisible && (
        <div className={`absolute z-[100] px-2.5 py-1.5 bg-[#121214] border border-zinc-800 text-zinc-200 text-[10px] font-bold uppercase tracking-wider rounded-md shadow-2xl shadow-black/80 whitespace-nowrap animate-in fade-in zoom-in-95 duration-200 ${positionClasses}`}>
          <div className="absolute inset-0 bg-indigo-500/5 rounded-md" />
          <span className="relative z-10">{content}</span>
        </div>
      )}
    </div>
  );
};
