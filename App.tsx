
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import ImageUploader from './components/ImageUploader';
import LoadingSpinner from './components/LoadingSpinner';
import History, { HistoryItem, TemplateItem } from './components/History';
import { virtualTryOn, removeBackground, editImage, detectBodyShape, enhanceImageQuality, getStylingSuggestions, StylingSuggestions } from './services/geminiService';

interface BodyShapeResult {
  shape: string;
  summary: string;
  tops: string;
  bottoms: string;
  dressesAndJumpsuits: string;
  generalTips: string;
}

const MAX_HISTORY_ITEMS = 20;
const MAX_CUSTOMIZATION_ITEMS = 50;
const MAX_TEMPLATE_ITEMS = 50;
const LOW_QUALITY_THRESHOLD = 512;

// Loading messages
const ENHANCE_MESSAGES = [ "Analyzing pixels...", "Upscaling resolution...", "Refining details..."];
const REMOVE_BG_MESSAGES = ["Identifying subject...", "Creating precise edges...", "Finalizing mask..."];
const TRY_ON_MESSAGES = ["Warming up the AI stylist...", "Draping the fabric realistically...", "Adjusting for lighting and shadows...", "Adding the final touches..."];


const PersonPlaceholderIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-3/5 h-3/5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
    </svg>
);

const BackgroundPlaceholderIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-3/5 h-3/5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <circle cx="8.5" cy="8.5" r="1.5"></circle>
        <polyline points="21 15 16 10 5 21"></polyline>
    </svg>
);

const UndoIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
    </svg>
  );
  
const RedoIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 15l3-3m0 0l-3-3m3 3H8a5 5 0 00-5 5" />
    </svg>
);

