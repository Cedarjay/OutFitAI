import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';

interface ImageCropperProps {
  imageSrc: string;
  onCrop: (croppedDataUrl: string) => void;
  onCancel: () => void;
}

const CROP_AREA_SIZE = 320;

const ImageCropper: React.FC<ImageCropperProps> = ({ imageSrc, onCrop, onCancel }) => {
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });

  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

  const resetImageState = useCallback(() => {
    const image = imageRef.current;
    if (!image || image.naturalWidth === 0) return;

    const { naturalWidth, naturalHeight } = image;

    // Calculate the scale to make the image fill the crop area
    const newScale = Math.max(CROP_AREA_SIZE / naturalWidth, CROP_AREA_SIZE / naturalHeight);
    setScale(newScale);
    
    // Center the image initially, ensuring it's clamped within bounds
    const imgWidth = naturalWidth * newScale;
    const imgHeight = naturalHeight * newScale;
    const initialPanX = clamp((CROP_AREA_SIZE - imgWidth) / 2, CROP_AREA_SIZE - imgWidth, 0);
    const initialPanY = clamp((CROP_AREA_SIZE - imgHeight) / 2, CROP_AREA_SIZE - imgHeight, 0);
    setPan({ x: initialPanX, y: initialPanY });
  }, []);

  useEffect(() => {
    const image = imageRef.current;
    if (!image) return;

    const handleLoad = () => resetImageState();
    
    if (image.complete) {
      handleLoad();
    } else {
      image.addEventListener('load', handleLoad);
    }
    
    return () => image.removeEventListener('load', handleLoad);
  }, [imageSrc, resetImageState]);
  
  const handlePan = (dx: number, dy: number) => {
    setPan(prevPan => {
      const image = imageRef.current;
      if (!image) return prevPan;
      
      const imgWidth = image.naturalWidth * scale;
      const imgHeight = image.naturalHeight * scale;

      const newX = prevPan.x + dx;
      const newY = prevPan.y + dy;
      
      const clampedX = clamp(newX, CROP_AREA_SIZE - imgWidth, 0);
      const clampedY = clamp(newY, CROP_AREA_SIZE - imgHeight, 0);
      
      return { x: clampedX, y: clampedY };
    });
  };

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setStartPoint({ x: e.clientX, y: e.clientY });
  };
  
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - startPoint.x;
    const dy = e.clientY - startPoint.y;
    handlePan(dx, dy);
    setStartPoint({ x: e.clientX, y: e.clientY });
  };
  
  const onMouseUp = () => setIsDragging(false);

  const handleCrop = () => {
    const image = imageRef.current;
    if (!image) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = CROP_AREA_SIZE;
    canvas.height = CROP_AREA_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const sourceX = -pan.x / scale;
    const sourceY = -pan.y / scale;
    const sourceWidth = CROP_AREA_SIZE / scale;
    const sourceHeight = CROP_AREA_SIZE / scale;

    const originalImage = new Image();
    originalImage.crossOrigin = "anonymous";
    originalImage.onload = () => {
      ctx.drawImage(
        originalImage,
        sourceX, sourceY, sourceWidth, sourceHeight,
        0, 0, CROP_AREA_SIZE, CROP_AREA_SIZE
      );
      const croppedDataUrl = canvas.toDataURL('image/png');
      onCrop(croppedDataUrl);
    };
    originalImage.src = imageSrc;
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md text-gray-900">
        <h2 className="text-xl font-bold mb-4 text-center">Adjust Image</h2>
        <div 
          ref={containerRef}
          className="relative mx-auto bg-gray-200 overflow-hidden select-none cursor-move" 
          style={{ width: CROP_AREA_SIZE, height: CROP_AREA_SIZE }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          <img
            ref={imageRef}
            src={imageSrc}
            alt="Image to crop"
            className="absolute"
            style={{ 
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
              transformOrigin: 'top left',
              pointerEvents: 'none' 
            }}
          />
          <div className="absolute inset-0 border-2 border-dashed border-black/50 pointer-events-none" />
        </div>

        <div className="mt-6 flex justify-end space-x-4">
          <button onClick={onCancel} className="px-4 py-2 rounded-md text-gray-800 bg-gray-200 hover:bg-gray-300 transition-colors">Cancel</button>
          <button onClick={handleCrop} className="px-4 py-2 rounded-md text-white bg-indigo-600 hover:bg-indigo-700 font-semibold transition-colors">Confirm</button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ImageCropper;