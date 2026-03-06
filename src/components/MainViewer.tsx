import React from 'react';

interface MainViewerProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  isDragOver: boolean;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  children?: React.ReactNode;
}

export const MainViewer: React.FC<MainViewerProps> = ({
  containerRef,
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  children,
}) => {
  return (
    <section 
      className={`flex-1 relative canvas-bg overflow-hidden min-w-0 @container ${isDragOver ? 'border-2 border-primary' : ''}`}
      onDragOver={onDragOver} 
      onDragLeave={onDragLeave} 
      onDrop={onDrop}
    >
      {/* 3D Canvas Container */}
      <div ref={containerRef} className="absolute inset-0 z-0" />
      {children}
    </section>
  );
};
