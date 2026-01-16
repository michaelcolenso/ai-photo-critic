
import React, { useState } from 'react';
import { PhotoAnalysis } from '../types';

interface AnalysisDisplayProps {
  analysis: PhotoAnalysis;
}

const StarIcon: React.FC<{ filled: boolean }> = ({ filled }) => (
  <svg
    className={`w-6 h-6 ${filled ? 'text-amber-400' : 'text-slate-600'}`}
    fill="currentColor"
    viewBox="0 0 20 20"
  >
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

const RatingStars: React.FC<{ rating: number }> = ({ rating }) => {
  const totalStars = 10;
  const clampedRating = Math.max(0, Math.min(totalStars, Math.round(rating)));
  return (
    <div className="flex items-center">
      {Array.from({ length: totalStars }, (_, i) => (
        <StarIcon key={i} filled={i < clampedRating} />
      ))}
       <span className="ml-3 text-2xl font-bold text-slate-200">{rating.toFixed(1)}/10</span>
    </div>
  );
};

const AnalysisSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="mb-4">
        <h3 className="text-lg font-semibold text-indigo-400 mb-2">{title}</h3>
        <p className="text-slate-300 leading-relaxed">{children}</p>
    </div>
);

const EditCard: React.FC<{ edit: { edit: string; reason: string }, index: number }> = ({ edit, index }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div 
            className={`border rounded-lg p-3 transition-all duration-300 cursor-pointer hover:bg-slate-700/40 ${isExpanded ? 'bg-slate-700/60 border-indigo-500/50' : 'bg-slate-800/40 border-slate-700'}`}
            onClick={() => setIsExpanded(!isExpanded)}
        >
            <div className="flex items-start gap-3">
                <span className={`flex-shrink-0 h-6 w-6 rounded-full text-xs font-bold flex items-center justify-center mt-0.5 transition-colors ${isExpanded ? 'bg-indigo-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                    {index + 1}
                </span>
                <div className="flex-1">
                    <p className={`text-sm font-medium ${isExpanded ? 'text-indigo-200' : 'text-slate-200'}`}>
                        {edit.edit}
                    </p>
                    <div className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100 mt-2' : 'grid-rows-[0fr] opacity-0'}`}>
                        <div className="overflow-hidden">
                            <p className="text-xs text-slate-400 italic pl-1 border-l-2 border-indigo-500/30">
                                <span className="font-semibold not-italic text-indigo-400/80 mr-1">Context:</span> 
                                {edit.reason}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="text-slate-500">
                    <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className={`h-4 w-4 transform transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>
        </div>
    );
};

export const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ analysis }) => {
  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Overall Rating</h2>
        <RatingStars rating={analysis.rating} />
      </div>

      {/* Suggested Edits Highlight */}
      <div className="bg-gradient-to-br from-indigo-900/20 to-slate-900/40 border border-indigo-500/30 rounded-xl p-5 shadow-lg">
        <h3 className="text-lg font-bold text-indigo-300 mb-4 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
            </svg>
            Top 3 Recommended Edits
        </h3>
        <p className="text-xs text-slate-400 mb-4 -mt-2 ml-7">Click an item to see why it matters.</p>
        <div className="space-y-3">
            {analysis.suggested_edits.map((edit, index) => (
                <EditCard key={index} edit={edit} index={index} />
            ))}
        </div>
      </div>

      <div className="space-y-4">
        <AnalysisSection title="Composition">
            {analysis.composition}
        </AnalysisSection>
        <AnalysisSection title="Lighting">
            {analysis.lighting}
        </AnalysisSection>
        <AnalysisSection title="Subject & Focus">
            {analysis.subject}
        </AnalysisSection>
        <AnalysisSection title="Overall Comments">
            {analysis.overall_comment}
        </AnalysisSection>
      </div>
    </div>
  );
};

// Add a simple fade-in animation to tailwind config or a style tag if not using a full config
const style = document.createElement('style');
style.innerHTML = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-in {
    animation: fadeIn 0.5s ease-out forwards;
  }
`;
document.head.appendChild(style);
