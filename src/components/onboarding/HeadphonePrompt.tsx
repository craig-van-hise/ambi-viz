import { useOnboarding } from './OnboardingContext';
import { Headphones } from 'lucide-react';

export const HeadphonePrompt = () => {
  const { advanceStep } = useOnboarding();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
      <div className="max-w-md w-full mx-4 p-8 rounded-2xl bg-slate-900/80 border border-slate-700/50 shadow-2xl text-center flex flex-col items-center gap-6 transform transition-all duration-300 scale-100 animate-in fade-in zoom-in-95 duration-200">
        <div className="w-16 h-16 flex items-center justify-center rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-lg text-white">
          <Headphones className="w-8 h-8 animate-pulse" />
        </div>
        
        <div className="space-y-3">
          <h2 className="text-xl font-bold tracking-tight text-white">
            Step 1: Put on your headphones
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            3D spatial audio requires headphones to work. Put them on now to experience fully immersive soundscapes.
          </p>
        </div>

        <button
          onClick={advanceStep}
          className="w-full py-3 px-6 rounded-xl font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 active:scale-[0.98] shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer"
        >
          I'm wearing headphones
        </button>
      </div>
    </div>
  );
};
