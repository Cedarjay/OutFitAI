import React, { useState, useMemo, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { StylingSuggestions } from '../services/geminiService.ts';

export interface HistoryItem {
  id: string;
  personImage: string;
  backgroundImage?: string | null;
  topImage?: string | null;
  bottomImage?: string | null;
  suitJacketImage?: string | null;
  vestImage?: string | null;
  outerwearImage?: string | null;
  footwearImage?: string | null;
  capImage?: string | null;
  watchImage?: string | null;
  sunglassesImage?: string | null;
  tieImage?: string | null;
  scarfImage?: string | null;
  resultImage: string;
  generatedText: string | null;
  stylingSuggestions?: StylingSuggestions | null;
}

export interface TemplateItem {
    id: string;
    topImage?: string | null;
    bottomImage?: string | null;
    suitJacketImage?: string | null;
    vestImage?: string | null;
    outerwearImage?: string | null;
    footwearImage?: string | null;
    capImage?: string | null;
    watchImage?: string | null;
    sunglassesImage?: string | null;
    tieImage?: string | null;
    scarfImage?: string | null;
}

interface HistoryProps {
    isOpen: boolean;
    onClose: () => void;
    historyItems: HistoryItem[];
    customizationItems: HistoryItem[];
    templateItems: TemplateItem[];
    onSelectHistoryItem: (item: HistoryItem) => void;
    onSelectTemplate: (item: TemplateItem) => void;
    onDeleteHistoryItem: (id: string) => void;
    onDeleteCustomizationItem: (id: string) => void;
    onDeleteTemplateItem: (id: string) => void;
    onClearHistory: () => void;
    onClearCustomizations: () => void;
    onClearTemplates: () => void;
}

const TrashIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002 2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
    </svg>
);

const CloseIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const ErrorIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
);

