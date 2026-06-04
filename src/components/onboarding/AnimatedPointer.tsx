import { motion } from 'motion/react';
import { ArrowRight, ArrowLeft, ArrowUp, ArrowDown } from 'lucide-react';

interface AnimatedPointerProps {
  text: string;
  direction: 'left' | 'right' | 'up' | 'down';
}

export const AnimatedPointer = ({ text, direction }: AnimatedPointerProps) => {
  const getArrow = () => {
    switch (direction) {
      case 'left': return <ArrowLeft className="w-8 h-8 text-cyan-400 animate-pulse" />;
      case 'right': return <ArrowRight className="w-8 h-8 text-cyan-400 animate-pulse" />;
      case 'up': return <ArrowUp className="w-8 h-8 text-cyan-400 animate-pulse" />;
      case 'down': return <ArrowDown className="w-8 h-8 text-cyan-400 animate-pulse" />;
    }
  };

  const getAnimationProps = () => {
    switch (direction) {
      case 'left':
        return {
          animate: { x: [-10, 3, -10] },
          transition: { repeat: Infinity, duration: 1.5, ease: "easeInOut" as const }
        };
      case 'right':
        return {
          animate: { x: [10, -3, 10] },
          transition: { repeat: Infinity, duration: 1.5, ease: "easeInOut" as const }
        };
      case 'up':
        return {
          animate: { y: [-10, 3, -10] },
          transition: { repeat: Infinity, duration: 1.5, ease: "easeInOut" as const }
        };
      case 'down':
        return {
          animate: { y: [10, -3, 10] },
          transition: { repeat: Infinity, duration: 1.5, ease: "easeInOut" as const }
        };
    }
  };

  return (
    <motion.div
      {...getAnimationProps()}
      className="flex items-center gap-2 px-6 py-3 rounded-lg bg-slate-900/95 border border-cyan-500/40 shadow-lg shadow-cyan-500/50 text-cyan-200 text-lg uppercase font-bold tracking-wider backdrop-blur-md pointer-events-none select-none z-50 whitespace-nowrap"
    >
      {direction === 'left' || direction === 'up' || direction === 'down' ? getArrow() : null}
      <span>{text}</span>
      {direction === 'right' ? getArrow() : null}
    </motion.div>
  );
};
