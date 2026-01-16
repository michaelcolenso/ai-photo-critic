
import React from 'react';

const CameraIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 sm:h-12 sm:w-12 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);


export const Header: React.FC = () => {
  return (
    <header className="text-center">
        <div className="flex justify-center items-center gap-4">
            <CameraIcon />
            <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">
                Photo Critic AI
            </h1>
        </div>
      <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
        Get instant, expert feedback on your photos. Upload an image to receive a detailed critique powered by Gemini.
      </p>
    </header>
  );
};
