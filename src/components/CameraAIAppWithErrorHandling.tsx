import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, CameraOff, Circle, Sparkles, Home, Settings, LogIn, LogOut, User, Loader, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { SettingsModal } from './SettingsModal';
import { CameraPreview } from './CameraPreview';
import { AutoCaptureProgress } from './AutoCaptureProgress';
import { ImageGallery } from './ImageGallery';
import { useAutoCapture } from '@/hooks/useAutoCapture';
import { ErrorBoundary } from './ErrorBoundary';

// Enhanced Puter.com API with error handling
declare global {
  interface Window {
    puter?: {
      ai?: {
        chat: (prompt: string, image?: string) => Promise<string>;
      };
      auth?: {
        isSignedIn: () => Promise<boolean>;
        getUser: () => Promise<{ username: string; fullName?: string }>;
        signIn: () => Promise<{ username: string; fullName?: string }>;
        signOut: () => Promise<void>;
      };
    };
    scriptLoadState?: {
      puterLoaded: boolean;
      puterError: Error | null;
    };
  }
}

// Global puter declaration with fallback
declare const puter: typeof window.puter;

interface CapturedImage {
  dataUrl: string;
  timestamp: Date;
  description?: string;
}

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

interface VideoErrorEvent extends Event {
  target: HTMLVideoElement;
}

type ToastVariant = 'default' | 'destructive';

