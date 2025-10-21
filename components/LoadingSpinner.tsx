import React, { useState, useEffect } from 'react';

interface LoadingSpinnerProps {
  messages?: string[];
}

const DEFAULT_MESSAGE = "AI is working its magic...";
const MESSAGE_CHANGE_INTERVAL_MS = 2500;

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ messages }) => {
  const [currentMessage, setCurrentMessage] = useState(messages && messages.length > 0 ? messages[0] : DEFAULT_MESSAGE);
  
  useEffect(() => {
    if (!messages || messages.length <= 1) {
      setCurrentMessage(messages?.[0] || DEFAULT_MESSAGE);
      return;
    };
    
    let messageIndex = 0;
    const interval = setInterval(() => {
      messageIndex = (messageIndex + 1) % messages.length;
      setCurrentMessage(messages[messageIndex]);
    }, MESSAGE_CHANGE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [messages]);
  
  return (
    <div className="flex flex-col items-center justify-center space-y-4 mt-6 w-full max-w-sm mx-auto">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      <p className="text-indigo-600 text-center font-medium transition-opacity duration-500">{currentMessage}</p>
       <div className="w-full bg-indigo-200 rounded-full h-2.5 overflow-hidden">
          <div className="bg-indigo-500 h-2.5 rounded-full w-full animate-pulse"></div>
      </div>
    </div>
  );
};

export default LoadingSpinner;
