
import React, { useState } from 'react';

interface DrillModalProps {
    onClose: () => void;
}

const DrillModal: React.FC<DrillModalProps> = ({ onClose }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [flipped, setFlipped] = useState(false);

    // Mock Drill Data (In future, this comes from API based on user weakness)
    const questions = [
        { q: "I am very happy.", a: "I am over the moon." },
        { q: "It is raining heavily.", a: "It is pouring down." },
        { q: "I agree with you.", a: "We are on the same page." },
        { q: "It is expensive.", a: "It costs an arm and a leg." }
    ];

    const handleNext = () => {
        setFlipped(false);
        if (currentStep < questions.length - 1) {
            setCurrentStep(s => s + 1);
        } else {
            alert("Drill Completed! +10 XP");
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="w-full max-w-md">
                <div className="flex justify-between items-center mb-6 text-white">
                    <h2 className="text-xl font-bold">⚡ Daily Paraphrasing Drill</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
                </div>

                <div 
                    className="relative h-64 w-full cursor-pointer perspective-1000 mb-8 group"
                    onClick={() => setFlipped(!flipped)}
                >
                    <div className={`relative w-full h-full duration-500 preserve-3d transition-transform ${flipped ? 'rotate-y-180' : ''}`} style={{ transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : '' }}>
                        {/* FRONT */}
                        <div className="absolute inset-0 backface-hidden bg-slate-800 rounded-2xl flex flex-col items-center justify-center border-2 border-slate-700 shadow-2xl p-6 text-center">
                            <p className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-4">Transform this:</p>
                            <h3 className="text-3xl font-bold text-white">"{questions[currentStep].q}"</h3>
                            <p className="text-xs text-slate-500 mt-8">(Click to flip)</p>
                        </div>

                        {/* BACK */}
                        <div className="absolute inset-0 backface-hidden bg-gradient-to-br from-cyan-600 to-blue-700 rounded-2xl flex flex-col items-center justify-center border-2 border-cyan-400 shadow-2xl p-6 text-center" style={{ transform: 'rotateY(180deg)' }}>
                            <p className="text-xs text-cyan-200 uppercase font-bold tracking-widest mb-4">Advanced Version:</p>
                            <h3 className="text-3xl font-bold text-white">"{questions[currentStep].a}"</h3>
                        </div>
                    </div>
                </div>

                <div className="flex justify-between items-center">
                    <div className="text-slate-500 text-sm font-mono">{currentStep + 1} / {questions.length}</div>
                    <button 
                        onClick={handleNext}
                        className="bg-white text-slate-900 px-6 py-3 rounded-full font-bold hover:bg-cyan-50 transition-colors shadow-lg"
                    >
                        {currentStep === questions.length - 1 ? 'Finish' : 'Next Card →'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DrillModal;
