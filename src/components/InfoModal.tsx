import React, { useEffect } from 'react';

export interface InfoModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ATTRIBUTIONS = [
    { name: '@mediapipe/tasks-vision', author: 'mediapipe@google.com', license: 'Apache-2.0' },
    { name: '@tailwindcss/vite', author: 'Tailwind Labs', license: 'MIT' },
    { name: '@types/three', author: 'DefinitelyTyped', license: 'MIT' },
    { name: 'ambisonics', author: 'Archontis Politis', license: 'BSD-3-Clause' },
    { name: 'lucide-react', author: 'Eric Fennis', license: 'ISC' },
    { name: 'motion', author: 'Matt Perry', license: 'MIT' },
    { name: 'react / react-dom', author: 'Meta', license: 'MIT' },
    { name: 'tailwindcss', author: 'Tailwind Labs', license: 'MIT' },
    { name: 'three', author: 'mrdoob', license: 'MIT' },
];

export const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose }) => {
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleEscape);
        }
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-md p-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-2xl bg-[#121212] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[85vh] animate-in fade-in zoom-in-95 duration-200 relative"
                onClick={e => e.stopPropagation()}
            >
                {/* Close Button - Absolute Positioning */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                    <span className="material-symbols-outlined font-light">close</span>
                </button>

                {/* Hero Branding Section (Centered Re-Order) */}
                <div className="flex flex-col items-center justify-center text-center pt-12 pb-8 px-6 shrink-0 gap-3">
                    <h2 className="text-2xl font-bold text-slate-100 normal-case font-display tracking-tight">
                        AmbiViz
                    </h2>

                    <p className="text-[#999] text-[0.8rem] normal-case tracking-wide font-light">
                        Created by Craig Van Hise
                    </p>

                    <a
                        href="https://www.virtualvirgin.net/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block transition-transform duration-200 hover:scale-[1.05] cursor-pointer mt-2"
                    >
                        <img
                            src="Virtual Virgin + VV logo card.png"
                            alt="Virtual Virgin"
                            className="w-full max-w-[180px] object-contain"
                        />
                    </a>
                </div>

                {/* Subtle Horizontal Divider */}
                <div className="mx-6 border-b border-white/10" />

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar text-left">
                    <div className="space-y-6">
                        <div className="space-y-6">
                            <section>
                                <h3 className="text-sm font-bold text-slate-200 mb-2 normal-case">The Mission</h3>
                                <p className="text-sm text-slate-300 font-light leading-[1.6] normal-case">
                                    AmbiViz was built to solve the accessibility gap in 3DoF listening.
                                    While 3D audio usually requires specialized hardware, AmbiViz uses webcam-based head tracking to let anyone
                                    experience Ambisonic mixes with standard headphones.
                                </p>
                            </section>
                            <section>
                                <h3 className="text-sm font-bold text-slate-200 mb-2 normal-case">The Technology</h3>
                                <p className="text-sm text-slate-300 font-light leading-[1.6] normal-case">
                                    This tool serves as a high-fidelity showcase for creators to drag-and-drop their own spatial projects,
                                    mapping 3rd-order Ambisonic energy onto an interactive 3D sphere for real-time analysis.
                                </p>
                            </section>
                        </div>

                        <div className="space-y-3 pt-6 border-t border-white/10">
                            <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Acknowledgments</h3>
                            <ul className="list-disc pl-5 text-xs text-slate-400 font-light space-y-2 normal-case">
                                <li>
                                    <strong>Google Open Binaural Renderer (OBR)</strong>: Ambisonic decoding and spatialization powered by Google's OBR (Apache-2.0).
                                </li>
                                <li>
                                    <strong>Audio Asset</strong>: '3rd Order Ambi Clock Test.opus' is adapted from <a href="https://freesound.org/people/clucs/sounds/428571/" target="_blank" rel="noopener noreferrer" className="text-primary-light hover:underline">Ambisonic Clock by clucs</a> on Freesound.
                                </li>
                                <li>
                                    <strong>Music Examples</strong>: The included music examples are virtual orchestrations arranged, mixed, and mastered (though not originally composed) by the creator. Discover more audio examples at <a href="https://www.virtualvirgin.net/audio-examples" target="_blank" rel="noopener noreferrer" className="text-primary-light hover:underline">Virtual Virgin</a>.
                                </li>
                            </ul>
                        </div>

                        <div className="space-y-3 pt-6 border-t border-white/10">
                            <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Open Source Attribution</h3>
                            <div className="overflow-x-auto bg-black/40 rounded-xl border border-white/5">
                                <table className="w-full text-left text-sm normal-case min-w-[500px]">
                                    <thead className="bg-white/5 text-slate-400 border-b border-white/5">
                                        <tr>
                                            <th className="p-2 font-medium text-left">Library</th>
                                            <th className="p-2 font-medium text-left">Author</th>
                                            <th className="p-2 font-medium text-left">License</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-slate-300">
                                        {ATTRIBUTIONS.map((attr, idx) => (
                                            <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                                                <td className="p-2 text-left font-mono text-[11px] text-primary-light border-b border-gray-700/50">{attr.name}</td>
                                                <td className="p-2 text-left border-b border-gray-700/50">{attr.author}</td>
                                                <td className="p-2 text-left text-slate-400 border-b border-gray-700/50">{attr.license}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Footer */}
                <div className="px-6 py-4 border-t border-white/10 shrink-0 bg-white/5 flex justify-end">
                    <a
                        href="https://github.com/craig-van-hise/ambi-viz"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors border border-white/10 hover:border-white/20 normal-case"
                    >
                        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
                            <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"></path>
                        </svg>
                        View Source on GitHub
                    </a>
                </div>
            </div>
        </div>
    );
};
