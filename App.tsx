
import React, { useState, useCallback, useEffect } from 'react';
import { PhotoAnalysis } from './types';
import { analyzeImage, generateImprovedImage } from './services/geminiService';
import { Header } from './components/Header';
import { ImageUpload } from './components/ImageUpload';
import { AnalysisDisplay } from './components/AnalysisDisplay';
import { Spinner } from './components/Spinner';
import { ComparisonView } from './components/ComparisonView';

// Helper function to convert file to base64
const fileToBase64 = (file: File): Promise<{mimeType: string, data: string}> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        return reject(new Error('FileReader did not return a string.'));
      }
      const base64String = reader.result.split(',')[1];
      resolve({ mimeType: file.type, data: base64String });
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

const App: React.FC = () => {
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [checkingKey, setCheckingKey] = useState<boolean>(true);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<PhotoAnalysis | null>(null);
  
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    const checkKey = async () => {
      try {
        if (window.aistudio) {
          const hasKey = await window.aistudio.hasSelectedApiKey();
          setHasApiKey(hasKey);
        } else {
          // If not in the AI Studio environment, assume key is managed via env vars or other means
          setHasApiKey(true);
        }
      } catch (e) {
        console.error("Error checking API key:", e);
      } finally {
        setCheckingKey(false);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio) {
      try {
        await window.aistudio.openSelectKey();
        setHasApiKey(true);
      } catch (e) {
        console.error("Failed to select key:", e);
      }
    }
  };

  const handleImageSelect = useCallback((file: File | null) => {
    setAnalysisResult(null);
    setAnalysisError(null);
    setEditedImage(null);
    setEditError(null);
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setSelectedFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(null);
    }
  }, [previewUrl]);

  const handleAnalyzeClick = async () => {
    if (!selectedFile) {
      setAnalysisError("Please select an image file first.");
      return;
    }

    setIsLoadingAnalysis(true);
    setAnalysisError(null);
    setAnalysisResult(null);
    setEditedImage(null); // Reset edit on new analysis

    try {
      const { mimeType, data } = await fileToBase64(selectedFile);
      const result = await analyzeImage(data, mimeType);
      setAnalysisResult(result);
    } catch (err: unknown) {
      console.error("Analysis failed:", err);
      setAnalysisError(err instanceof Error ? err.message : "An unknown error occurred during analysis.");
    } finally {
      setIsLoadingAnalysis(false);
    }
  };

  const handleEditClick = async () => {
     if (!selectedFile || !analysisResult) return;

     setIsEditing(true);
     setEditError(null);
     
     try {
       const { mimeType, data } = await fileToBase64(selectedFile);
       
       // Get original dimensions to intelligently determine aspect ratio
       const dimensions = await new Promise<{width: number, height: number}>((resolve) => {
           const img = new Image();
           img.onload = () => resolve({ width: img.width, height: img.height });
           img.onerror = () => resolve({ width: 1000, height: 1000 }); // Fallback
           img.src = previewUrl || URL.createObjectURL(selectedFile);
       });

       const improvedImageBase64 = await generateImprovedImage(data, mimeType, analysisResult, dimensions.width, dimensions.height);
       setEditedImage(`data:image/png;base64,${improvedImageBase64}`);
     } catch (err: unknown) {
        console.error("Editing failed:", err);
        setEditError(err instanceof Error ? err.message : "Failed to generate edited image.");
     } finally {
        setIsEditing(false);
     }
  };

  const handleReanalyzeEdited = async () => {
    if (!editedImage) return;

    setIsLoadingAnalysis(true);
    setAnalysisResult(null);
    setAnalysisError(null);
    
    // Store reference before clearing state
    const newImageSrc = editedImage;

    // Reset Editing UI immediately
    setEditedImage(null);
    setIsEditing(false);
    setEditError(null);

    try {
      // Convert Data URL to Blob/File to update main state
      const res = await fetch(newImageSrc);
      const blob = await res.blob();
      const file = new File([blob], "improved-photo.png", { type: blob.type });

      // Update Main Image State
      setSelectedFile(file);
      setPreviewUrl(newImageSrc);

      // Perform Analysis
      const { mimeType, data } = await fileToBase64(file);
      const result = await analyzeImage(data, mimeType);
      setAnalysisResult(result);

    } catch (err: unknown) {
      console.error("Re-analysis failed:", err);
      setAnalysisError("Failed to re-analyze the improved image.");
    } finally {
      setIsLoadingAnalysis(false);
    }
  };

  if (checkingKey) {
     return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">Loading...</div>;
  }

  if (!hasApiKey) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-center">
        <div className="max-w-md bg-slate-800 p-8 rounded-xl shadow-2xl border border-slate-700">
          <h1 className="text-3xl font-bold text-white mb-4">API Key Required</h1>
          <p className="text-slate-300 mb-6">
            To use the advanced AI features like Photo Analysis and Editing (Gemini Pro), you need to select a paid API key.
          </p>
          <button
            onClick={handleSelectKey}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            Select API Key
          </button>
          <p className="mt-4 text-sm text-slate-500">
            Learn more about billing at <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">ai.google.dev/gemini-api/docs/billing</a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <Header />
        <main className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          
          {/* Left Column: Upload & Controls */}
          <div className="flex flex-col space-y-6">
            <ImageUpload onImageSelect={handleImageSelect} previewUrl={previewUrl} />
            
            <button
              onClick={handleAnalyzeClick}
              disabled={!selectedFile || isLoadingAnalysis || isEditing}
              className="w-full bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:bg-indigo-700 disabled:bg-slate-500 disabled:cursor-not-allowed transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900"
            >
              {isLoadingAnalysis ? 'Analyzing...' : 'Analyze Photo'}
            </button>
          </div>

          {/* Right Column: Results */}
          <div className="bg-slate-800 rounded-lg p-6 shadow-2xl min-h-[300px] flex flex-col">
            {isLoadingAnalysis && <div className="flex-1 flex items-center justify-center"><Spinner text="AI is analyzing your masterpiece..." /></div>}
            
            {analysisError && (
              <div className="text-center text-red-400 py-8">
                <h3 className="text-lg font-semibold">Analysis Failed</h3>
                <p className="mt-2">{analysisError}</p>
              </div>
            )}

            {!isLoadingAnalysis && !analysisError && analysisResult && (
              <div className="animate-fade-in flex flex-col h-full">
                <AnalysisDisplay analysis={analysisResult} />
                
                {/* Editing Section */}
                <div className="mt-8 pt-6 border-t border-slate-700">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-white">AI Magic Edit</h3>
                    {!isEditing && !editedImage && (
                       <span className="text-xs font-medium px-2 py-1 bg-indigo-500/20 text-indigo-300 rounded border border-indigo-500/30">Gemini 3 Pro</span>
                    )}
                  </div>

                  <div className="bg-slate-700/50 rounded p-4 mb-4 text-sm text-slate-300">
                     <div className="flex items-center justify-between border-b border-slate-600 pb-3 mb-3">
                        <div className="text-slate-400 font-medium">Potential Score Boost</div>
                        <div className="flex items-center gap-3">
                            <span className="text-slate-300 font-bold">{analysisResult.rating}</span>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                            <span className="text-emerald-400 font-bold text-lg">{analysisResult.projected_rating}</span>
                            <span className="text-xs text-emerald-500/80 uppercase font-bold tracking-wider ml-1">Projected</span>
                        </div>
                    </div>
                    <p className="font-semibold text-indigo-300 mb-2">Technical Fixes to Apply:</p>
                    <ul className="list-disc pl-5 space-y-1">
                        {analysisResult.suggested_edits.map((item, idx) => (
                            <li key={idx}>
                                <span className="text-slate-200">{item.edit}</span>
                            </li>
                        ))}
                    </ul>
                  </div>

                  {!isEditing && !editedImage && (
                    <button
                        onClick={handleEditClick}
                        className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                           <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                        </svg>
                        Apply These Improvements
                    </button>
                  )}

                  {isEditing && (
                     <div className="py-8">
                        <Spinner text="Applying your specific edits (this takes about 10-15s)..." />
                     </div>
                  )}

                  {editError && (
                     <div className="text-red-400 text-sm mt-2">{editError}</div>
                  )}

                  {editedImage && (
                    <div className="space-y-4">
                        {previewUrl && (
                          <div className="mb-2">
                             <ComparisonView originalUrl={previewUrl} editedUrl={editedImage} />
                          </div>
                        )}
                        <div className="flex gap-3 flex-wrap">
                             <button
                               onClick={handleReanalyzeEdited}
                               className="flex-1 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-center rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2 min-w-[140px]"
                             >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                                Rate This Edit
                             </button>
                             <a 
                               href={editedImage} 
                               download="improved-photo.png"
                               className="flex-1 py-2 px-4 bg-slate-700 hover:bg-slate-600 text-white text-center rounded-lg transition-colors text-sm font-medium min-w-[100px]"
                             >
                               Download
                             </a>
                             <button 
                               onClick={() => setEditedImage(null)}
                               className="px-4 py-2 text-slate-400 hover:text-white transition-colors text-sm"
                             >
                               Close
                             </button>
                        </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!isLoadingAnalysis && !analysisError && !analysisResult && (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400">
                <h3 className="text-xl font-semibold">Your Photo Analysis</h3>
                <p className="mt-2">Upload a photo and click "Analyze" to see the AI-powered critique here.</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
