import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Camera, CameraOff, Circle, Sparkles, Home, Settings, LogIn, LogOut, User, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { SettingsModal } from './SettingsModal';
import { AutoCaptureProgress } from './AutoCaptureProgress';
import { OptimizedImageGallery } from './OptimizedImageGallery';
import { useAutoCapture } from '@/hooks/useAutoCapture';
import { useImageStorage } from '@/hooks/useImageStorage';
import { useAIQueue } from '@/hooks/useAIQueue';
import { CameraPreview } from './CameraPreview';

// Using Puter.com API loaded from CDN
declare const puter: any;

interface User {
  username: string;
  fullName?: string;
}

interface Settings {
  theme: 'light' | 'dark';
  streaming: boolean;
  autoCapture: boolean;
  captureTime: number;
  captureAmount: number;
  captureQuality: 'high' | 'medium' | 'low';
  completeAlert: boolean;
  tooltips: boolean;
}

const OptimizedCameraAIApp: React.FC = () => {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isPuterAvailable, setIsPuterAvailable] = useState(false);

  // Camera state
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Settings state
  const [settings, setSettings] = useState<Settings>({
    theme: 'dark',
    streaming: true,
    autoCapture: false,
    captureTime: 5,
    captureAmount: 5,
    captureQuality: 'high',
    completeAlert: true,
    tooltips: true
  });

  // UI state
  const [showSettings, setShowSettings] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showFlash, setShowFlash] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Optimized image storage
  const { images: capturedImages, addImage, updateImageDescription, removeImage } = useImageStorage({
    maxImages: 50,
    compressionQuality: 0.7
  });

  // AI Queue for processing descriptions
  const {
    addToQueue: addToAIQueue,
    isProcessing: processingAI,
    processedCount: aiProcessedCount
  } = useAIQueue(
    async (dataUrl: string) => {
      if (!isPuterAvailable) {
        throw new Error('AI services are not available');
      }
      
      const enhancedPrompt = `Analyze this image in detail. Please provide a comprehensive description that includes:
1. Main objects and their positions
2. Colors and lighting conditions
3. Any text or signs visible
4. Overall scene context and mood
5. Notable details or interesting features

Be specific and descriptive, but concise.`;

      const response = await puter.ai.chat(enhancedPrompt, dataUrl);
      return response.message || 'No description available';
    },
    {
      maxConcurrent: 1,
      retryLimit: 3,
      rateLimitDelay: 2000
    }
  );

  // Auto-capture hook
  const autoCapture = useAutoCapture(
    {
      enabled: settings.autoCapture,
      captureTime: settings.captureTime,
      captureAmount: settings.captureAmount,
      captureQuality: settings.captureQuality
    },
    useCallback(() => {
      if (!videoRef.current || !canvasRef.current || !isCameraOn) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (!videoLoaded || video.videoWidth === 0 || video.videoHeight === 0) return;

      setShowFlash(true);

      try {
        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const quality = settings.captureQuality === 'high' ? 0.9 :
                       settings.captureQuality === 'medium' ? 0.7 : 0.5;
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        
        const imageId = addImage(dataUrl);
        
        // Add to AI queue if authenticated and Puter is available
        if (isAuthenticated && isPuterAvailable) {
          addToAIQueue(dataUrl);
        }
        
        setTimeout(() => setShowFlash(false), 300);
      } catch (error) {
        console.error('Auto-capture error:', error);
        setShowFlash(false);
      }
    }, [isCameraOn, videoLoaded, settings.captureQuality, isAuthenticated, isPuterAvailable, addImage, addToAIQueue]),
    isCameraOn && videoLoaded
  );

  // Load settings on mount
  useEffect(() => {
    loadSettings();
    checkAvailableCameras();
    checkAuthStatus();
    checkPuterAvailability();
  }, []);

  // Process AI queue results
  useEffect(() => {
    if (aiProcessedCount > 0) {
      // Update the last processed image with description
      const lastImage = capturedImages[0];
      if (lastImage && !lastImage.description) {
        // The description will be updated via the AI queue callback
      }
    }
  }, [aiProcessedCount, capturedImages]);

  const loadSettings = useCallback(() => {
    try {
      const saved = localStorage.getItem('aiCameraSettings');
      if (saved) {
        const savedSettings = JSON.parse(saved);
        setSettings(savedSettings);
        applyTheme(savedSettings.theme);
      } else {
        applyTheme(settings.theme);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      applyTheme(settings.theme);
    }
  }, [settings.theme]);

  const applyTheme = useCallback((theme: 'light' | 'dark') => {
    const htmlElement = document.documentElement;
    htmlElement.classList.remove('light', 'dark');
    htmlElement.classList.add(theme);
  }, []);

  const handleSettingsChange = useCallback((newSettings: Settings) => {
    setSettings(newSettings);
    applyTheme(newSettings.theme);
    
    try {
      localStorage.setItem('aiCameraSettings', JSON.stringify(newSettings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }, [applyTheme]);

  const checkAuthStatus = useCallback(async () => {
    if (!isPuterAvailable) {
      console.log('Puter not available, skipping auth check');
      return;
    }

    try {
      const isSignedIn = await puter.auth.isSignedIn();
      if (isSignedIn) {
        const userInfo = await puter.auth.getUser();
        setIsAuthenticated(true);
        setUser({
          username: userInfo.username,
          fullName: userInfo.fullName
        });
      }
    } catch (error) {
      console.log('Not signed in or error checking auth status:', error);
    }
  }, [isPuterAvailable]);

  const checkPuterAvailability = useCallback(() => {
    try {
      const available = typeof window !== 'undefined' &&
                       (window as any).puter &&
                       (window as any).puter.ai &&
                       (window as any).puter.auth;
      setIsPuterAvailable(available);
    } catch (error) {
      console.log('Puter not available:', error);
      setIsPuterAvailable(false);
    }
  }, []);

  const checkAvailableCameras = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter(device => device.kind === 'videoinput');
      setAvailableCameras(cameras);
    } catch (error) {
      console.error('Error enumerating cameras:', error);
    }
  }, []);

  const handleSignIn = useCallback(async () => {
    if (!isPuterAvailable) {
      toast({
        title: "AI Services Unavailable",
        description: "Please check your internet connection and refresh the page.",
        variant: "destructive",
        duration: 3000
      });
      return;
    }

    try {
      const result = await puter.auth.signIn();
      setIsAuthenticated(true);
      setUser({
        username: result.username,
        fullName: result.fullName
      });
      toast({
        title: "Signed in successfully",
        description: `Welcome, ${result.username}!`,
        duration: 3000
      });
    } catch (error) {
      console.error('Sign in error:', error);
      toast({
        title: "Sign in failed",
        description: "Please try again",
        variant: "destructive",
        duration: 3000
      });
    }
  }, [isPuterAvailable]);

  const handleSignOut = useCallback(async () => {
    if (!isPuterAvailable) {
      toast({
        title: "AI Services Unavailable",
        description: "Please check your internet connection and refresh the page.",
        variant: "destructive",
        duration: 3000
      });
      return;
    }

    try {
      await puter.auth.signOut();
      setIsAuthenticated(false);
      setUser(null);
      toast({
        title: "Signed out successfully",
        duration: 3000
      });
    } catch (error) {
      console.error('Sign out error:', error);
      setIsAuthenticated(false);
      setUser(null);
    }
  }, [isPuterAvailable]);

  const requestCameraPermission = useCallback(async () => {
    setIsCameraLoading(true);
    setVideoLoaded(false);
    
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });
      
      setStream(mediaStream);
      setIsCameraOn(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        
        const video = videoRef.current;
        
        const handleLoadedMetadata = () => {
          setVideoLoaded(true);
          video.play().catch(error => {
            console.error('Error playing video:', error);
            toast({
              title: "Video playback error",
              description: "Unable to start video preview",
              variant: "destructive",
              duration: 3000
            });
          });
        };

        const handleLoadedData = () => {
          setIsCameraLoading(false);
        };

        const handleError = (error: Event) => {
          console.error('Video element error:', error);
          setIsCameraLoading(false);
          toast({
            title: "Video error",
            description: "Problem with video stream",
            variant: "destructive",
            duration: 3000
          });
        };

        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        video.addEventListener('loadeddata', handleLoadedData);
        video.addEventListener('error', handleError);
        
        return () => {
          video.removeEventListener('loadedmetadata', handleLoadedMetadata);
          video.removeEventListener('loadeddata', handleLoadedData);
          video.removeEventListener('error', handleError);
        };
      }
      
      toast({
        title: "Camera access granted",
        description: "You can now capture images",
        duration: 3000
      });
    } catch (error) {
      console.error('Camera permission error:', error);
      setIsCameraLoading(false);
      setIsCameraOn(false);
      
      let errorMessage = "Camera access denied";
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = "Camera permission denied. Please allow camera access and try again.";
        } else if (error.name === 'NotFoundError') {
          errorMessage = "No camera found. Please connect a camera and try again.";
        } else if (error.name === 'NotReadableError') {
          errorMessage = "Camera is being used by another application.";
        }
      }
      
      toast({
        title: "Camera Error",
        description: errorMessage,
        variant: "destructive",
        duration: 3000
      });
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
      });
      setStream(null);
    }
    setIsCameraOn(false);
    setIsCameraLoading(false);
    setVideoLoaded(false);
    setIsMinimized(false);
    autoCapture.stopAutoCapture();
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stream, autoCapture]);

  const flipCamera = useCallback(async () => {
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacingMode);
    if (isCameraOn) {
      stopCamera();
      setTimeout(() => {
        requestCameraPermission();
      }, 500);
    }
  }, [facingMode, isCameraOn, stopCamera, requestCameraPermission]);

  const manualCapture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isCameraOn) {
      toast({
        title: "Camera not ready",
        description: "Please ensure camera is on",
        variant: "destructive",
        duration: 3000
      });
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!videoLoaded || video.videoWidth === 0 || video.videoHeight === 0) {
      toast({
        title: "Video not ready",
        description: "Please wait for camera to fully load",
        variant: "destructive",
        duration: 3000
      });
      return;
    }

    setShowFlash(true);

    try {
      const context = canvas.getContext('2d');
      if (!context) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const quality = settings.captureQuality === 'high' ? 0.9 : 
                     settings.captureQuality === 'medium' ? 0.7 : 0.5;
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      
      const imageId = addImage(dataUrl);
      
      // Add to AI queue if authenticated and Puter is available
      if (isAuthenticated && isPuterAvailable) {
        addToAIQueue(dataUrl);
      }
      
      setTimeout(() => setShowFlash(false), 300);
      
      toast({
        title: "Image Captured",
        description: "Screenshot saved successfully",
        duration: 3000
      });
    } catch (error) {
      console.error('Capture error:', error);
      toast({
        title: "Capture failed",
        description: "Unable to capture image from video",
        variant: "destructive",
        duration: 3000
      });
      setShowFlash(false);
    }
  }, [isCameraOn, videoLoaded, settings.captureQuality, isAuthenticated, addImage, addToAIQueue]);

  const handleAutoCaptureToggle = useCallback(() => {
    if (autoCapture.isActive) {
      autoCapture.stopAutoCapture();
    } else {
      autoCapture.startAutoCapture();
    }
  }, [autoCapture]);

  const getCaptureButtonText = useMemo(() => {
    if (settings.autoCapture) {
      if (autoCapture.isActive) {
        return `Auto-Capture (${autoCapture.currentCount}/${settings.captureAmount})`;
      }
      return 'Auto-Capture';
    }
    return 'Capture';
  }, [settings.autoCapture, autoCapture.isActive, autoCapture.currentCount, settings.captureAmount]);

  return (
    <div className="min-h-screen bg-gradient-dark text-foreground">
      {/* Flash overlay */}
      {showFlash && <div className="fixed inset-0 z-50 camera-flash pointer-events-none" />}
      
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <div className="relative">
              <Button 
                variant="outline" 
                onClick={() => setShowUserDropdown(!showUserDropdown)} 
                className="flex items-center gap-2"
                title={settings.tooltips ? `Signed in as ${user?.username}` : undefined}
              >
                <User className="h-4 w-4" />
                {user?.username}
              </Button>
              
              {showUserDropdown && (
                <div className="absolute top-full left-0 mt-2 p-2 bg-card border border-border rounded-lg shadow-modal z-50">
                  <p className="text-sm text-muted-foreground mb-2">
                    {user?.fullName || user?.username}
                  </p>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleSignOut} 
                    className="flex items-center gap-2 w-full justify-start"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={handleSignIn}
              disabled={!isPuterAvailable}
              className="flex items-center gap-2"
              title={settings.tooltips ? (isPuterAvailable ? "Sign in to use AI features" : "AI services unavailable") : undefined}
            >
              <LogIn className="h-4 w-4" />
              Sign In
            </Button>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isPuterAvailable ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-muted-foreground">
              {isPuterAvailable ? 'AI Online' : 'AI Offline'}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSettings(true)}
            className="border border-gray-400 rounded-lg"
            title={settings.tooltips ? "Open settings" : undefined}
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 space-y-6">
        {/* Camera Preview */}
        {(isCameraOn || isCameraLoading) && (
          <CameraPreview
            videoRef={videoRef}
            isMinimized={isMinimized}
            onToggleMinimize={() => setIsMinimized(!isMinimized)}
            onFlipCamera={flipCamera}
            isCameraLoading={isCameraLoading}
            videoLoaded={videoLoaded}
            availableCameras={availableCameras}
            showFlipButton={true}
          />
        )}

        {/* Auto-Capture Progress */}
        {settings.autoCapture && isCameraOn && (
          <AutoCaptureProgress
            progress={autoCapture.progress}
            remainingTime={autoCapture.remainingTime}
            isActive={autoCapture.isActive}
          />
        )}

        {/* Camera Controls */}
        <div className="flex gap-4">
          <Button 
            onClick={isCameraOn ? stopCamera : requestCameraPermission} 
            variant={isCameraOn ? "destructive" : "default"} 
            className="flex-1 h-12"
            disabled={isCameraLoading}
            title={settings.tooltips ? (isCameraOn ? "Turn off camera" : "Turn on camera") : undefined}
          >
            {isCameraLoading ? (
              <>
                <Loader className="h-5 w-5 mr-2 animate-spin" />
                Starting Camera...
              </>
            ) : isCameraOn ? (
              <>
                <CameraOff className="h-5 w-5 mr-2" />
                Camera Off
              </>
            ) : (
              <>
                <Camera className="h-5 w-5 mr-2" />
                Camera On
              </>
            )}
          </Button>
        </div>

        {/* Capture Controls */}
        <div className="grid grid-cols-2 gap-4">
          <Button 
            onClick={settings.autoCapture ? handleAutoCaptureToggle : manualCapture} 
            disabled={!isCameraOn || !videoLoaded || isCameraLoading} 
            className="h-12 capture-button gradient-primary"
            title={settings.tooltips ? (settings.autoCapture 
              ? (autoCapture.isActive ? "Stop auto-capture" : "Start auto-capture")
              : "Take a photo"
            ) : undefined}
          >
            <Circle className="h-5 w-5 mr-2" />
            {getCaptureButtonText}
          </Button>
          
          <Button
            onClick={() => {
              const lastImage = capturedImages[0];
              if (lastImage && !lastImage.description) {
                addToAIQueue(lastImage.dataUrl);
              }
            }}
            disabled={capturedImages.length === 0 || processingAI || settings.autoCapture || !isPuterAvailable}
            variant="outline"
            className="h-12"
            title={settings.tooltips ? "Get AI description of last captured image" : undefined}
          >
            {processingAI ? (
              <>
                <Loader className="h-5 w-5 mr-2 animate-spin" />
                Describing...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5 mr-2" />
                Describe
              </>
            )}
          </Button>
        </div>

        {/* Image Gallery */}
        <OptimizedImageGallery
          images={capturedImages}
          onRemoveImage={removeImage}
          onUpdateDescription={updateImageDescription}
        />

        {/* Export Section */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Export</h3>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              const data = capturedImages.map(img => ({
                id: img.id,
                dataUrl: img.dataUrl,
                description: img.description,
                timestamp: img.timestamp.toISOString()
              }));
              const json = JSON.stringify(data, null, 2);
              const blob = new Blob([json], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'captured_images.json';
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="w-full mt-2"
          >
            Export as JSON
          </Button>
        </Card>

        {/* AI Processing Queue Status */}
        {processingAI && (
          <Card className="p-4 bg-muted/20">
            <div className="flex items-center gap-2">
              <Loader className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">
                Processing images for AI description...
              </span>
            </div>
          </Card>
        )}

        {/* Hidden canvas for capture */}
        <canvas ref={canvasRef} className="hidden" />
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-xs text-muted-foreground border-t border-border">
        <p>
          Created by{' '}
          <a href="https://jayreddin.github.io" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            Jamie Reddin
          </a>{' '}
          using{' '}
          <a href="https://puter.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            Puter.com
          </a>{' '}
          | Version 2.0 | 2025
        </p>
      </footer>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        isAuthenticated={isAuthenticated}
        user={user}
        lastCapture={capturedImages[0] || null}
        aiDescription={capturedImages[0]?.description || ''}
        onSettingsChange={handleSettingsChange}
        isPuterAvailable={isPuterAvailable}
      />
    </div>
  );
};

export default OptimizedCameraAIApp;
