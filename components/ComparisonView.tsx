
import React, { useState, useRef, useEffect, useCallback } from 'react';

interface ComparisonViewProps {
  originalUrl: string;
  editedUrl: string;
}

export const ComparisonView: React.FC<ComparisonViewProps> = ({ originalUrl, editedUrl }) => {
  const [isResizing, setIsResizing] = useState(false);
  const [sliderPosition, setSliderPosition] = useState(50);
  
  // Zoom & Pan State
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // --- Slider Logic ---

  const updateSliderPosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const { left, width } = containerRef.current.getBoundingClientRect();
    let newPos = ((clientX - left) / width) * 100;
    newPos = Math.max(0, Math.min(100, newPos));
    setSliderPosition(newPos);
  }, []);

  const startResizing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault(); // Prevent text selection/scrolling
    setIsResizing(true);
    
    // Immediate jump if clicking track (optional, but snappy)
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    updateSliderPosition(clientX);
  }, [updateSliderPosition]);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  // --- Pan Logic ---

  const startPanning = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsPanning(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    panStartRef.current = { x: clientX - pan.x, y: clientY - pan.y };
  }, [pan]);

  const stopPanning = useCallback(() => {
    setIsPanning(false);
    panStartRef.current = null;
  }, []);

  // --- Global Mouse/Touch Move Handler ---

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
        if (isResizing) {
            const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
            updateSliderPosition(clientX);
        } else if (isPanning && panStartRef.current) {
            const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
            const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
            
            // Calculate new pan
            let newX = clientX - panStartRef.current.x;
            let newY = clientY - panStartRef.current.y;
            
            // Optional: Bound checking could go here, but free pan is often smoother for simple tools
            setPan({ x: newX, y: newY });
        }
    };

    const handleUp = () => {
        if (isResizing) stopResizing();
        if (isPanning) stopPanning();
    };

    if (isResizing || isPanning) {
      window.addEventListener('mousemove', handleMove, { passive: false });
      window.addEventListener('touchmove', handleMove, { passive: false });
      window.addEventListener('mouseup', handleUp);
      window.addEventListener('touchend', handleUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchend', handleUp);
    };
  }, [isResizing, isPanning, updateSliderPosition, stopResizing, stopPanning]);


  // --- Zoom Controls ---
  const handleZoomIn = () => setScale(s => Math.min(s * 1.5, 8));
  const handleZoomOut = () => {
      setScale(s => {
          const newScale = s / 1.5;
          if (newScale < 1.1) {
              setPan({ x: 0, y: 0 }); // Reset pan when zooming out to fit
              return 1;
          }
          return newScale;
      });
  };
  const handleReset = () => {
      setScale(1);
      setPan({ x: 0, y: 0 });
      setSliderPosition(50);
  };

  // Determine interaction mode for container
  // If Scale > 1, container drag = PAN.
  // If Scale = 1, container drag = SLIDER (classic behavior).
  // The Slider Handle ALWAYS triggers slider drag.
  const handleContainerMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
      if (scale > 1) {
          startPanning(e);
      } else {
          startResizing(e);
      }
  };

  return (
    <div className="w-full max-w-2xl mx-auto select-none space-y-3">
      <div 
        ref={containerRef}
        className={`relative w-full aspect-square rounded-xl border border-slate-700 bg-slate-900 overflow-hidden shadow-2xl touch-none group ${isPanning ? 'cursor-grabbing' : isResizing ? 'cursor-ew-resize' : scale > 1 ? 'cursor-grab' : 'cursor-ew-resize'}`}
        onMouseDown={handleContainerMouseDown}
        onTouchStart={handleContainerMouseDown}
      >
         {/* Background pattern to show transparency if needed */}
         <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] opacity-20 pointer-events-none"></div>

        {/* Content Container (Handles Pan/Zoom) */}
        <div className="absolute inset-0 w-full h-full pointer-events-none">
            
            {/* Layer 1: After Image (Full visibility) */}
            <div 
                className="absolute inset-0 flex items-center justify-center transition-transform duration-75 ease-out"
                style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` }}
            >
                <img 
                    src={editedUrl} 
                    alt="After" 
                    className="max-w-full max-h-full object-contain"
                    draggable={false}
                />
            </div>

            {/* Layer 2: Before Image (Clipped) */}
            {/* The Clip Wrapper is fixed to the viewport and controls the reveal */}
            <div 
                className="absolute inset-0 overflow-hidden"
                style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
            >
                 {/* The inner container matches the transform of Layer 1 perfectly */}
                <div 
                    className="absolute inset-0 flex items-center justify-center transition-transform duration-75 ease-out"
                    style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` }}
                >
                    <img 
                        src={originalUrl} 
                        alt="Before" 
                        className="max-w-full max-h-full object-contain"
                        draggable={false}
                    />
                </div>
            </div>
        </div>

        {/* Labels (Fade out when zoomed to avoid obstruction) */}
        <div className={`transition-opacity duration-300 ${scale > 1 ? 'opacity-0' : 'opacity-100'}`}>
            <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full pointer-events-none z-20 border border-white/10">Original</div>
            <div className="absolute top-4 right-4 bg-indigo-600/80 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full pointer-events-none z-20 border border-white/10">Edited</div>
        </div>

        {/* Slider Line & Handle */}
        <div 
            className="absolute top-0 bottom-0 w-0.5 bg-white/50 z-10 pointer-events-none"
            style={{ left: `${sliderPosition}%` }}
        ></div>
        
        {/* Slider Handle Button (Draggable Area) */}
        <div 
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-30 w-12 h-12 flex items-center justify-center cursor-ew-resize group/handle"
            style={{ left: `${sliderPosition}%` }}
            onMouseDown={(e) => { e.stopPropagation(); startResizing(e); }}
            onTouchStart={(e) => { e.stopPropagation(); startResizing(e); }}
        >
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(0,0,0,0.5)] text-indigo-600 border-2 border-indigo-100 transition-transform group-hover/handle:scale-110">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" transform="rotate(90 10 10)" />
                </svg>
            </div>
        </div>

        {/* Zoom Controls Overlay */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-slate-900/80 backdrop-blur-md p-1.5 rounded-lg border border-slate-700 shadow-xl z-40" onMouseDown={e => e.stopPropagation()}>
            <button 
                onClick={handleZoomOut}
                disabled={scale <= 1}
                className="p-2 text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-md disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                title="Zoom Out"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                </svg>
            </button>
            <span className="text-xs font-mono w-12 text-center text-slate-400">{Math.round(scale * 100)}%</span>
            <button 
                onClick={handleZoomIn}
                disabled={scale >= 8}
                className="p-2 text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-md disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                title="Zoom In"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                </svg>
            </button>
            <div className="w-px h-5 bg-slate-700 mx-1"></div>
            <button 
                 onClick={handleReset}
                 className="px-3 py-1.5 text-xs font-semibold text-indigo-300 hover:text-white hover:bg-indigo-600/20 rounded-md transition-colors"
            >
                Reset
            </button>
        </div>

      </div>
      
      <p className="text-center text-slate-500 text-xs mt-2">
         {scale > 1 ? 'Drag image to pan • Drag handle to compare' : 'Drag handle to compare • Use controls to zoom'}
      </p>
    </div>
  );
};
