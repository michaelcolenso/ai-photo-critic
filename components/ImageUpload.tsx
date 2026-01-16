
import React, { useCallback, useState } from 'react';

interface ImageUploadProps {
  onImageSelect: (file: File | null) => void;
  previewUrl: string | null;
}

const UploadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
  </svg>
);

export const ImageUpload: React.FC<ImageUploadProps> = ({ onImageSelect, previewUrl }) => {
    const [isDragging, setIsDragging] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        onImageSelect(file);
    };

    const handleDragEnter = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);
    
    const handleDragOver = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0] || null;
        if (file && file.type.startsWith('image/')) {
            onImageSelect(file);
        }
    }, [onImageSelect]);


  return (
    <div className="w-full">
      <label
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center w-full aspect-video rounded-lg border-2 border-dashed border-slate-600 cursor-pointer bg-slate-800 hover:bg-slate-700 transition-colors duration-300 ${isDragging ? 'border-indigo-500 bg-slate-700' : ''}`}
      >
        {previewUrl ? (
          <img src={previewUrl} alt="Preview" className="w-full h-full object-contain rounded-lg" />
        ) : (
          <div className="text-center p-8">
            <UploadIcon />
            <p className="mt-4 text-slate-400">
              <span className="font-semibold text-indigo-400">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-slate-500 mt-1">PNG, JPG, WEBP, etc.</p>
          </div>
        )}
        <input
          type="file"
          id="file-upload"
          className="hidden"
          accept="image/*"
          onChange={handleFileChange}
        />
      </label>
    </div>
  );
};