const App: React.FC = () => {
  const [personImage, setPersonImage] = useState<string | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [originalPersonImage, setOriginalPersonImage] = useState<string | null>(null);
  const [topImage, setTopImage] = useState<string | null>(null);
  const [bottomImage, setBottomImage] = useState<string | null>(null);
  const [suitJacketImage, setSuitJacketImage] = useState<string | null>(null);
  const [vestImage, setVestImage] = useState<string | null>(null);
  const [outerwearImage, setOuterwearImage] = useState<string | null>(null);
  const [footwearImage, setFootwearImage] = useState<string | null>(null);
  const [capImage, setCapImage] = useState<string | null>(null);
  const [watchImage, setWatchImage] = useState<string | null>(null);
  const [sunglassesImage, setSunglassesImage] = useState<string | null>(null);
  const [tieImage, setTieImage] = useState<string | null>(null);
  const [scarfImage, setScarfImage] = useState<string | null>(null);
  const [isSuitButtoned, setIsSuitButtoned] = useState<boolean>(true);


  const [personImageAspectRatio, setPersonImageAspectRatio] = useState<number | null>(null);
  const [personImageDimensions, setPersonImageDimensions] = useState<{ width: number, height: number } | null>(null);
  
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [generatedText, setGeneratedText] = useState<string | null>(null);

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [customizations, setCustomizations] = useState<HistoryItem[]>([]);
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRemovingBackground, setIsRemovingBackground] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [editPrompt, setEditPrompt] = useState('');
  
  const [bodyShapeResult, setBodyShapeResult] = useState<BodyShapeResult | null>(null);
  const [isDetectingShape, setIsDetectingShape] = useState<boolean>(false);
  const [shapeDetectionError, setShapeDetectionError] = useState<string | null>(null);
  
  // State for undo/redo functionality
  const [editHistory, setEditHistory] = useState<string[]>([]);
  const [currentEditIndex, setCurrentEditIndex] = useState<number>(-1);
  const [isInitialLoad, setIsInitialLoad] = useState<boolean>(true);

  // State for image enhancement
  const [showEnhancePrompt, setShowEnhancePrompt] = useState<boolean>(false);
  const [isEnhancing, setIsEnhancing] = useState<boolean>(false);
  const [showBackgroundUploader, setShowBackgroundUploader] = useState<boolean>(false);
  
  const [loadingMessage, setLoadingMessage] = useState('');

  // State for AI Stylist Suggestions
  const [stylingSuggestions, setStylingSuggestions] = useState<StylingSuggestions | null>(null);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState<boolean>(false);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);

  // Effect to cycle through loading messages for inline processes
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    let messages: string[] = [];
    if (isRemovingBackground) messages = REMOVE_BG_MESSAGES;
    if (isEnhancing) messages = ENHANCE_MESSAGES;

    if (messages.length > 0) {
        let index = 0;
        setLoadingMessage(messages[index]);
        interval = setInterval(() => {
            index = (index + 1) % messages.length;
            setLoadingMessage(messages[index]);
        }, 2500);
    }

    return () => {
        if (interval) clearInterval(interval);
    };
  }, [isRemovingBackground, isEnhancing]);


  useEffect(() => {
    const loadFromStorage = (key: string, setter: Function, name: string) => {
        try {
            const savedData = localStorage.getItem(key);
            if (savedData) {
                setter(JSON.parse(savedData));
            }
        } catch (e) {
            console.error(`Failed to load ${name} from local storage:`, e);
            setter([]);
        }
    };

    loadFromStorage('outfit-ai-history', setHistory, 'history');
    loadFromStorage('outfit-ai-customizations', setCustomizations, 'customizations');
    loadFromStorage('outfit-ai-templates', setTemplates, 'templates');
  }, []);

  // Helper to update person image and its derived state (aspect ratio, dimensions)
  const updatePersonImageState = (dataUrl: string) => {
    const img = new Image();
    img.onload = () => {
      setPersonImageAspectRatio(img.naturalWidth / img.naturalHeight);
      setPersonImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = dataUrl;
    setPersonImage(dataUrl);
  };
  
  // Load saved session on initial mount
  useEffect(() => {
    try {
        const savedSession = localStorage.getItem('outfit-ai-current-session');
        if (savedSession) {
            const parsedSession = JSON.parse(savedSession);
            if (parsedSession.personImage) {
                updatePersonImageState(parsedSession.personImage);
            }
            setBackgroundImage(parsedSession.backgroundImage || null);
            if (parsedSession.backgroundImage) {
              setShowBackgroundUploader(true);
            }
            if(parsedSession.originalPersonImage) {
                setOriginalPersonImage(parsedSession.originalPersonImage);
            }
            setTopImage(parsedSession.topImage || null);
            setBottomImage(parsedSession.bottomImage || null);
            setSuitJacketImage(parsedSession.suitJacketImage || null);
            setVestImage(parsedSession.vestImage || null);
            setOuterwearImage(parsedSession.outerwearImage || null);
            setFootwearImage(parsedSession.footwearImage || null);
            setCapImage(parsedSession.capImage || null);
            setWatchImage(parsedSession.watchImage || null);
            setSunglassesImage(parsedSession.sunglassesImage || null);
            setTieImage(parsedSession.tieImage || null);
            setScarfImage(parsedSession.scarfImage || null);
            setIsSuitButtoned(parsedSession.isSuitButtoned ?? true);
        }
    } catch (e) {
        console.error('Failed to load session from local storage:', e);
        localStorage.removeItem('outfit-ai-current-session'); // Clear potentially corrupted data
    } finally {
        setIsInitialLoad(false);
    }
  }, []); // Empty array ensures this runs only once on mount

  // Save current session on change
  useEffect(() => {
    if (isInitialLoad) return; // Don't save the initial empty state before loading

    try {
        const sessionToSave = {
            personImage,
            backgroundImage,
            originalPersonImage,
            topImage,
            bottomImage,
            suitJacketImage,
            vestImage,
            outerwearImage,
            footwearImage,
            capImage,
            watchImage,
            sunglassesImage,
            tieImage,
            scarfImage,
            isSuitButtoned,
        };
        localStorage.setItem('outfit-ai-current-session', JSON.stringify(sessionToSave));
    } catch (e) {
        console.error('Failed to save session to local storage:', e);
    }
  }, [
    personImage, backgroundImage, originalPersonImage, topImage, bottomImage, suitJacketImage, 
    vestImage, outerwearImage, footwearImage, capImage, watchImage, sunglassesImage, 
    tieImage, scarfImage, isSuitButtoned, isInitialLoad
  ]);
  
  const saveToStorage = (key: string, data: any, name: string) => {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.error(`Failed to save ${name} to local storage:`, e);
    }
  };

  useEffect(() => saveToStorage('outfit-ai-history', history, 'history'), [history]);
  useEffect(() => saveToStorage('outfit-ai-customizations', customizations, 'customizations'), [customizations]);
  useEffect(() => saveToStorage('outfit-ai-templates', templates, 'templates'), [templates]);


  const toggleHistory = () => {
    setIsHistoryOpen(prev => !prev);
  };

  const handlePersonImageSelect = (dataUrl: string) => {
    // Clear previous states
    setShowEnhancePrompt(false);
    setError(null);
    setOriginalPersonImage(null);
    setBodyShapeResult(null);
    setShapeDetectionError(null);
    setStylingSuggestions(null);
    setSuggestionsError(null);
  
    const img = new Image();
    img.onload = () => {
        // Check if image is low quality
        if (img.naturalWidth < LOW_QUALITY_THRESHOLD || img.naturalHeight < LOW_QUALITY_THRESHOLD) {
            setPersonImage(dataUrl); // Set image to show thumbnail
            setShowEnhancePrompt(true); // Show the enhancement prompt
        } else {
            updatePersonImageState(dataUrl); // High quality, proceed normally
        }
    };
    img.src = dataUrl;
  };

  const handleConfirmEnhance = async () => {
    if (!personImage) return;

    setShowEnhancePrompt(false);
    setIsEnhancing(true);
    setError(null);

    try {
        const imageBase64 = personImage.split(',')[1];
        const mimeType = personImage.match(/:(.*?);/)?.[1] ?? 'image/png';

        const enhancedBase64 = await enhanceImageQuality(imageBase64, mimeType);
        const newImageDataUrl = `data:image/png;base64,${enhancedBase64}`;
        updatePersonImageState(newImageDataUrl);

    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred during image enhancement.';
        setError(errorMessage);
        // Fallback to using the original image if enhancement fails
        updatePersonImageState(personImage); 
    } finally {
        setIsEnhancing(false);
    }
  };

  const handleSkipEnhance = () => {
    if (!personImage) return;
    setShowEnhancePrompt(false);
    updatePersonImageState(personImage);
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
        updatePersonImageState(newImageDataUrl);

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
        updatePersonImageState(originalPersonImage);
        setOriginalPersonImage(null);
    }
  };

  const hasAnyClothingItem = topImage || bottomImage || suitJacketImage || vestImage || outerwearImage || footwearImage || capImage || watchImage || sunglassesImage || tieImage || scarfImage;

  const handleTryOn = async () => {
    if (!personImage || !hasAnyClothingItem || !personImageDimensions) {
      setError('Please upload a person and at least one clothing or accessory item.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResultImage(null);
    setGeneratedText(null);
    setStylingSuggestions(null);
    setSuggestionsError(null);

    try {
      const personImageBase64 = personImage.split(',')[1];
      const personMimeType = personImage.match(/:(.*?);/)?.[1] ?? 'image/png';
      
      const backgroundImageBase64 = backgroundImage ? backgroundImage.split(',')[1] : null;
      const backgroundImageMimeType = backgroundImage ? backgroundImage.match(/:(.*?);/)?.[1] ?? 'image/png' : null;

      const items: any = {};
      const addImageToItems = (name: string, image: string | null) => {
        if (image) {
          items[name] = {
            base64: image.split(',')[1],
            mimeType: image.match(/:(.*?);/)?.[1] ?? 'image/png'
          };
        }
      };

      addImageToItems('top', topImage);
      addImageToItems('bottom', bottomImage);
      addImageToItems('suitJacket', suitJacketImage);
      addImageToItems('vest', vestImage);
      addImageToItems('outerwear', outerwearImage);
      addImageToItems('footwear', footwearImage);
      addImageToItems('cap', capImage);
      addImageToItems('watch', watchImage);
      addImageToItems('sunglasses', sunglassesImage);
      addImageToItems('tie', tieImage);
      addImageToItems('scarf', scarfImage);

      const result = await virtualTryOn(
        personImageBase64,
        personMimeType,
        items,
        personImageDimensions.width,
        personImageDimensions.height,
        suitJacketImage && vestImage ? isSuitButtoned : null,
        backgroundImageBase64,
        backgroundImageMimeType
      );
      
      if (result.image) {
        const resultImageUrl = `data:image/png;base64,${result.image}`;
        setResultImage(resultImageUrl);
        setEditHistory([resultImageUrl]); // Reset edit history with the new image
        setCurrentEditIndex(0); // Point to the start of the new history

        const newHistoryItem: HistoryItem = {
          id: new Date().toISOString(),
          personImage: personImage,
          backgroundImage: backgroundImage,
          topImage,
          bottomImage,
          suitJacketImage,
          vestImage,
          outerwearImage,
          footwearImage,
          capImage,
          watchImage,
          sunglassesImage,
          tieImage,
          scarfImage,
          resultImage: resultImageUrl,
          generatedText: result.text,
          stylingSuggestions: null
        };
        setHistory(prevHistory => [newHistoryItem, ...prevHistory].slice(0, MAX_HISTORY_ITEMS));

        // Asynchronously fetch styling suggestions
        try {
            setIsGeneratingSuggestions(true);
            const suggestions = await getStylingSuggestions(
                { base64: personImageBase64, mimeType: personMimeType },
                { base64: result.image, mimeType: 'image/png' }
            );
            setStylingSuggestions(suggestions);
            // Update the latest history item with the new suggestions
            setHistory(prev => {
                const latestHistory = [...prev];
                if (latestHistory.length > 0) {
                    latestHistory[0].stylingSuggestions = suggestions;
                }
                return latestHistory;
            });
        } catch (suggestionError) {
            const errorMessage = suggestionError instanceof Error ? suggestionError.message : 'Could not load styling suggestions.';
            setSuggestionsError(errorMessage);
        } finally {
            setIsGeneratingSuggestions(false);
        }

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

             // Update edit history
            const newHistory = editHistory.slice(0, currentEditIndex + 1);
            newHistory.push(newImageUrl);
            setEditHistory(newHistory);
            setCurrentEditIndex(newHistory.length - 1);


            // Update the most recent history item with the edited image
            setHistory(prevHistory => {
              if (prevHistory.length === 0) {
                return prevHistory;
              }
              const updatedHistory = [...prevHistory];
              updatedHistory[0] = {
                ...updatedHistory[0],
                resultImage: newImageUrl,
                generatedText: result.text ?? updatedHistory[0].generatedText,
              };
              return updatedHistory;
            });
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

  const handleDetectBodyShape = async () => {
    if (!personImage) return;

    setIsDetectingShape(true);
    setShapeDetectionError(null);
    setBodyShapeResult(null);

    try {
        const imageBase64 = personImage.split(',')[1];
        const mimeType = personImage.match(/:(.*?);/)?.[1] ?? 'image/png';

        const result = await detectBodyShape(imageBase64, mimeType);
        setBodyShapeResult(result);

    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred during body shape analysis.';
        setShapeDetectionError(errorMessage);
        console.error(e);
    } finally {
        setIsDetectingShape(false);
    }
  };

  const handleReset = () => {
    setPersonImage(null);
    setBackgroundImage(null);
    setTopImage(null);
    setBottomImage(null);
    setSuitJacketImage(null);
    setVestImage(null);
    setOuterwearImage(null);
    setFootwearImage(null);
    setCapImage(null);
    setWatchImage(null);
    setSunglassesImage(null);
    setTieImage(null);
    setScarfImage(null);
    setOriginalPersonImage(null);
    setResultImage(null);
    setGeneratedText(null);
    setError(null);
    setPersonImageAspectRatio(null);
    setPersonImageDimensions(null);
    setEditPrompt('');
    setBodyShapeResult(null);
    setShapeDetectionError(null);
    setStylingSuggestions(null);
    setIsGeneratingSuggestions(false);
    setSuggestionsError(null);
    setEditHistory([]);
    setCurrentEditIndex(-1);
    setIsSuitButtoned(true);
    setShowBackgroundUploader(false);
    localStorage.removeItem('outfit-ai-current-session');
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

  const handleSaveCustomization = () => {
    if (!resultImage || !personImage || !hasAnyClothingItem) {
      alert("Cannot save, result image or inputs are missing.");
      return;
    }
    const newCustomization: HistoryItem = {
      id: new Date().toISOString(),
      personImage,
      backgroundImage,
      topImage,
      bottomImage,
      suitJacketImage,
      vestImage,
      outerwearImage,
      footwearImage,
      capImage,
      watchImage,
      sunglassesImage,
      tieImage,
      scarfImage,
      resultImage,
      generatedText,
      stylingSuggestions,
    };
    setCustomizations(prev => [newCustomization, ...prev].slice(0, MAX_CUSTOMIZATION_ITEMS));
    alert("Outfit saved!");
  };

  const handleSaveTemplate = () => {
    if (!hasAnyClothingItem) {
        alert("Please select at least one clothing item to save a template.");
        return;
    }
    const newTemplate: TemplateItem = {
        id: new Date().toISOString(),
        topImage,
        bottomImage,
        suitJacketImage,
        vestImage,
        outerwearImage,
        footwearImage,
        capImage,
        watchImage,
        sunglassesImage,
        tieImage,
        scarfImage,
    };
    setTemplates(prev => [newTemplate, ...prev].slice(0, MAX_TEMPLATE_ITEMS));
    alert("Outfit template saved!");
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
    updatePersonImageState(item.personImage);
    setBackgroundImage(item.backgroundImage ?? null);
    if (item.backgroundImage) {
        setShowBackgroundUploader(true);
    } else {
        setShowBackgroundUploader(false);
    }
    setTopImage(item.topImage ?? null);
    setBottomImage(item.bottomImage ?? null);
    setSuitJacketImage(item.suitJacketImage ?? null);
    setVestImage(item.vestImage ?? null);
    setOuterwearImage(item.outerwearImage ?? null);
    setFootwearImage(item.footwearImage ?? null);
    setCapImage(item.capImage ?? null);
    setWatchImage(item.watchImage ?? null);
    setSunglassesImage(item.sunglassesImage ?? null);
    setTieImage(item.tieImage ?? null);
    setScarfImage(item.scarfImage ?? null);
    setResultImage(item.resultImage);
    setGeneratedText(item.generatedText);
    setStylingSuggestions(item.stylingSuggestions ?? null);
    setOriginalPersonImage(null);
    setError(null);
    setEditHistory([item.resultImage]); // Reset edit history for the selected item
    setCurrentEditIndex(0);
    setIsHistoryOpen(false); // Close panel on selection
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleSelectTemplate = (item: TemplateItem) => {
    setTopImage(item.topImage ?? null);
    setBottomImage(item.bottomImage ?? null);
    setSuitJacketImage(item.suitJacketImage ?? null);
    setVestImage(item.vestImage ?? null);
    setOuterwearImage(item.outerwearImage ?? null);
    setFootwearImage(item.footwearImage ?? null);
    setCapImage(item.capImage ?? null);
    setWatchImage(item.watchImage ?? null);
    setSunglassesImage(item.sunglassesImage ?? null);
    setTieImage(item.tieImage ?? null);
    setScarfImage(item.scarfImage ?? null);
    setIsHistoryOpen(false); // Close panel on selection
  };

  const handleDeleteHistoryItem = (id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
  };
  
  const handleDeleteCustomizationItem = (id: string) => {
    setCustomizations(prev => prev.filter(item => item.id !== id));
  };

  const handleDeleteTemplateItem = (id: string) => {
    setTemplates(prev => prev.filter(item => item.id !== id));
  };

  const handleClearHistory = () => {
    setHistory([]);
  };

  const handleClearCustomizations = () => {
    if (window.confirm('Are you sure you want to delete all saved customizations? This cannot be undone.')) {
      setCustomizations([]);
    }
  };

  const handleClearTemplates = () => {
    if (window.confirm('Are you sure you want to delete all saved templates? This cannot be undone.')) {
        setTemplates([]);
    }
  };
  
  const canUndo = currentEditIndex > 0;
  const canRedo = currentEditIndex < editHistory.length - 1;

  const handleUndo = () => {
    if (canUndo) {
        const newIndex = currentEditIndex - 1;
        setCurrentEditIndex(newIndex);
        setResultImage(editHistory[newIndex]);
    }
  };

  const handleRedo = () => {
    if (canRedo) {
        const newIndex = currentEditIndex + 1;
        setCurrentEditIndex(newIndex);
        setResultImage(editHistory[newIndex]);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 flex flex-col selection:bg-indigo-500 selection:text-white">
      <Header onToggleHistory={toggleHistory} />
      <main className="w-full max-w-7xl mx-auto flex flex-col items-center flex-grow py-8 px-4">
        <div className="w-full flex flex-col lg:flex-row lg:justify-center lg:space-x-8 space-y-8 lg:space-y-0 p-4">
          <div className="w-full max-w-sm mx-auto flex-shrink-0 flex flex-col items-center space-y-4">
            <div className="w-full space-y-4">
              <div className="bg-white p-4 rounded-lg shadow-inner border border-gray-200">
                <p className="block text-lg font-medium text-gray-700 mb-4 text-center">1. Add a person</p>
                <div className="relative w-full">
                  <ImageUploader 
                    id="person-uploader" 
                    label=""
                    imageSrc={personImage} 
                    onImageSelect={handlePersonImageSelect}
                    placeholderIcon={<PersonPlaceholderIcon />}
                    aspectRatio={personImageAspectRatio}
                  />
                  {showEnhancePrompt && (
                    <div className="absolute inset-x-0 bottom-0 z-20 bg-black/70 backdrop-blur-sm p-3 rounded-b-lg animate-fade-in-opacity">
                        <p className="text-white text-sm text-center font-semibold mb-2">Low quality image detected.</p>
                        <div className="flex justify-center space-x-2">
                            <button 
                                onClick={handleConfirmEnhance}
                                className="px-3 py-1.5 bg-indigo-500 text-white text-xs font-bold rounded-md hover:bg-indigo-600 transition-colors"
                            >
                                Enhance Quality
                            </button>
                            <button 
                                onClick={handleSkipEnhance}
                                className="px-3 py-1.5 bg-gray-600 text-white text-xs font-semibold rounded-md hover:bg-gray-700 transition-colors"
                            >
                                Use Anyway
                            </button>
                        </div>
                    </div>
                  )}
                  {personImage && !resultImage && !showEnhancePrompt && (
                    <div className="absolute bottom-4 right-4 z-10">
                      {!originalPersonImage ? (
                        <button
                          onClick={handleRemoveBackground}
                          disabled={isRemovingBackground || isLoading || isEnhancing}
                          className="px-3 py-2 bg-black/60 text-white text-xs font-semibold rounded-lg backdrop-blur-sm hover:bg-black/80 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isRemovingBackground ? 'Processing...' : 'Remove Background'}
                        </button>
                      ) : (
                        <button
                          onClick={handleRestoreOriginal}
                          disabled={isRemovingBackground || isLoading || isEnhancing}
                          className="px-3 py-2 bg-gray-600/60 text-white text-xs font-semibold rounded-lg backdrop-blur-sm hover:bg-gray-800/80 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Restore Original
                        </button>
                      )}
                    </div>
                  )}
                   {(isRemovingBackground || isEnhancing) && (
                    <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center rounded-lg p-4 overflow-hidden">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
                        <p className="text-sm text-indigo-600 mt-3 text-center font-medium">{loadingMessage}</p>
                        <div className="w-full bg-indigo-200 rounded-full h-1.5 mt-4 overflow-hidden">
                            <div className="bg-indigo-500 h-1.5 rounded-full w-full animate-pulse"></div>
                        </div>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-center space-x-3 bg-white p-3 rounded-lg shadow-inner border border-gray-200">
                  <input
                    type="checkbox"
                    id="background-toggle"
                    checked={showBackgroundUploader}
                    onChange={(e) => {
                      const isChecked = e.target.checked;
                      setShowBackgroundUploader(isChecked);
                      if (!isChecked) {
                        setBackgroundImage(null);
                      }
                    }}
                    className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <label htmlFor="background-toggle" className="text-lg font-medium text-gray-700 select-none cursor-pointer">
                    2. Add Background (Optional)
                  </label>
                </div>
                {showBackgroundUploader && (
                  <div className="mt-4 animate-fade-in-opacity bg-white p-4 rounded-lg shadow-inner border border-gray-200">
                    <ImageUploader
                      id="background-uploader"
                      label=""
                      imageSrc={backgroundImage}
                      onImageSelect={setBackgroundImage}
                      placeholderIcon={<BackgroundPlaceholderIcon />}
                      aspectRatio={personImageAspectRatio}
                      tooltipText="Upload a background to place the person in a new scene."
                    />
                  </div>
                )}
              </div>
            </div>
            
            {personImage && (
              <button
                  onClick={handleDetectBodyShape}
                  disabled={isDetectingShape || isLoading || isRemovingBackground || isEnhancing}
                  className="w-full px-4 py-2 bg-slate-600 text-white text-sm font-semibold rounded-lg shadow hover:bg-slate-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                  {isDetectingShape ? 'Analyzing...' : 'Analyze Body Shape'}
              </button>
            )}

            {(isDetectingShape || bodyShapeResult || shapeDetectionError) && (
                <div className="w-full bg-indigo-50 border border-indigo-200 rounded-lg p-4 animate-fade-in-opacity">
                    <h4 className="text-md font-bold text-indigo-800 mb-2 text-center">Body Shape Analysis</h4>
                    {isDetectingShape && (
                        <div className="flex items-center justify-center space-x-2">
                            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-indigo-500"></div>
                            <p className="text-sm text-indigo-600">AI is analyzing the image...</p>
                        </div>
                    )}
                    {shapeDetectionError && (
                        <p className="text-sm text-red-600 text-center">{shapeDetectionError}</p>
                    )}
                    {bodyShapeResult && (
                        <div className="space-y-4 text-sm text-left text-gray-800 w-full">
                            <div className="text-center mb-4">
                                <p className="text-gray-600 font-semibold">Detected Shape</p>
                                <span className="mt-1 text-lg inline-block bg-indigo-100 text-indigo-800 font-bold px-4 py-1 rounded-full">{bodyShapeResult.shape}</span>
                            </div>
                            
                            <p className="text-center italic text-gray-600 px-2 pb-4 border-b border-indigo-100">{bodyShapeResult.summary}</p>
                            
                            <div className="p-3 bg-white rounded-lg border border-indigo-100">
                                <h5 className="font-bold text-indigo-800">Tops to Consider</h5>
                                <p className="mt-1 text-gray-700 leading-relaxed">{bodyShapeResult.tops}</p>
                            </div>
                            
                            <div className="p-3 bg-white rounded-lg border border-indigo-100">
                                <h5 className="font-bold text-indigo-800">Flattering Bottoms</h5>
                                <p className="mt-1 text-gray-700 leading-relaxed">{bodyShapeResult.bottoms}</p>
                            </div>
                    
                            <div className="p-3 bg-white rounded-lg border border-indigo-100">
                                <h5 className="font-bold text-indigo-800">Dresses & Jumpsuits</h5>
                                <p className="mt-1 text-gray-700 leading-relaxed">{bodyShapeResult.dressesAndJumpsuits}</p>
                            </div>
                    
                            <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                                <h5 className="font-bold text-green-800">General Styling Tips</h5>
                                <p className="mt-1 text-gray-700 leading-relaxed">{bodyShapeResult.generalTips}</p>
                            </div>
                        </div>
                    )}
                </div>
            )}
          </div>
          <div className="w-full lg:max-w-lg mx-auto flex-shrink-0">
            <div className="bg-white p-4 rounded-lg shadow-inner border border-gray-200">
                <p className="block text-lg font-medium text-gray-700 mb-4 text-center">3. Build Your Outfit</p>
                <div className="grid grid-cols-2 gap-4 items-end">
                    <ImageUploader id="top-uploader" label="Top / Shirt" imageSrc={topImage} onImageSelect={setTopImage} aspectRatio={1} tooltipText="Upload a clear image of a shirt, t-shirt, or other top wear." />
                    <ImageUploader id="bottom-uploader" label="Bottom" imageSrc={bottomImage} onImageSelect={setBottomImage} aspectRatio={1} tooltipText="Provide a photo of pants, jeans, a skirt, or shorts."/>
                </div>
                <div className="mt-4">
                    <p className="text-sm font-medium text-gray-600 mb-2 text-center">Outerwear / Layering (Optional)</p>
                    <div className="grid grid-cols-3 gap-4 items-end">
                        <ImageUploader id="outerwear-uploader" label="Outerwear" imageSrc={outerwearImage} onImageSelect={setOuterwearImage} compact aspectRatio={1} tooltipText="Upload a photo of a coat, jacket, or cardigan."/>
                        <ImageUploader id="suit-jacket-uploader" label="Suit Jacket / Blazer" imageSrc={suitJacketImage} onImageSelect={setSuitJacketImage} compact aspectRatio={1} tooltipText="Best results with a clear image of a blazer or suit jacket."/>
                        <ImageUploader id="vest-uploader" label="Vest / Waistcoat" imageSrc={vestImage} onImageSelect={setVestImage} compact aspectRatio={1} tooltipText="Upload an image of a vest or waistcoat."/>
                        {suitJacketImage && vestImage && (
                            <div className="col-span-3 mt-3 flex items-center justify-center space-x-3 bg-gray-100 p-2 rounded-lg border border-gray-200 animate-fade-in-opacity">
                                <span className={`text-sm font-medium transition-colors ${!isSuitButtoned ? 'text-indigo-600' : 'text-gray-500'}`}>Unbuttoned</span>
                                <button
                                    type="button"
                                    onClick={() => setIsSuitButtoned(!isSuitButtoned)}
                                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${isSuitButtoned ? 'bg-indigo-600' : 'bg-gray-400'}`}
                                    role="switch"
                                    aria-checked={isSuitButtoned}
                                    aria-label="Toggle suit jacket buttoned state"
                                >
                                    <span
                                        aria-hidden="true"
                                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isSuitButtoned ? 'translate-x-5' : 'translate-x-0'}`}
                                    ></span>
                                </button>
                                <span className={`text-sm font-medium transition-colors ${isSuitButtoned ? 'text-indigo-600' : 'text-gray-500'}`}>Buttoned</span>
                            </div>
                        )}
                    </div>
                </div>
                <div className="mt-4">
                    <p className="text-sm font-medium text-gray-600 mb-2 text-center">Accessories (Optional)</p>
                    <div className="grid grid-cols-3 gap-4 items-end">
                        <ImageUploader id="footwear-uploader" label="Shoes" imageSrc={footwearImage} onImageSelect={setFootwearImage} compact aspectRatio={1} tooltipText="Provide a photo of shoes, boots, or other footwear."/>
                        <ImageUploader id="cap-uploader" label="Headwear" imageSrc={capImage} onImageSelect={setCapImage} compact aspectRatio={1} tooltipText="Upload a photo of a cap, hat, or beanie."/>
                        <ImageUploader id="watch-uploader" label="Watch" imageSrc={watchImage} onImageSelect={setWatchImage} compact aspectRatio={1} tooltipText="A clear, front-facing image of a watch works best."/>
                        <ImageUploader id="sunglasses-uploader" label="Sunglasses" imageSrc={sunglassesImage} onImageSelect={setSunglassesImage} compact aspectRatio={1} tooltipText="Upload an image of sunglasses, preferably on a plain background."/>
                        <ImageUploader id="tie-uploader" label="Tie / Bow" imageSrc={tieImage} onImageSelect={setTieImage} compact aspectRatio={1} tooltipText="Best results with a clear photo of a tie or bow tie."/>
                        <ImageUploader id="scarf-uploader" label="Scarf" imageSrc={scarfImage} onImageSelect={setScarfImage} compact aspectRatio={1} tooltipText="Provide a clear image of a scarf."/>
                    </div>
                </div>
            </div>
        </div>
        </div>
        
        <div className="mt-8 text-center w-full max-w-2xl mx-auto flex flex-col sm:flex-row items-center sm:space-x-4 space-y-4 sm:space-y-0">
          <button
            onClick={handleTryOn}
            disabled={!personImage || !hasAnyClothingItem || isLoading || isRemovingBackground || isEnhancing}
            className="w-full sm:w-auto flex-grow px-8 py-3 bg-[linear-gradient(to_right,_#fb923c,_#f472b6,_#4ade80,_#a78bfa)] text-white font-bold rounded-lg shadow-lg hover:scale-105 transform transition-transform duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
          >
            {isLoading ? 'Generating...' : 'Virtual Try-On'}
          </button>
          <div className="w-full sm:w-auto flex space-x-2">
            <button
                onClick={handleSaveTemplate}
                disabled={!hasAnyClothingItem || isLoading || isRemovingBackground || isEnhancing}
                className="w-full sm:w-auto px-6 py-3 bg-white text-indigo-600 font-semibold rounded-lg shadow-sm hover:bg-indigo-50 border border-indigo-200 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                aria-label="Save current outfit as a template"
            >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
                <span>Save Template</span>
            </button>
            <button
                onClick={handleReset}
                disabled={!personImage && !hasAnyClothingItem && !resultImage}
                className="w-full sm:w-auto px-6 py-3 bg-gray-200 text-gray-800 font-semibold rounded-lg shadow-sm hover:bg-gray-300 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Reset and clear all images"
            >
                Reset
            </button>
          </div>
        </div>
        
        {isLoading && <LoadingSpinner messages={TRY_ON_MESSAGES} />}
        
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
                <div className="mt-4 flex justify-center space-x-2 w-full">
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
                    onClick={handleSaveCustomization}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition-colors duration-200 flex items-center justify-center space-x-2"
                    aria-label="Save customization"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                    <span>Save</span>
                  </button>
                  <button
                    onClick={handleShare}
                    disabled={typeof navigator.share === 'undefined'}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Share image"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367 2.684z" />
                    </svg>
                    <span>Share</span>
                  </button>
                </div>
                {/* AI Edit Chat Box */}
                <div className="mt-8 w-full border-t border-gray-200 pt-6">
                    <div className="flex justify-between items-center mb-3">
                        <h5 className="text-md font-semibold text-gray-700">Edit with AI</h5>
                        <div className="flex space-x-2">
                            <button
                                onClick={handleUndo}
                                disabled={!canUndo || isEditing}
                                className="px-2 py-1 bg-gray-200 text-gray-800 text-xs font-semibold rounded-md hover:bg-gray-300 transition-colors duration-200 flex items-center space-x-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                                aria-label="Undo last edit"
                            >
                                <UndoIcon />
                                <span>Undo</span>
                            </button>
                            <button
                                onClick={handleRedo}
                                disabled={!canRedo || isEditing}
                                className="px-2 py-1 bg-gray-200 text-gray-800 text-xs font-semibold rounded-md hover:bg-gray-300 transition-colors duration-200 flex items-center space-x-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                                aria-label="Redo last edit"
                            >
                                <RedoIcon />
                                <span>Redo</span>
                            </button>
                        </div>
                    </div>
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

                {/* AI Stylist Suggestions */}
                {(isGeneratingSuggestions || stylingSuggestions || suggestionsError) && (
                    <div className="mt-8 w-full border-t border-gray-200 pt-6 animate-fade-in-opacity">
                        <h4 className="text-xl font-bold text-center text-gray-800 mb-4">AI Stylist Suggestions</h4>
                        {isGeneratingSuggestions && (
                             <div className="flex items-center justify-center space-x-2">
                                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-indigo-500"></div>
                                <p className="text-sm text-indigo-600">Your personal stylist is thinking...</p>
                            </div>
                        )}
                        {suggestionsError && (
                            <p className="text-sm text-red-600 text-center">{suggestionsError}</p>
                        )}
                        {stylingSuggestions && (
                            <div className="space-y-4 text-sm text-left text-gray-800 w-full">
                                <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                                    <h5 className="font-bold text-indigo-800">🎨 Color Palette</h5>
                                    <p className="mt-2 font-semibold text-gray-900">{stylingSuggestions.colorPalette.suggestion}</p>
                                    <p className="mt-1 text-gray-700 leading-relaxed">{stylingSuggestions.colorPalette.explanation}</p>
                                </div>
                                <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                                    <h5 className="font-bold text-green-800">🎉 Occasion</h5>
                                    <p className="mt-2 font-semibold text-gray-900">{stylingSuggestions.occasion.suggestion}</p>
                                    <p className="mt-1 text-gray-700 leading-relaxed">{stylingSuggestions.occasion.explanation}</p>
                                </div>
                                <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
                                    <h5 className="font-bold text-amber-800">👜 Accessories</h5>
                                    <p className="mt-2 font-semibold text-gray-900">{stylingSuggestions.accessories.suggestion}</p>
                                    <p className="mt-1 text-gray-700 leading-relaxed">{stylingSuggestions.accessories.explanation}</p>
                                </div>
                                <div className="p-4 bg-sky-50 rounded-lg border border-sky-100">
                                    <h5 className="font-bold text-sky-800">💡 Pro Tip</h5>
                                    <p className="mt-2 font-semibold text-gray-900">{stylingSuggestions.overallTip.suggestion}</p>
                                    <p className="mt-1 text-gray-700 leading-relaxed">{stylingSuggestions.overallTip.explanation}</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
      <History
          isOpen={isHistoryOpen}
          onClose={toggleHistory}
          historyItems={history}
          customizationItems={customizations}
          templateItems={templates}
          onSelectHistoryItem={handleSelectHistoryItem}
          onSelectTemplate={handleSelectTemplate}
          onDeleteHistoryItem={handleDeleteHistoryItem}
          onDeleteCustomizationItem={handleDeleteCustomizationItem}
          onDeleteTemplateItem={handleDeleteTemplateItem}
          onClearHistory={handleClearHistory}
          onClearCustomizations={handleClearCustomizations}
          onClearTemplates={handleClearTemplates}
      />
    </div>
  );
};

export default App;
