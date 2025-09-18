import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import ImageUploader from './components/ImageUploader';
import LoadingSpinner from './components/LoadingSpinner';
import History from './components/History';
import { virtualTryOn, removeBackground, editImage } from './services/geminiService';

interface HistoryItem {
  id: string;
  personImage: string;
  clothingImage: string;
  resultImage: string;
  generatedText: string | null;
}

const PersonPlaceholderIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-3/5 h-3/5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
    </svg>
);

const ClothingPlaceholderIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-3/5 h-3/5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"></path>
    </svg>
);

const App: React.FC = () => {
  const [personImage, setPersonImage] = useState<string | null>(null);
  const [originalPersonImage, setOriginalPersonImage] = useState<string | null>(null);
  const [clothingImage, setClothingImage] = useState<string | null>(null);
  const [personImageAspectRatio, setPersonImageAspectRatio] = useState<number | null>(null);
  const [personImageDimensions, setPersonImageDimensions] = useState<{ width: number, height: number } | null>(null);
  
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [generatedText, setGeneratedText] = useState<string | null>(null);

  const [history, setHistory] = useState<HistoryItem[]>([]);
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRemovingBackground, setIsRemovingBackground] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [editPrompt, setEditPrompt] = useState('');


  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('outfit-ai-history');
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
    } catch (e) {
      console.error("Failed to load history from local storage:", e);
      setHistory([]);
    }
  }, []);
  
  useEffect(() => {
    try {
      localStorage.setItem('outfit-ai-history', JSON.stringify(history));
    } catch (e) {
      console.error("Failed to save history to local storage:", e);
    }
  }, [history]);

  const toggleHistory = () => {
    setIsHistoryOpen(prev => !prev);
  };

  const handlePersonImageSelect = (dataUrl: string) => {
    const img = new Image();
    img.onload = () => {
      setPersonImageAspectRatio(img.naturalWidth / img.naturalHeight);
      setPersonImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = dataUrl;
    setPersonImage(dataUrl);
    setOriginalPersonImage(null); // Clear original image when a new one is uploaded
  };

  const handleClothingImageSelect = (dataUrl: string) => {
    setClothingImage(dataUrl);
  };

  const handleRemoveBackground = async () => {
    if (!personImage) return;

    setIsRemovingBackground(true);
    setError(null);
    setOriginalPersonImage(personImage); // Save the original image

    try {
        const imageBase64 = personImage.split(',')[1];
        const mimeType = personImage.match(/:(.*?);/)?.[1] ?? 'image/png';

        const resultBase64 = await removeBackground(imageBase64, mimeType);
        const newImageDataUrl = `data:image/png;base64,${resultBase64}`;
        setPersonImage(newImageDataUrl);

    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred during background removal.';
        setError(errorMessage);
        setOriginalPersonImage(null); // Clear original on failure
        console.error(e);
    } finally {
        setIsRemovingBackground(false);
    }
  };

  const handleRestoreOriginal = () => {
    if (originalPersonImage) {
        const img = new Image();
        img.onload = () => {
            setPersonImageAspectRatio(img.naturalWidth / img.naturalHeight);
            setPersonImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
        };
        img.src = originalPersonImage;
        setPersonImage(originalPersonImage);
        setOriginalPersonImage(null);
    }
  };

  const handleTryOn = async () => {
    if (!personImage || !clothingImage || !personImageDimensions) {
      setError('Please upload both a person and a clothing item.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResultImage(null);
    setGeneratedText(null);

    try {
      const personImageBase64 = personImage.split(',')[1];
      const personMimeType = personImage.match(/:(.*?);/)?.[1] ?? 'image/png';
      const clothingImageBase64 = clothingImage.split(',')[1];
      const clothingMimeType = clothingImage.match(/:(.*?);/)?.[1] ?? 'image/png';
      
      const result = await virtualTryOn(
        personImageBase64,
        personMimeType,
        clothingImageBase64,
        clothingMimeType,
        personImageDimensions.width,
        personImageDimensions.height
      );
      
      if (result.image) {
        const resultImageUrl = `data:image/png;base64,${result.image}`;
        setResultImage(resultImageUrl);

        const newHistoryItem: HistoryItem = {
          id: new Date().toISOString(),
          personImage: personImage,
          clothingImage: clothingImage,
          resultImage: resultImageUrl,
          generatedText: result.text
        };
        setHistory(prevHistory => [newHistoryItem, ...prevHistory]);
      }
      if (result.text) {
        setGeneratedText(result.text);
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred during image generation.';
      setError(errorMessage);
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageEdit = async () => {
    if (!editPrompt.trim() || !resultImage) {
        return;
    }
    
    setIsEditing(true);
    setError(null);

    try {
        const imageBase64 = resultImage.split(',')[1];
        const mimeType = resultImage.match(/:(.*?);/)?.[1] ?? 'image/png';

        const result = await editImage(imageBase64, mimeType, editPrompt);
        
        if (result.image) {
            const newImageUrl = `data:image/png;base64,${result.image}`;
            setResultImage(newImageUrl);
        }
        if (result.text) {
          setGeneratedText(result.text);
        }

    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred during image editing.';
        setError(errorMessage);
    } finally {
        setIsEditing(false);
        setEditPrompt('');
    }
  };


  const handleReset = () => {
    setPersonImage(null);
    setClothingImage(null);
    setOriginalPersonImage(null);
    setResultImage(null);
    setGeneratedText(null);
    setError(null);
    setPersonImageAspectRatio(null);
    setPersonImageDimensions(null);
    setEditPrompt('');
  };

  const handleDownload = () => {
    if (!resultImage) return;
    const link = document.createElement('a');
    link.href = resultImage;
    link.download = 'outfit-ai-try-on.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShare = async () => {
    if (!resultImage || !navigator.share) return;
  
    try {
      const response = await fetch(resultImage);
      const blob = await response.blob();
      const file = new File([blob], 'outfit-ai-try-on.png', { type: blob.type });
  
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'My Virtual Try-On from OutFitAI',
          text: 'Check out my new look generated by OutFitAI!',
          files: [file],
        });
      } else {
        alert("Your browser doesn't support sharing these files.");
      }
    } catch (error) {
      console.error('Error sharing image:', error);
    }
  };

  const handleSelectHistoryItem = (item: HistoryItem) => {
    const img = new Image();
    img.onload = () => {
        setPersonImageAspectRatio(img.naturalWidth / img.naturalHeight);
        setPersonImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = item.personImage;

    setPersonImage(item.personImage);
    setClothingImage(item.clothingImage);
    setResultImage(item.resultImage);
    setGeneratedText(item.generatedText);
    setOriginalPersonImage(null);
    setError(null);
    setIsHistoryOpen(false); // Close panel on selection
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteHistoryItem = (id: string) => {
    setHistory(prevHistory => prevHistory.filter(item => item.id !== id));
  };

  const handleClearHistory = () => {
    setHistory([]);
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 flex flex-col items-center px-4 selection:bg-indigo-500 selection:text-white">
      <Header onToggleHistory={toggleHistory} />
      <main className="w-full max-w-7xl mx-auto flex flex-col items-center flex-grow py-8">
        <div className="w-full flex flex-col md:flex-row md:justify-center md:space-x-8 space-y-8 md:space-y-0 p-4">
          <div className="relative w-full max-w-sm mx-auto flex-shrink-0">
            <ImageUploader 
              id="person-uploader" 
              label="Upload Photo of Person" 
              imageSrc={personImage} 
              onImageSelect={handlePersonImageSelect}
              placeholderIcon={<PersonPlaceholderIcon />}
              aspectRatio={personImageAspectRatio}
            />
            {personImage && !resultImage && (
              <div className="absolute bottom-4 right-4 z-10">
                {!originalPersonImage ? (
                  <button
                    onClick={handleRemoveBackground}
                    disabled={isRemovingBackground || isLoading}
                    className="px-3 py-2 bg-black/60 text-white text-xs font-semibold rounded-lg backdrop-blur-sm hover:bg-black/80 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isRemovingBackground ? 'Processing...' : 'Remove Background'}
                  </button>
                ) : (
                  <button
                    onClick={handleRestoreOriginal}
                    disabled={isRemovingBackground || isLoading}
                    className="px-3 py-2 bg-gray-600/60 text-white text-xs font-semibold rounded-lg backdrop-blur-sm hover:bg-gray-800/80 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Restore Original
                  </button>
                )}
              </div>
            )}
             {isRemovingBackground && (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg">
                <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
                    <p className="text-sm text-indigo-600">Removing background...</p>
                </div>
              </div>
            )}
          </div>
          <ImageUploader 
            id="clothing-uploader" 
            label="Upload Photo of Clothing" 
            imageSrc={clothingImage} 
            onImageSelect={handleClothingImageSelect} 
            placeholderIcon={<ClothingPlaceholderIcon />}
            aspectRatio={personImageAspectRatio}
          />
        </div>
        
        <div className="mt-8 text-center w-full max-w-md flex items-center space-x-4">
          <button
            onClick={handleTryOn}
            disabled={!personImage || !clothingImage || isLoading || isRemovingBackground}
            className="flex-grow px-8 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold rounded-lg shadow-lg hover:scale-105 transform transition-transform duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
          >
            {isLoading ? 'Generating...' : 'Virtual Try-On'}
          </button>
          <button
            onClick={handleReset}
            disabled={!personImage && !clothingImage && !resultImage}
            className="px-6 py-3 bg-gray-200 text-gray-800 font-semibold rounded-lg shadow-sm hover:bg-gray-300 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Reset and clear all images"
          >
            Reset
          </button>
        </div>
        
        {isLoading && <LoadingSpinner />}
        
        {error && (
            <div className="mt-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative w-full max-w-2xl text-center" role="alert">
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{error}</span>
            </div>
        )}

        {resultImage && (
          <div className="mt-12 w-full max-w-2xl mx-auto animate-fade-in-opacity bg-white p-4 sm:p-8 rounded-2xl border border-gray-200 shadow-lg">
            <h3 className="text-3xl font-bold text-center text-gray-900 mb-8">Your Virtual Try-On Results</h3>
            <div className="flex justify-center">
              {/* Generated Result */}
              <div className="flex flex-col items-center w-full max-w-sm">
                <h4 className="text-lg font-semibold text-indigo-600 mb-3">Your New Look!</h4>
                <div
                  className="relative w-full bg-gray-50 rounded-lg shadow-xl border-2 border-indigo-500 overflow-hidden"
                  style={{ aspectRatio: personImageAspectRatio || 1 }}
                >
                  <img src={resultImage} alt="Generated virtual try-on" className="w-full h-full object-cover" />
                  {isEditing && (
                      <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg">
                          <div className="flex flex-col items-center justify-center space-y-2">
                              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
                              <p className="text-sm text-purple-600">Applying edits...</p>
                          </div>
                      </div>
                  )}
                </div>
                {generatedText && (
                  <p className="text-gray-500 mt-4 text-sm italic text-center p-2">{generatedText}</p>
                )}
                <div className="mt-4 flex justify-center space-x-4 w-full">
                  <button
                    onClick={handleDownload}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition-colors duration-200 flex items-center justify-center space-x-2"
                    aria-label="Download image"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>Download</span>
                  </button>
                  <button
                    onClick={handleShare}
                    disabled={typeof navigator.share === 'undefined'}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Share image"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                    </svg>
                    <span>Share</span>
                  </button>
                </div>
                {/* AI Edit Chat Box */}
                <div className="mt-8 w-full border-t border-gray-200 pt-6">
                    <h5 className="text-md font-semibold text-gray-700 text-center mb-3">Edit with AI</h5>
                    <div className="flex space-x-2">
                        <input
                            type="text"
                            value={editPrompt}
                            onChange={(e) => setEditPrompt(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleImageEdit()}
                            placeholder="e.g., 'make the shirt red'"
                            disabled={isLoading || isEditing}
                            className="flex-grow w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow duration-200"
                        />
                        <button
                            onClick={handleImageEdit}
                            disabled={!editPrompt.trim() || isLoading || isEditing}
                            className="px-6 py-2 bg-indigo-500 text-white font-semibold rounded-lg hover:bg-indigo-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Send
                        </button>
                    </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      <History
          isOpen={isHistoryOpen}
          onClose={toggleHistory}
          items={history}
          onSelectItem={handleSelectHistoryItem}
          onDeleteItem={handleDeleteHistoryItem}
          onClearAll={handleClearHistory}
        />
    </div>
  );
};

export default App;
