import React from 'react';

const HistoryIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

interface HeaderProps {
    onToggleHistory: () => void;
}

const Header: React.FC<HeaderProps> = ({ onToggleHistory }) => (
  <header className="p-6 md:p-8 w-full bg-[linear-gradient(to_right,_#fed7aa,_#fbcfe8,_#bbf7d0,_#ddd6fe)] shadow-lg">
    <div className="flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center">
            <div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-800">OutFitAI</h1>
                <p className="text-sm sm:text-base text-slate-600 mt-1">Your Personal Virtual Try-On Stylist</p>
            </div>
        </div>
        <button 
            onClick={onToggleHistory} 
            className="p-3 text-slate-800 rounded-full hover:bg-black/10 transition-colors duration-200"
            aria-label="Toggle creation history"
        >
            <HistoryIcon />
        </button>
    </div>
  </header>
);

export default Header;