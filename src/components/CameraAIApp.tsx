
import React, { useState, useRef, useEffect } from 'react';
import { Camera, CameraOff, RotateCcw, Circle, Sparkles, Home, Settings, LogIn, LogOut, User } from 'lucide-react';
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
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);

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
        // Wait for metadata to load before playing
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(console.error);
        };
      }
      
      toast({
        title: "Camera access granted",
        description: "You can now capture images"
      });
    } catch (error) {
      console.error('Camera permission error:', error);
      const shouldExit = window.confirm('Camera permission denied. Would you like to exit the app or reload to try again?\n\nClick OK to exit, Cancel to reload.');
      if (shouldExit) {
        window.close();
      } else {
        window.location.reload();
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraOn(false);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const flipCamera = async () => {
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacingMode);
    if (isCameraOn) {
      stopCamera();
      setTimeout(() => {
        requestCameraPermission();
      }, 100);
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
    
    // Check if video is actually playing
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      toast({
        title: "Video not ready",
        description: "Please wait for camera to fully load",
        variant: "destructive"
      });
      return;
    }

    setIsCapturing(true);
    setShowFlash(true);

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (context) {
      // Set canvas dimensions to match video actual dimensions
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
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
      
      toast({
        title: "Image Captured",
        description: "Screenshot saved successfully"
      });
    } else {
      toast({
        title: "Capture failed",
        description: "Unable to capture image from video",
        variant: "destructive"
      });
    }

    setTimeout(() => {
      setShowFlash(false);
      setIsCapturing(false);
    }, 300);
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
      // Send the image data URL directly to Puter AI
      const response = await puter.ai.chat(
        "Describe what you see in this image in detail. Include any text you can read and objects you can identify.",
        lastCapture.dataUrl
      );
      
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
        description: "Please try again",
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
        {/* Camera Preview - Only show when camera is on */}
        {isCameraOn && (
          <Card className="relative">
            <div className="aspect-video bg-muted/20 rounded-lg overflow-hidden camera-preview">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover" 
              />
              
              {/* Flip Camera Button */}
              {availableCameras.length > 1 && (
                <Button 
                  variant="secondary" 
                  size="icon" 
                  onClick={flipCamera} 
                  className="absolute top-4 right-4 bg-black/50 hover:bg-black/70"
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
          >
            {isCameraOn ? (
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
            disabled={!isCameraOn || isCapturing} 
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
            <Sparkles className="h-5 w-5 mr-2" />
            {isDescribing ? 'Describing...' : 'Describe'}
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
                className="w-20 h-20 object-cover rounded-lg border" 
              />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">
                  {lastCapture.timestamp.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Image captured successfully
                </p>
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
