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
  <header className="p-6 md:p-8 w-full max-w-7xl mx-auto bg-gradient-to-r from-pink-500 to-violet-600 rounded-xl shadow-lg mt-4 sm:mt-8">
    <div className="flex justify-between items-center">
        <div className="text-left">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
              OutFitAI
            </h1>
            <p className="text-lg font-semibold text-white opacity-90">Your Personal Virtual Fitting Room</p>
        </div>
        <button
            onClick={onToggleHistory}
            className="p-2 text-white rounded-full hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50 transition-colors duration-200"
            aria-label="Open creation history"
        >
            <HistoryIcon />
        </button>
    </div>
  </header>
);

export default Header;