const CameraAIApp: React.FC = () => {
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
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Capture state
  const [lastCapture, setLastCapture] = useState<CapturedImage | null>(null);
  const [capturedImages, setCapturedImages] = useState<CapturedImage[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isDescribing, setIsDescribing] = useState(false);
  const [aiDescription, setAiDescription] = useState('');
  const [showFlash, setShowFlash] = useState(false);
  const [aiQueue, setAiQueue] = useState<CapturedImage[]>([]);
  const [processingAI, setProcessingAI] = useState(false);

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

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isMountedRef = useRef(true);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  // Check Puter availability
  useEffect(() => {
    const checkPuterAvailability = () => {
      const isAvailable = !!(window.puter && window.puter.ai && window.puter.auth);
      setIsPuterAvailable(isAvailable);
      
      if (!isAvailable) {
        console.warn('Puter.com services not available. AI features will be disabled.');
      }
    };

    // Check immediately
    checkPuterAvailability();

    // Listen for script load events
    const handlePuterLoaded = () => {
      checkPuterAvailability();
    };

    const handlePuterError = (event: CustomEvent) => {
      console.error('Puter script error:', event.detail);
      setIsPuterAvailable(false);
    };

    window.addEventListener('puterScriptLoaded', handlePuterLoaded);
    window.addEventListener('puterScriptError', handlePuterError);

    return () => {
      window.removeEventListener('puterScriptLoaded', handlePuterLoaded);
      window.removeEventListener('puterScriptError', handlePuterError);
    };
  }, []);

  // Define captureImage function before using it in useAutoCapture
  const captureImage = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isCameraOn) {
      toast({
        title: "Camera not ready",
        description: "Please ensure camera is on and working properly",
        variant: "destructive",
        duration: 4000
      });
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!videoLoaded || video.videoWidth === 0 || video.videoHeight === 0) {
      console.log('Video not ready - loaded:', videoLoaded, 'dimensions:', video.videoWidth, 'x', video.videoHeight);
      toast({
        title: "Video not ready",
        description: "Please wait for camera to fully load. This may take a few seconds.",
        variant: "destructive",
        duration: 4000
      });
      return;
    }

    setIsCapturing(true);
    setShowFlash(true);

    try {
      const context = canvasRef.current?.getContext('2d');
      if (!context) {
        throw new Error('Could not get canvas context for image capture');
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      console.log('Capturing image with dimensions:', canvas.width, 'x', canvas.height);
      
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const quality = settings.captureQuality === 'high' ? 0.9 : 
                     settings.captureQuality === 'medium' ? 0.7 : 0.5;
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      
      const newCapture: CapturedImage = {
        dataUrl,
        timestamp: new Date(),
        description: undefined,
      };
      
      setLastCapture(newCapture);
      setCapturedImages(prev => [newCapture, ...prev]);
      setAiDescription('');
      
      // Only add to AI processing queue if auto-capture is enabled and authenticated and Puter is available
      if (settings.autoCapture && isAuthenticated && isPuterAvailable) {
        setAiQueue(prev => [newCapture, ...prev]);
      }
      
      console.log('Image captured successfully, size:', Math.round(dataUrl.length / 1024), 'KB');
      
      toast({
        title: "Image Captured",
        description: `Screenshot saved successfully (${Math.round(dataUrl.length / 1024)}KB)`,
        duration: 3000
      });
    } catch (error) {
      console.error('Capture error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Capture failed",
        description: `Unable to capture image: ${errorMessage}`,
        variant: "destructive",
        duration: 5000
      });
    } finally {
      const timeout = setTimeout(() => {
        if (isMountedRef.current) {
          setShowFlash(false);
          setIsCapturing(false);
        }
      }, 300);
      timeoutsRef.current.push(timeout);
    }
  }, [isCameraOn, videoLoaded, isCapturing, settings.captureQuality, isAuthenticated, isPuterAvailable, setLastCapture, setCapturedImages, setAiDescription, setAiQueue, setShowFlash, toast]);

  // Auto-capture hook
  const autoCapture = useAutoCapture(
    {
      enabled: settings.autoCapture,
      captureTime: settings.captureTime,
      captureAmount: settings.captureAmount,
      captureQuality: settings.captureQuality
    },
    captureImage,
    isCameraOn && videoLoaded && !isCapturing
  );

  // Apply theme function
  const applyTheme = useCallback((theme: 'light' | 'dark') => {
    const htmlElement = document.documentElement;
    
    // Remove existing theme classes
    htmlElement.classList.remove('light', 'dark');
    
    // Add new theme class
    htmlElement.classList.add(theme);
    
    console.log('Theme applied:', theme);
  }, []);

  // Load settings on mount
  const loadSettings = useCallback(() => {
    try {
      const saved = localStorage.getItem('aiCameraSettings');
      if (saved) {
        const savedSettings: Settings = JSON.parse(saved);
        setSettings(savedSettings);
        applyTheme(savedSettings.theme);
      } else {
        // Apply default theme on first load
        applyTheme(settings.theme);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: "Settings Error",
        description: "Could not load saved settings. Using defaults.",
        variant: "destructive",
        duration: 3000
      });
      applyTheme(settings.theme);
    }
  }, [settings.theme, applyTheme, toast]);

  const handleSettingsChange = (newSettings: Settings) => {
    setSettings(newSettings);
    applyTheme(newSettings.theme);
    
    // Save settings to localStorage
    try {
      localStorage.setItem('aiCameraSettings', JSON.stringify(newSettings));
      toast({
        title: "Settings saved",
        description: "Your preferences have been updated",
        duration: 2000
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Settings Error",
        description: "Could not save settings. Changes may not persist.",
        variant: "destructive",
        duration: 3000
      });
    }
  };

  const processNextAIRequest = useCallback(async () => {
    if (aiQueue.length === 0 || processingAI) return;
    
    setProcessingAI(true);
    const imageToProcess = aiQueue[0];
    
    try {
      // Check if Puter is available
      if (!isPuterAvailable || !window.puter?.ai?.chat) {
        throw new Error('AI services are not available. Please check your internet connection and refresh the page.');
      }
      
      console.log('Sending image to AI for description, size:', Math.round(imageToProcess.dataUrl.length / 1024), 'KB');
      
      // Enhanced prompt for better descriptions
      const enhancedPrompt = `Analyze this image in detail. Please provide a comprehensive description that includes:
      
      1. Overall scene description
      2. Time of day (if determinable from lighting/context)
      3. Objects, people, animals, or items visible
      4. Colors, textures, and composition
      5. Any readable text or signs
      6. If people are visible, describe general appearance (clothing, activities, etc.)
      7. Setting/environment details
      8. Any notable features or points of interest
      
      Format the response with clear paragraphs and proper structure for readability.`;
      
      const response = await window.puter.ai.chat(enhancedPrompt, imageToProcess.dataUrl);
      
      if (!isMountedRef.current) return;
      
      // Handle the response as a string
      const description = typeof response === 'string' ? response : String(response);
      
      console.log('AI description received:', description.substring(0, 100) + '...');
      
      // Update the image with description
      setCapturedImages(prev =>
        prev.map(img =>
          img.timestamp.getTime() === imageToProcess.timestamp.getTime()
            ? { ...img, description }
            : img
        )
      );
      
      if (lastCapture && lastCapture.timestamp.getTime() === imageToProcess.timestamp.getTime()) {
        setLastCapture(prev => prev ? { ...prev, description } : null);
        setAiDescription(description);
      }
      
      toast({
        title: "Image described successfully",
        description: "AI analysis complete",
        duration: 3000
      });
    } catch (error) {
      if (!isMountedRef.current) return;
      
      console.error('AI description error:', error);
      
      let errorMessage = "Unable to analyze image";
      let errorDescription = "Please try again";
      
      if (error instanceof Error) {
        if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = "Network connection issue";
          errorDescription = "Please check your internet connection and try again.";
        } else if (error.message.includes('rate limit') || error.message.includes('quota')) {
          errorMessage = "Service temporarily unavailable";
          errorDescription = "AI service is busy. Please wait a moment and try again.";
        } else if (error.message.includes('AI services are not available')) {
          errorMessage = "AI services unavailable";
          errorDescription = "External AI service failed to load. Camera features still work without AI.";
        } else {
          errorMessage = "AI analysis failed";
          errorDescription = error.message || "Please try capturing a clearer image or try again later.";
        }
      }
      
      toast({
        title: errorMessage,
        description: errorDescription,
        variant: "destructive",
        duration: 5000
      });
    } finally {
      if (isMountedRef.current) {
        // Remove processed image from queue
        setAiQueue(prev => prev.slice(1));
        setProcessingAI(false);
      }
    }
  }, [aiQueue, processingAI, setCapturedImages, lastCapture, setLastCapture, setAiDescription, isPuterAvailable, toast]);

  const checkAuthStatus = useCallback(async () => {
    try {
      if (!isPuterAvailable || !window.puter?.auth) {
        console.log('Puter auth not available');
        return;
      }
      
      const isSignedIn = await window.puter.auth.isSignedIn();
      if (isSignedIn) {
        const userInfo = await window.puter.auth.getUser();
        setIsAuthenticated(true);
        setUser({
          username: userInfo.username,
          fullName: userInfo.fullName
        });
      }
    } catch (error) {
      console.log('Not signed in or error checking auth status:', error);
      toast({
        title: "Authentication Error",
        description: "Could not check sign-in status. AI features may be limited.",
        variant: "destructive",
        duration: 3000
      });
    }
  }, [isPuterAvailable, setIsAuthenticated, setUser, toast]);

  const checkAvailableCameras = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter(device => device.kind === 'videoinput');
      if (isMountedRef.current) {
        setAvailableCameras(cameras);
        console.log('Available cameras:', cameras.length);
        
        if (cameras.length === 0) {
          setCameraError("No cameras found. Please connect a camera to use this feature.");
        } else {
          setCameraError(null);
        }
      }
    } catch (error) {
      if (isMountedRef.current) {
        console.error('Error enumerating cameras:', error);
        setCameraError("Could not access camera devices. Please check permissions.");
      }
    }
  }, [setAvailableCameras, setCameraError]);

  const handleSignIn = async () => {
    try {
      if (!isPuterAvailable || !window.puter?.auth) {
        toast({
          title: "Service Unavailable",
          description: "Authentication service is not available. Please refresh the page.",
          variant: "destructive",
          duration: 4000
        });
        return;
      }
      
      const result = await window.puter.auth.signIn();
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
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
        duration: 4000
      });
    }
  };

  const handleSignOut = async () => {
    try {
      if (isPuterAvailable && window.puter?.auth) {
        await window.puter.auth.signOut();
      }
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
      toast({
        title: "Sign out error",
        description: "You have been signed out, but there was an issue.",
        variant: "destructive",
        duration: 3000
      });
    }
  };

  const requestCameraPermission = async () => {
    setIsCameraLoading(true);
    setVideoLoaded(false);
    setCameraError(null);
    
    try {
      console.log('Requesting camera permission with facing mode:', facingMode);
      
      // Check if camera access is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported in this browser');
      }
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });
      
      console.log('Camera stream obtained:', mediaStream.getTracks());
      
      setStream(mediaStream);
      setIsCameraOn(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        
        const video = videoRef.current;
        
        const handleLoadedMetadata = () => {
          console.log('Video metadata loaded, dimensions:', video.videoWidth, 'x', video.videoHeight);
          setVideoLoaded(true);
          video.play().catch(error => {
            console.error('Error playing video:', error);
            toast({
              title: "Video playback error",
              description: "Unable to start video preview. Try refreshing the page.",
              variant: "destructive",
              duration: 4000
            });
          });
        };

        const handleLoadedData = () => {
          console.log('Video data loaded, ready state:', video.readyState);
          setIsCameraLoading(false);
        };

        const handleError = (error: VideoErrorEvent) => {
          console.error('Video element error:', error);
          setIsCameraLoading(false);
          setCameraError("Problem with video stream. Please check camera permissions.");
          toast({
            title: "Video error",
            description: "There was an issue with the video stream",
            variant: "destructive",
            duration: 4000
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
      
      if (isMountedRef.current) {
        toast({
          title: "Camera access granted",
          description: "You can now capture images",
          duration: 3000
        });
      }
    } catch (error) {
      if (isMountedRef.current) {
        console.error('Camera permission error:', error);
        setIsCameraLoading(false);
        setIsCameraOn(false);
        setCameraError(getCameraErrorMessage(error));
        
        toast({
          title: "Camera Error",
          description: getCameraErrorMessage(error),
          variant: "destructive",
          duration: 5000
        });
      }
    }
  };

  const getCameraErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
      switch (error.name) {
        case 'NotAllowedError':
          return "Camera permission denied. Please allow camera access in your browser settings and try again.";
        case 'NotFoundError':
          return "No camera found. Please connect a camera and refresh the page.";
        case 'NotReadableError':
          return "Camera is being used by another application. Please close other apps and try again.";
        case 'OverconstrainedError':
          return "Camera settings not supported. Try using a different camera or refresh the page.";
        case 'SecurityError':
          return "Camera access blocked by security settings. Please use HTTPS and try again.";
        default:
          return `Camera error: ${error.message}`;
      }
    }
    return "Unknown camera error occurred";
  };

  const stopCamera = () => {
    console.log('Stopping camera');
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
        console.log('Stopped track:', track.kind);
      });
      setStream(null);
    }
    setIsCameraOn(false);
    setIsCameraLoading(false);
    setVideoLoaded(false);
    setIsMinimized(false);
    setCameraError(null);
    autoCapture.stopAutoCapture();
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const flipCamera = async () => {
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    console.log('Flipping camera from', facingMode, 'to', newFacingMode);
    setFacingMode(newFacingMode);
    if (isCameraOn) {
      stopCamera();
      setTimeout(() => {
        requestCameraPermission();
      }, 500);
    }
  };

  const describeImage = async () => {
    if (!lastCapture) {
      toast({
        title: "No image to describe",
        description: "Please capture an image first",
        variant: "destructive",
        duration: 3000
      });
      return;
    }

    if (!isAuthenticated) {
      toast({
        title: "Authentication required",
        description: "Please sign in to use AI description features",
        variant: "destructive",
        duration: 3000
      });
      return;
    }

    if (!isPuterAvailable) {
      toast({
        title: "AI Service Unavailable",
        description: "AI description service is not available. Please refresh the page.",
        variant: "destructive",
        duration: 4000
      });
      return;
    }

    // Add to queue for processing (for manual mode)
    if (!aiQueue.find(img => img.timestamp.getTime() === lastCapture?.timestamp.getTime())) {
      setAiQueue(prev => [lastCapture, ...prev]);
    }
  };

  const handleAutoCaptureToggle = () => {
    if (autoCapture.isActive) {
      autoCapture.stopAutoCapture();
    } else {
      autoCapture.startAutoCapture();
    }
  };

  const getCaptureButtonText = () => {
    if (settings.autoCapture) {
      if (autoCapture.isActive) {
        return `Auto-Capture (${autoCapture.currentCount}/${settings.captureAmount})`;
      }
      return 'Auto-Capture';
    }
    return isCapturing ? 'Capturing...' : 'Capture';
  };

  useEffect(() => {
    return () => {
      // Cleanup media streams to prevent memory leaks
      if (stream) {
        stream.getTracks().forEach(track => {
          track.stop();
          console.log('Cleanup: Stopped track:', track.kind);
        });
      }
      
      // Cleanup timeouts
      isMountedRef.current = false;
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
    };
  }, [stream]);

  // Check auth status and camera availability on mount
  useEffect(() => {
    loadSettings();
    checkAuthStatus();
    checkAvailableCameras();
  }, [loadSettings, checkAuthStatus, checkAvailableCameras]);

  // Process AI queue
  useEffect(() => {
    processNextAIRequest();
  }, [aiQueue, processNextAIRequest]);

  return (
    <ErrorBoundary fallback={
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
        <Card className="p-6 max-w-md">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Application Error</h2>
            <p className="text-muted-foreground mb-4">
              Something went wrong. Please refresh the page to continue.
            </p>
            <Button onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
          </div>
        </Card>
      </div>
    }>
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
                className="flex items-center gap-2"
                title={settings.tooltips ? "Sign in to use AI features" : undefined}
                disabled={!isPuterAvailable}
              >
                <LogIn className="h-4 w-4" />
                {isPuterAvailable ? "Sign In" : "AI Unavailable"}
              </Button>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {!isPuterAvailable && (
              <div className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded">
                AI Offline
              </div>
            )}
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
          {/* Camera Error Display */}
          {cameraError && (
            <Card className="p-4 bg-red-50 border-red-200">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                <div>
                  <h3 className="font-medium text-red-800">Camera Issue</h3>
                  <p className="text-sm text-red-600 mt-1">{cameraError}</p>
                </div>
              </div>
            </Card>
          )}

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
              onClick={settings.autoCapture ? handleAutoCaptureToggle : captureImage} 
              disabled={!isCameraOn || isCapturing || !videoLoaded || isCameraLoading} 
              className="h-12 capture-button gradient-primary"
              title={settings.tooltips ? (settings.autoCapture 
                ? (autoCapture.isActive ? "Stop auto-capture" : "Start auto-capture")
                : "Take a photo"
              ) : undefined}
            >
              <Circle className="h-5 w-5 mr-2" />
              {getCaptureButtonText()}
            </Button>
            
            <Button 
              onClick={describeImage} 
              disabled={!lastCapture || processingAI || settings.autoCapture || !isPuterAvailable} 
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
          {capturedImages.length > 0 && (
            <ImageGallery images={capturedImages} />
          )}

          {/* Last Capture Thumbnail (for single capture mode) */}
          {lastCapture && !settings.autoCapture && (
            <Card className="p-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Last Capture
              </h3>
              <div className="flex gap-4">
                <img 
                  src={lastCapture.dataUrl} 
                  alt="Last capture" 
                  className="w-20 h-20 object-cover rounded-lg border shadow-sm" 
                />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">
                    {lastCapture.timestamp.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Image captured successfully
                  </p>
                  {lastCapture.description && (
                    <p className="text-xs text-green-600 mt-1">
                      ✓ AI description available
                    </p>
                  )}
                  {aiQueue.find(img => img.timestamp.getTime() === lastCapture?.timestamp.getTime()) && (
                    <p className="text-xs text-yellow-600 mt-1">
                      ⏳ Queued for AI description
                    </p>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* AI Description (for single capture mode) */}
          {aiDescription && !settings.autoCapture && (
            <Card className="ai-response-box">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                AI Description
              </h3>
              <div className="prose prose-invert max-w-none">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {aiDescription}
                </p>
              </div>
            </Card>
          )}

          {/* AI Processing Queue Status */}
          {aiQueue.length > 0 && (
            <Card className="p-4 bg-muted/20">
              <div className="flex items-center gap-2">
                <Loader className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">
                  Processing {aiQueue.length} image{aiQueue.length > 1 ? 's' : ''} for AI description...
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
            | Version 1.1 | 2025
          </p>
        </footer>

        {/* Settings Modal */}
        <SettingsModal 
          isOpen={showSettings} 
          onClose={() => setShowSettings(false)} 
          isAuthenticated={isAuthenticated} 
          user={user} 
          lastCapture={lastCapture} 
          aiDescription={aiDescription}
          onSettingsChange={handleSettingsChange}
          isPuterAvailable={isPuterAvailable}
        />
      </div>
    </ErrorBoundary>
  );
};

export default CameraAIApp;
