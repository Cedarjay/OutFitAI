
import React, { useRef, useCallback, useState } from 'react';

const UploadIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const DropIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
    </svg>
);

interface ImageUploaderProps {
  id: string;
  label: string;
  imageSrc: string | null;
  onImageSelect: (dataUrl: string) => void;
  placeholderIcon?: React.ReactNode;
  aspectRatio?: number | null;
  compact?: boolean;
  tooltipText?: string;
  labelClassName?: string;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ 
    id, 
    label, 
    imageSrc, 
    onImageSelect, 
    placeholderIcon,
    aspectRatio,
    compact = false,
    tooltipText,
    labelClassName
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleFileChange = useCallback((files: FileList | null) => {
        if (files && files[0]) {
            const file = files[0];
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const result = e.target?.result as string;
                    // Immediately populate the placeholder without requiring confirmation/crop
                    onImageSelect(result);
                };
                reader.readAsDataURL(file);
            }
        }
    }, [onImageSelect]);

    const onButtonClick = () => {
        fileInputRef.current?.click();
    };
    
    const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        handleFileChange(e.dataTransfer.files);
    }, [handleFileChange]);
    
    const uploaderContent = (
      <>
        {imageSrc ? (
            <>
                <img src={imageSrc} alt={label} className="w-full h-full object-cover animate-image-select-pop" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <p className="text-white font-bold">Change</p>
                </div>
            </>
        ) : (
            <div className={`w-full h-full flex flex-col items-center justify-center text-gray-500 transition-colors ${isDragging ? 'bg-indigo-50' : 'bg-gray-100 group-hover:bg-gray-200'}`}>
                {isDragging ? (
                    <div className="text-center">
                        <DropIcon/>
                        <p className="mt-2 font-semibold">Drop image here</p>
                    </div>
                ) : (
                    <div className={`flex flex-col items-center justify-center p-2 text-center ${compact ? 'space-y-1' : 'space-y-2'}`}>
                        {placeholderIcon || <UploadIcon />}
                        {!compact && <span className="text-xs font-semibold">Click to upload or drag & drop</span>}
                    </div>
                )}
            </div>
        )}
      </>
    );

    const containerStyle: React.CSSProperties = {};
    if (aspectRatio) {
        containerStyle.aspectRatio = `${aspectRatio}`;
    } else {
        containerStyle.aspectRatio = `3 / 4`;
    }
    
    if (compact) {
        containerStyle.aspectRatio = '1 / 1';
    }

    return (
        <div className="w-full">
            {label && <label htmlFor={id} className={labelClassName || `block text-sm font-medium text-gray-700 mb-1 ${compact ? 'text-center' : ''}`}>{label}</label>}
            <div
                className="relative group w-full rounded-lg overflow-hidden border-2 border-dashed border-gray-300 transition-all duration-300 hover:border-indigo-500 hover:shadow-lg focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-300"
                style={containerStyle}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                title={tooltipText}
            >
                <button
                    type="button"
                    onClick={onButtonClick}
                    className="absolute inset-0 w-full h-full z-10 cursor-pointer"
                    aria-label={`Upload image for ${label}`}
                />
                <input
                    type="file"
                    id={id}
                    ref={fileInputRef}
                    onChange={(e) => handleFileChange(e.target.files)}
                    accept="image/png, image/jpeg, image/webp"
                    className="hidden"
                />
                <div className="w-full h-full absolute inset-0">
                  {uploaderContent}
                </div>
            </div>
        </div>
    );
};

export default ImageUploader;
