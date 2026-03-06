import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  children: React.ReactNode;
  content: string;
  title?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({ children, content, title }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        x: rect.left - 16,
        y: rect.top + rect.height / 2
      });
    }
    setIsVisible(true);
  };

  return (
    <div
      className="inline-flex items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setIsVisible(false)}
      ref={triggerRef}
    >
      {children}
      {isVisible && createPortal(
        <div
          className="fixed z-[9999] w-80 p-4 bg-[#121212]/95 border border-white/10 rounded-lg shadow-[0_10px_40px_rgba(0,0,0,0.5)] pointer-events-none backdrop-blur-md transform -translate-x-full -translate-y-1/2 flex flex-col gap-2"
          style={{ left: coords.x, top: coords.y }}
        >
          {title && <div className="text-[12px] font-bold text-slate-200 uppercase tracking-wider">{title}</div>}
          <div className="text-sm text-slate-400 leading-relaxed normal-case">{content}</div>
          <div className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-3 bg-[#121212]/95 border-r border-t border-white/10 rotate-45"></div>
        </div>,
        document.body
      )}
    </div>
  );
};
