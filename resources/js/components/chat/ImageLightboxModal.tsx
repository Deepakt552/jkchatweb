import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, ZoomIn, ZoomOut, RotateCw, ExternalLink, Maximize2 } from 'lucide-react';

interface ImageLightboxModalProps {
    isOpen: boolean;
    onClose: () => void;
    imageUrl: string;
    fileName?: string;
    fileSize?: number;
}

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({
    isOpen,
    onClose,
    imageUrl,
    fileName = 'Image',
    fileSize,
}) => {
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);

    // Reset transformations when modal opens or image changes
    useEffect(() => {
        if (isOpen) {
            setZoom(1);
            setRotation(0);
        }
    }, [isOpen, imageUrl]);

    // Handle Escape key listener
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    if (!isOpen || !imageUrl) return null;

    const handleZoomIn = (e: React.MouseEvent) => {
        e.stopPropagation();
        setZoom(prev => Math.min(prev + 0.25, 3.5));
    };

    const handleZoomOut = (e: React.MouseEvent) => {
        e.stopPropagation();
        setZoom(prev => Math.max(prev - 0.25, 0.5));
    };

    const handleRotate = (e: React.MouseEvent) => {
        e.stopPropagation();
        setRotation(prev => (prev + 90) % 360);
    };

    const handleReset = (e: React.MouseEvent) => {
        e.stopPropagation();
        setZoom(1);
        setRotation(0);
    };

    const formattedSize = fileSize ? `${(fileSize / 1024).toFixed(1)} KB` : '';

    return createPortal(
        <div
            onClick={onClose}
            className="fixed inset-0 z-[99999] flex flex-col items-center justify-between bg-black/95 backdrop-blur-2xl p-4 select-none animate-in fade-in duration-200"
        >
            {/* Top Toolbar */}
            <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-6xl flex items-center justify-between z-20 pt-2 px-2"
            >
                {/* File Info */}
                <div className="flex flex-col min-w-0 pr-4">
                    <span className="text-sm font-bold text-white truncate max-w-md">{fileName}</span>
                    {formattedSize && (
                        <span className="text-xs text-neutral-400 font-mono mt-0.5">{formattedSize}</span>
                    )}
                </div>

                {/* Actions Toolbar */}
                <div className="flex items-center gap-2 bg-neutral-900/80 border border-white/10 backdrop-blur-md px-3 py-1.5 rounded-full shadow-2xl">
                    <button
                        type="button"
                        onClick={handleZoomIn}
                        className="p-1.5 rounded-full hover:bg-white/15 text-white/80 hover:text-white transition-colors cursor-pointer"
                        title="Zoom In (+)"
                    >
                        <ZoomIn className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        onClick={handleZoomOut}
                        className="p-1.5 rounded-full hover:bg-white/15 text-white/80 hover:text-white transition-colors cursor-pointer"
                        title="Zoom Out (-)"
                    >
                        <ZoomOut className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        onClick={handleRotate}
                        className="p-1.5 rounded-full hover:bg-white/15 text-white/80 hover:text-white transition-colors cursor-pointer"
                        title="Rotate (90°)"
                    >
                        <RotateCw className="h-4 w-4" />
                    </button>
                    {(zoom !== 1 || rotation !== 0) && (
                        <button
                            type="button"
                            onClick={handleReset}
                            className="p-1.5 rounded-full hover:bg-white/15 text-white/80 hover:text-white transition-colors cursor-pointer text-xs font-semibold px-2"
                            title="Reset Zoom & Rotation"
                        >
                            Reset
                        </button>
                    )}

                    <div className="h-4 w-[1px] bg-white/20 mx-1" />

                    <a
                        href={imageUrl}
                        download={fileName}
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 rounded-full hover:bg-white/15 text-white/80 hover:text-white transition-colors cursor-pointer"
                        title="Download Image"
                    >
                        <Download className="h-4 w-4" />
                    </a>

                    <a
                        href={imageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 rounded-full hover:bg-white/15 text-white/80 hover:text-white transition-colors cursor-pointer"
                        title="Open Full Size"
                    >
                        <ExternalLink className="h-4 w-4" />
                    </a>

                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-full bg-white/10 hover:bg-red-500/80 text-white transition-colors cursor-pointer ml-1"
                        title="Close (Esc)"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Center Image Container */}
            <div
                onClick={(e) => e.stopPropagation()}
                className="flex-1 w-full max-w-6xl flex items-center justify-center overflow-hidden my-4"
            >
                <div
                    className="relative max-h-[82vh] max-w-full flex items-center justify-center transition-transform duration-200 ease-out"
                    style={{
                        transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    }}
                >
                    <img
                        src={imageUrl}
                        alt={fileName}
                        className="max-h-[80vh] max-w-full object-contain rounded-lg shadow-2xl border border-white/10 select-none pointer-events-auto"
                        draggable={false}
                    />
                </div>
            </div>

            {/* Bottom Helper Hint */}
            <div className="text-center z-10 pb-2">
                <span className="text-[11px] text-neutral-400 bg-black/40 px-3 py-1 rounded-full border border-white/5 backdrop-blur-sm">
                    Press <kbd className="font-mono bg-white/10 px-1 py-0.5 rounded text-white text-[10px]">Esc</kbd> or click outside to close
                </span>
            </div>
        </div>,
        document.body
    );
};
