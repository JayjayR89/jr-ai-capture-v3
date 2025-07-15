import React, { useState, useCallback, useMemo } from 'react';
import { X, Volume2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CapturedImage {
  id: string;
  dataUrl: string;
  timestamp: Date;
  description?: string;
}

interface OptimizedImageGalleryProps {
  images: CapturedImage[];
  onRemoveImage?: (id: string) => void;
  onUpdateDescription?: (id: string, description: string) => void;
}

// Memoized image item component
const ImageItem = React.memo(({ 
  image, 
  index, 
  onClick, 
  onRemove, 
  onSpeak 
}: {
  image: CapturedImage;
  index: number;
  onClick: () => void;
  onRemove: () => void;
  onSpeak: () => void;
}) => {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleSpeak = useCallback(() => {
    if (!image.description || isSpeaking) return;
    
    setIsSpeaking(true);
    // Use Web Speech API for better performance
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(image.description);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      speechSynthesis.speak(utterance);
    }
  }, [image.description, isSpeaking]);

  return (
    <div className="flex gap-3 p-3 rounded-lg bg-muted/20 border hover:bg-muted/30 transition-colors">
      <img
        src={image.dataUrl}
        alt={`Capture ${index + 1}`}
        className="w-16 h-16 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
        onClick={onClick}
        loading="lazy"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-medium">
            Capture {index + 1}
          </p>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {image.timestamp.toLocaleTimeString()}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="h-6 w-6 p-0"
              title="Remove image"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
        {image.description ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              {image.description}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSpeak}
              disabled={isSpeaking}
              className="h-6 px-2 text-xs"
              title="Listen to description"
            >
              <Volume2 className="h-3 w-3 mr-1" />
              {isSpeaking ? 'Speaking...' : 'Listen'}
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 bg-yellow-500 rounded-full animate-pulse" />
            <p className="text-xs text-yellow-600">Processing...</p>
          </div>
        )}
      </div>
    </div>
  );
});

ImageItem.displayName = 'ImageItem';

// Memoized image dialog component
const ImageDialog = React.memo(({ 
  image, 
  isOpen, 
  onClose 
}: {
  image: CapturedImage | null;
  isOpen: boolean;
  onClose: () => void;
}) => {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleSpeak = useCallback(() => {
    if (!image?.description || isSpeaking) return;
    
    setIsSpeaking(true);
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(image.description);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      speechSynthesis.speak(utterance);
    }
  }, [image?.description, isSpeaking]);

  if (!image) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <div className="relative">
          <DialogClose asChild>
            <Button
              variant="secondary"
              size="icon"
              className="absolute top-4 right-4 z-10"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogClose>
          
          <div className="p-6">
            <img
              src={image.dataUrl}
              alt="Full size capture"
              className="w-full h-auto max-h-[60vh] object-contain rounded-lg"
              loading="lazy"
            />
            
            {image.description && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">AI Description</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSpeak}
                    disabled={isSpeaking}
                    className="h-8"
                  >
                    <Volume2 className="h-4 w-4 mr-2" />
                    {isSpeaking ? 'Speaking...' : 'Listen'}
                  </Button>
                </div>
                
                <div className="text-sm leading-relaxed prose prose-invert max-w-none">
                  {image.description}
                </div>
              </div>
            )}
            
            <p className="text-xs text-muted-foreground mt-4">
              Captured: {image.timestamp.toLocaleString()}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});

ImageDialog.displayName = 'ImageDialog';

export const OptimizedImageGallery: React.FC<OptimizedImageGalleryProps> = ({
  images,
  onRemoveImage,
  onUpdateDescription
}) => {
  const [selectedImage, setSelectedImage] = useState<CapturedImage | null>(null);

  const handleImageClick = useCallback((image: CapturedImage) => {
    setSelectedImage(image);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setSelectedImage(null);
  }, []);

  const handleRemoveImage = useCallback((id: string) => {
    onRemoveImage?.(id);
    if (selectedImage?.id === id) {
      setSelectedImage(null);
    }
  }, [onRemoveImage, selectedImage]);

  const reversedImages = useMemo(() => [...images].reverse(), [images]);

  if (images.length === 0) return null;

  return (
    <>
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            Captured Images ({images.length})
          </h3>
          {images.length > 10 && (
            <Badge variant="outline" className="text-xs">
              {images.length} images
            </Badge>
          )}
        </div>
        
        <ScrollArea className="h-96">
          <div className="space-y-2 pr-2">
            {reversedImages.map((image, index) => (
              <ImageItem
                key={image.id}
                image={image}
                index={reversedImages.length - index}
                onClick={() => handleImageClick(image)}
                onRemove={() => handleRemoveImage(image.id)}
                onSpeak={() => {}}
              />
            ))}
          </div>
        </ScrollArea>
      </Card>

      <ImageDialog
        image={selectedImage}
        isOpen={!!selectedImage}
        onClose={handleCloseDialog}
      />
    </>
  );
};