// Thumbnail sub-component for History and Saved items
const HistoryThumbnail: React.FC<{
    item: HistoryItem;
    onSelect: (item: HistoryItem) => void;
    onDelete: (e: React.MouseEvent, id: string) => void;
}> = ({ item, onSelect, onDelete }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [isIntersecting, setIsIntersecting] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsIntersecting(true);
                    observer.unobserve(entry.target);
                }
            },
            { rootMargin: "0px 0px 200px 0px" } // Load image 200px before it enters the viewport
        );

        const currentRef = ref.current;
        if (currentRef) {
            observer.observe(currentRef);
        }

        return () => {
            if (currentRef) {
                observer.unobserve(currentRef);
            }
        };
    }, []);

    const handleImageLoad = () => setIsLoading(false);
    const handleImageError = () => {
        setIsLoading(false);
        setHasError(true);
    };

    const isClickable = !hasError;

    return (
        <div
            ref={ref}
            className={`group relative aspect-square rounded-lg overflow-hidden shadow-md bg-gray-200 ${isClickable ? 'cursor-pointer hover:shadow-xl transition-shadow duration-300' : ''}`}
            onClick={isClickable ? () => onSelect(item) : undefined}
            role="button"
            tabIndex={isClickable ? 0 : -1}
            aria-label={hasError ? "Image failed to load" : "View this creation"}
            onKeyDown={isClickable ? (e) => e.key === 'Enter' && onSelect(item) : undefined}
        >
            {isIntersecting && isLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-indigo-500"></div>
                </div>
            )}
            
            {hasError ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 p-2">
                    <ErrorIcon />
                    <span className="text-xs text-red-600 mt-1 text-center">Load Failed</span>
                </div>
            ) : (
                isIntersecting && (
                    <img
                        src={item.resultImage}
                        alt="A previous virtual try-on result"
                        className={`w-full h-full object-cover transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
                        onLoad={handleImageLoad}
                        onError={handleImageError}
                    />
                )
            )}
            
            {!isLoading && !hasError && (
                 <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <p className="text-white font-bold text-center">View</p>
                </div>
            )}

            <button
                onClick={(e) => onDelete(e, item.id)}
                className="absolute top-1 right-1 p-1.5 bg-white/80 rounded-full text-gray-800 hover:bg-white hover:text-red-600 scale-0 group-hover:scale-100 transition-transform duration-200 z-10"
                aria-label="Delete this item"
            >
                <TrashIcon />
            </button>
        </div>
    );
};

// Thumbnail sub-component for Template items
const TemplateThumbnail: React.FC<{
    item: TemplateItem;
    onSelect: (item: TemplateItem) => void;
    onDelete: (e: React.MouseEvent, id: string) => void;
}> = ({ item, onSelect, onDelete }) => {
    const [isIntersecting, setIsIntersecting] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsIntersecting(true);
                    observer.unobserve(entry.target);
                }
            },
            { rootMargin: "0px 0px 200px 0px" }
        );

        const currentRef = ref.current;
        if (currentRef) {
            observer.observe(currentRef);
        }

        return () => {
            if (currentRef) {
                observer.unobserve(currentRef);
            }
        };
    }, []);

    const images = useMemo(() => {
        return [
            item.topImage, item.bottomImage, item.suitJacketImage, item.vestImage, item.outerwearImage,
            item.footwearImage, item.capImage, item.watchImage, item.sunglassesImage,
            item.tieImage, item.scarfImage
        ].filter((img): img is string => !!img); // Filter out null/undefined values
    }, [item]);

    const gridClass = images.length <= 4 ? 'grid-cols-2' : 'grid-cols-3';

    return (
        <div
            ref={ref}
            className="group relative aspect-square rounded-lg overflow-hidden shadow-md bg-gray-200 cursor-pointer hover:shadow-xl transition-shadow duration-300"
            onClick={() => onSelect(item)}
            role="button"
            tabIndex={0}
            aria-label="Apply this outfit template"
            onKeyDown={(e) => e.key === 'Enter' && onSelect(item)}
        >
            <div className={`w-full h-full grid ${gridClass} gap-0.5`}>
                {images.slice(0, 9).map((src, index) => (
                    <div key={index} className="w-full h-full bg-gray-300">
                        {isIntersecting && <img src={src} alt={`Outfit item ${index + 1}`} className="w-full h-full object-cover" />}
                    </div>
                ))}
            </div>

            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-2">
                <p className="text-white font-bold text-center text-sm">Apply Template</p>
            </div>
            
            <button
                onClick={(e) => onDelete(e, item.id)}
                className="absolute top-1 right-1 p-1.5 bg-white/80 rounded-full text-gray-800 hover:bg-white hover:text-red-600 scale-0 group-hover:scale-100 transition-transform duration-200 z-10"
                aria-label="Delete this template"
            >
                <TrashIcon />
            </button>
        </div>
    );
};


const History: React.FC<HistoryProps> = ({ 
    isOpen,
    onClose,
    historyItems,
    customizationItems,
    templateItems,
    onSelectHistoryItem,
    onSelectTemplate,
    onDeleteHistoryItem,
    onDeleteCustomizationItem,
    onDeleteTemplateItem,
    onClearHistory,
    onClearCustomizations,
    onClearTemplates
}) => {
    const [activeTab, setActiveTab] = useState<'history' | 'saved' | 'templates'>('history');

    const renderContent = () => {
        switch (activeTab) {
            case 'history':
                return { items: historyItems, type: 'History' };
            case 'saved':
                return { items: customizationItems, type: 'Saved' };
            case 'templates':
                return { items: templateItems, type: 'Templates' };
        }
    };
    
    const { items, type } = renderContent();
    const hasItems = items.length > 0;

    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation(); // Prevent the select item handler from firing
        switch (activeTab) {
            case 'history': onDeleteHistoryItem(id); break;
            case 'saved': onDeleteCustomizationItem(id); break;
            case 'templates': onDeleteTemplateItem(id); break;
        }
    };

    const handleClearAction = () => {
        switch (activeTab) {
            case 'history':
                if (window.confirm('Are you sure you want to delete all history items? This cannot be undone.')) onClearHistory();
                break;
            case 'saved':
                onClearCustomizations();
                break;
            case 'templates':
                onClearTemplates();
                break;
        }
    };

    if (typeof document === 'undefined') {
        return null;
    }

    return ReactDOM.createPortal(
        <>
            {/* Overlay */}
            <div
                className={`fixed inset-0 bg-black/60 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
                aria-hidden="true"
            />
            {/* Panel */}
            <aside
                className={`fixed top-0 right-0 bottom-0 w-full max-w-md bg-gray-50 shadow-xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="history-title"
            >
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-gray-200 flex-shrink-0">
                    <h3 id="history-title" className="text-xl font-bold text-gray-900">
                        {type === 'History' && 'Creation History'}
                        {type === 'Saved' && 'Saved Outfits'}
                        {type === 'Templates' && 'Outfit Templates'}
                    </h3>
                    <button 
                        onClick={onClose}
                        className="p-1.5 text-gray-600 rounded-md hover:bg-gray-200 transition-colors"
                        aria-label="Close panel"
                    >
                        <CloseIcon />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 overflow-y-auto flex-grow">
                    <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg mb-4">
                        {(['history', 'saved', 'templates'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`flex-1 text-center capitalize px-3 py-1.5 text-sm font-semibold rounded-md transition-all duration-200 ${activeTab === tab ? 'bg-white text-gray-800 shadow' : 'bg-transparent text-gray-600'}`}
                                aria-current={activeTab === tab ? 'page' : undefined}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {hasItems ? (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {items.map(item => {
                                if (activeTab === 'templates') {
                                    return (
                                        <TemplateThumbnail
                                            key={item.id}
                                            item={item as TemplateItem}
                                            onSelect={onSelectTemplate}
                                            onDelete={handleDelete}
                                        />
                                    );
                                }
                                return (
                                    <HistoryThumbnail
                                        key={item.id}
                                        item={item as HistoryItem}
                                        onSelect={onSelectHistoryItem}
                                        onDelete={handleDelete}
                                    />
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center h-full flex flex-col justify-center items-center py-16">
                            <p className="text-gray-500">
                                {activeTab === 'history' && 'Your previous creations will appear here.'}
                                {activeTab === 'saved' && 'You have no saved outfits.'}
                                {activeTab === 'templates' && 'Your saved outfit templates will appear here.'}
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer with Clear button */}
                {hasItems && (
                    <div className="p-4 border-t border-gray-200 flex-shrink-0">
                        <button
                            onClick={handleClearAction}
                            className="w-full px-3 py-2 text-sm bg-red-100 text-red-700 font-semibold rounded-lg hover:bg-red-200 transition-colors duration-200 flex items-center justify-center space-x-2"
                            aria-label={`Clear all ${type}`}
                        >
                            <TrashIcon />
                            <span>Clear All {type}</span>
                        </button>
                    </div>
                )}
            </aside>
        </>,
        document.body
    );
};

export default History;