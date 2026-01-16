import React, { useState, useRef, useEffect, useCallback } from 'react';

interface ComparisonViewProps {
  originalUrl: string;
  editedUrl: string;
}

export const ComparisonView: React.FC<ComparisonViewProps> = ({ originalUrl, editedUrl }) => {
  const [isResizing, setIsResizing] = useState(false);
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  const startResizing = useCallback(() => setIsResizing(true), []);
  const stopResizing = useCallback(() => setIsResizing(false), []);

  const resize = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isResizing || !containerRef.current) return;
    
    const { left, width } = containerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    
    let newPos = ((clientX - left) / width) * 100;
    newPos = Math.max(0, Math.min(100, newPos));
    setPosition(newPos);
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('touchmove', resize);
      window.addEventListener('mouseup', stopResizing);
      window.addEventListener('touchend', stopResizing);
    }
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('touchmove', resize);
      window.removeEventListener('mouseup', stopResizing);
      window.removeEventListener('touchend', stopResizing);
    };
  }, [isResizing, resize, stopResizing]);

  return (
    <div className="w-full max-w-2xl mx-auto select-none">
      <div 
        ref={containerRef}
        className="relative w-full aspect-square rounded-lg border border-slate-600 bg-slate-900 overflow-hidden cursor-ew-resize touch-none shadow-xl"
        onMouseDown={startResizing}
        onTouchStart={startResizing}
      >
        {/* After Image (Background) */}
        <img 
            src={editedUrl} 
            alt="After" 
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        />
        
        {/* Before Image (Foreground - Clipped) */}
        <img 
            src={originalUrl} 
            alt="Before" 
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
            style={{ clipPath: `polygon(0 0, ${position}% 0, ${position}% 100%, 0 100%)` }}
        />

        {/* Labels */}
        <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg pointer-events-none z-20">Before</div>
        <div className="absolute top-4 right-4 bg-indigo-600/80 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg pointer-events-none z-20">After</div>

        {/* Slider Handle Line */}
        <div 
            className="absolute top-0 bottom-0 w-0.5 bg-white z-10 shadow-[0_0_10px_rgba(0,0,0,0.5)]"
            style={{ left: `${position}%` }}
        ></div>
        
        {/* Slider Handle Button */}
        <div 
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-30 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(0,0,0,0.3)] text-indigo-600 border-2 border-indigo-100"
            style={{ left: `${position}%` }}
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" transform="rotate(90 10 10)" />
            </svg>
        </div>
      </div>
      <p className="text-center text-slate-400 text-sm mt-3 flex items-center justify-center gap-2">
         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
         Drag slider to compare results
      </p>
    </div>
  );
};
