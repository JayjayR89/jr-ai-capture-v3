
import React, { useState, useRef, useEffect } from 'react';
import { Camera, CameraOff, RotateCcw, Circle, Sparkles, Home, Settings, LogIn, LogOut, User, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { SettingsModal } from './SettingsModal';

// Using Puter.com API loaded from CDN
declare const puter: any;

interface CapturedImage {
  dataUrl: string;
  timestamp: Date;
  description?: string;
}

interface User {
  username: string;
  fullName?: string;
}

const CameraAIApp: React.FC = () => {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  // Camera state
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [videoLoaded, setVideoLoaded] = useState(false);

  // Capture state
  const [lastCapture, setLastCapture] = useState<CapturedImage | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isDescribing, setIsDescribing] = useState(false);
  const [aiDescription, setAiDescription] = useState('');
  const [showFlash, setShowFlash] = useState(false);

  // UI state
  const [showSettings, setShowSettings] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Check for available cameras on mount
  useEffect(() => {
    checkAvailableCameras();
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
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
  };

  const checkAvailableCameras = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter(device => device.kind === 'videoinput');
      setAvailableCameras(cameras);
      console.log('Available cameras:', cameras.length);
    } catch (error) {
      console.error('Error enumerating cameras:', error);
    }
  };

  const handleSignIn = async () => {
    try {
      const result = await puter.auth.signIn();
      setIsAuthenticated(true);
      setUser({
        username: result.username,
        fullName: result.fullName
      });
      toast({
        title: "Signed in successfully",
        description: `Welcome, ${result.username}!`
      });
    } catch (error) {
      console.error('Sign in error:', error);
      toast({
        title: "Sign in failed",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  const handleSignOut = async () => {
    try {
      await puter.auth.signOut();
      setIsAuthenticated(false);
      setUser(null);
      toast({
        title: "Signed out successfully"
      });
    } catch (error) {
      console.error('Sign out error:', error);
      // Still update UI even if API call fails
      setIsAuthenticated(false);
      setUser(null);
    }
  };

  const requestCameraPermission = async () => {
    setIsCameraLoading(true);
    setVideoLoaded(false);
    
    try {
      console.log('Requesting camera permission with facing mode:', facingMode);
      
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
        
        // Set up event listeners for better video handling
        const video = videoRef.current;
        
        const handleLoadedMetadata = () => {
          console.log('Video metadata loaded, dimensions:', video.videoWidth, 'x', video.videoHeight);
          setVideoLoaded(true);
          video.play().catch(error => {
            console.error('Error playing video:', error);
            toast({
              title: "Video playback error",
              description: "Unable to start video preview",
              variant: "destructive"
            });
          });
        };

        const handleLoadedData = () => {
          console.log('Video data loaded, ready state:', video.readyState);
          setIsCameraLoading(false);
        };

        const handleError = (error: Event) => {
          console.error('Video element error:', error);
          setIsCameraLoading(false);
          toast({
            title: "Video error",
            description: "Problem with video stream",
            variant: "destructive"
          });
        };

        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        video.addEventListener('loadeddata', handleLoadedData);
        video.addEventListener('error', handleError);
        
        // Cleanup event listeners
        return () => {
          video.removeEventListener('loadedmetadata', handleLoadedMetadata);
          video.removeEventListener('loadeddata', handleLoadedData);
          video.removeEventListener('error', handleError);
        };
      }
      
      toast({
        title: "Camera access granted",
        description: "You can now capture images"
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
        variant: "destructive"
      });
    }
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
      // Small delay to ensure cleanup
      setTimeout(() => {
        requestCameraPermission();
      }, 500);
    }
  };

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current || !isCameraOn) {
      toast({
        title: "Camera not ready",
        description: "Please ensure camera is on",
        variant: "destructive"
      });
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Simplified validation - just check if video is playing
    if (!videoLoaded || video.videoWidth === 0 || video.videoHeight === 0) {
      console.log('Video not ready - loaded:', videoLoaded, 'dimensions:', video.videoWidth, 'x', video.videoHeight);
      toast({
        title: "Video not ready",
        description: "Please wait for camera to fully load",
        variant: "destructive"
      });
      return;
    }

    setIsCapturing(true);
    setShowFlash(true);

    try {
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Could not get canvas context');
      }

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      console.log('Capturing image with dimensions:', canvas.width, 'x', canvas.height);
      
      // Draw the current video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert to data URL with high quality
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      
      const newCapture: CapturedImage = {
        dataUrl,
        timestamp: new Date()
      };
      
      setLastCapture(newCapture);
      setAiDescription(''); // Clear previous description
      
      console.log('Image captured successfully, size:', dataUrl.length, 'bytes');
      
      toast({
        title: "Image Captured",
        description: "Screenshot saved successfully"
      });
    } catch (error) {
      console.error('Capture error:', error);
      toast({
        title: "Capture failed",
        description: "Unable to capture image from video",
        variant: "destructive"
      });
    } finally {
      setTimeout(() => {
        setShowFlash(false);
        setIsCapturing(false);
      }, 300);
    }
  };

  const describeImage = async () => {
    if (!lastCapture) {
      toast({
        title: "No image to describe",
        description: "Please capture an image first",
        variant: "destructive"
      });
      return;
    }

    if (!isAuthenticated) {
      toast({
        title: "Authentication required",
        description: "Please sign in to use AI description",
        variant: "destructive"
      });
      return;
    }

    setIsDescribing(true);
    setAiDescription('');

    try {
      console.log('Sending image to AI for description, size:', lastCapture.dataUrl.length);
      
      // Send the image data URL directly to Puter AI
      const response = await puter.ai.chat(
        "Describe what you see in this image in detail. Include any text you can read and objects you can identify.",
        lastCapture.dataUrl
      );
      
      console.log('AI description received:', response.substring(0, 100) + '...');
      
      setAiDescription(response);
      setLastCapture(prev => prev ? {
        ...prev,
        description: response
      } : null);
      
      toast({
        title: "Image described successfully",
        description: "AI analysis complete"
      });
    } catch (error) {
      console.error('AI description error:', error);
      toast({
        title: "AI description failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsDescribing(false);
    }
  };

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
            >
              <LogIn className="h-4 w-4" />
              Sign In
            </Button>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setShowSettings(true)} 
            className="border border-gray-400 rounded-lg"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 space-y-6">
        {/* Camera Preview - Show loading state or camera view */}
        {(isCameraOn || isCameraLoading) && (
          <Card className="relative">
            <div className="aspect-video bg-muted/20 rounded-lg overflow-hidden camera-preview">
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
                className={`w-full h-full object-cover transition-opacity duration-300 ${
                  videoLoaded ? 'opacity-100' : 'opacity-0'
                }`}
              />
              
              {/* Flip Camera Button */}
              {availableCameras.length > 1 && videoLoaded && (
                <Button 
                  variant="secondary" 
                  size="icon" 
                  onClick={flipCamera} 
                  className="absolute top-4 right-4 bg-black/50 hover:bg-black/70"
                  disabled={isCameraLoading}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* Camera Controls */}
        <div className="flex gap-4">
          <Button 
            onClick={isCameraOn ? stopCamera : requestCameraPermission} 
            variant={isCameraOn ? "destructive" : "default"} 
            className="flex-1 h-12"
            disabled={isCameraLoading}
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
            onClick={captureImage} 
            disabled={!isCameraOn || isCapturing || !videoLoaded || isCameraLoading} 
            className="h-12 capture-button gradient-primary"
          >
            <Circle className="h-5 w-5 mr-2" />
            {isCapturing ? 'Capturing...' : 'Capture'}
          </Button>
          
          <Button 
            onClick={describeImage} 
            disabled={!lastCapture || isDescribing} 
            variant="outline" 
            className="h-12"
          >
            {isDescribing ? (
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

        {/* Last Capture Thumbnail */}
        {lastCapture && (
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
              </div>
            </div>
          </Card>
        )}

        {/* AI Description */}
        {aiDescription && (
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
          | Version 1.0 | 2025
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
      />
    </div>
  );
};

export default CameraAIApp;
