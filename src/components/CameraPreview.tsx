
import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcw, Minimize2, Maximize2, Loader } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface CameraPreviewProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  isMinimized: boolean;
  onToggleMinimize: () => void;
  onFlipCamera: () => void;
  isCameraLoading: boolean;
  videoLoaded: boolean;
  availableCameras: MediaDeviceInfo[];
  showFlipButton?: boolean;
  previewMinWidth?: number;
  previewMinHeight?: number;
  maintainAspectRatio?: boolean;
}

export const CameraPreview: React.FC<CameraPreviewProps> = ({
  videoRef,
  isMinimized,
  onToggleMinimize,
  onFlipCamera,
  isCameraLoading,
  videoLoaded,
  availableCameras,
  showFlipButton = true,
  previewMinWidth = 400,
  previewMinHeight = 225,
  maintainAspectRatio = true
}) => {
  const [lastTap, setLastTap] = useState<number>(0);

  // Double-tap handler for mobile camera flip
  const handleVideoTap = useCallback(() => {
    const now = Date.now();
    const timeDiff = now - lastTap;
    
    if (timeDiff < 300 && timeDiff > 0) {
      // Double tap detected - flip camera
      onFlipCamera();
    }
    
    setLastTap(now);
  }, [lastTap, onFlipCamera]);

  // Check if we should show flip button (more lenient conditions for mobile)
  const shouldShowFlipButton = () => {
    // Always show on mobile devices (they typically have multiple cameras)
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Show if:
    // 1. Explicitly enabled AND
    // 2. Camera is not loading AND
    // 3. Either we detected multiple cameras OR we're on mobile (where enumeration might fail)
    return showFlipButton && 
           !isCameraLoading && 
           (availableCameras.length > 1 || isMobile || availableCameras.length === 0);
  };
  const getMinimizedStyle = () => {
    if (!isMinimized) return {};
    
    if (maintainAspectRatio) {
      // Calculate height based on 16:9 aspect ratio
      const aspectHeight = (previewMinWidth * 9) / 16;
      return {
        width: `${previewMinWidth}px`,
        height: `${aspectHeight}px`
      };
    }
    
    return {
      width: `${previewMinWidth}px`,
      height: `${previewMinHeight}px`
    };
  };

  return (
    <Card 
      className={`relative transition-all duration-300 ${
        isMinimized ? 'mx-auto' : 'w-full'
      }`}
      style={getMinimizedStyle()}
    >
      <div className={`bg-muted/20 rounded-lg overflow-hidden camera-preview relative ${
        isMinimized ? 'aspect-video h-full' : 'aspect-video'
      }`}>
        {isCameraLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
            <div className="flex flex-col items-center gap-3">
              <Loader className="h-8 w-8 animate-spin" />
              <p className="text-sm text-muted-foreground">Loading camera...</p>
            </div>
          </div>
        )}
        
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className={`w-full h-full object-cover transition-opacity duration-300 cursor-pointer ${
            videoLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ aspectRatio: '16/9' }}
          onClick={handleVideoTap}
          onTouchEnd={handleVideoTap}
        />
        
        {/* Top Left - Minimize/Maximize Button */}
        <Button 
          variant="secondary" 
          size="icon" 
          onClick={onToggleMinimize} 
          className="absolute top-4 left-4 bg-black/50 hover:bg-black/70 z-20"
          title={isMinimized ? "Expand camera preview" : "Minimize camera preview"}
        >
          {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
        </Button>
        
        {/* Top Right - Flip Camera Button - Show on mobile and when multiple cameras detected */}
        {shouldShowFlipButton() && (
          <Button 
            variant="secondary" 
            size="icon" 
            onClick={onFlipCamera} 
            className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 z-20"
            disabled={isCameraLoading}
            title="Switch camera (front/back) - Double tap video to flip"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}
        
        {/* Double-tap hint for mobile users */}
        {shouldShowFlipButton() && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
            <div className="bg-black/60 text-white text-xs px-3 py-1 rounded-full opacity-70">
              Double tap to flip camera
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
