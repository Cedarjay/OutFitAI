import React, { useRef, useCallback } from 'react';

const UploadIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

interface ImageUploaderProps {
  id: string;
  label: string;
  imageSrc: string | null;
  onImageSelect: (dataUrl: string) => void;
  placeholderIcon?: React.ReactNode;
  aspectRatio?: number | null;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ id, label, imageSrc, onImageSelect, placeholderIcon, aspectRatio }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          onImageSelect(reader.result);
        }
      };
      reader.readAsDataURL(file);
      event.target.value = ''; // Reset file input to allow re-uploading the same file
    }
  }, [onImageSelect]);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className="w-full max-w-sm mx-auto flex-shrink-0">
      <p className="block text-lg font-medium text-gray-700 mb-3 text-center">{label}</p>
      <div
        onClick={handleClick}
        className="relative bg-white border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-indigo-500 hover:bg-gray-50 transition-all duration-300 overflow-hidden shadow-inner"
        style={{ aspectRatio: aspectRatio ? `${aspectRatio}` : '1 / 1' }}
        aria-label={`Upload image for ${label}`}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      >
        <input
          ref={fileInputRef}
          type="file"
          id={id}
          name={id}
          accept="image/png, image/jpeg, image/webp"
          className="hidden"
          onChange={handleFileChange}
          aria-hidden="true"
        />
        {imageSrc ? (
          <img src={imageSrc} alt={label} className="w-full h-full object-cover" />
        ) : (
          <div className="relative w-full h-full flex flex-col items-center justify-center text-center text-gray-500 p-4">
             {placeholderIcon && (
              <div className="absolute inset-0 flex items-center justify-center text-gray-200 pointer-events-none">
                {placeholderIcon}
              </div>
            )}
            <div className="relative z-10">
                <UploadIcon />
                <p className="mt-2 text-sm">Click to upload image</p>
                <p className="text-xs text-gray-500 mt-1">PNG, JPG, WEBP</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageUploader;