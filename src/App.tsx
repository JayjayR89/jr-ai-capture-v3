import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { SettingsProvider } from '@/contexts/SettingsContext';
import React, { useState, useEffect } from 'react';
import Joyride from 'react-joyride';

const queryClient = new QueryClient();

const App = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);
  useEffect(() => {
    if (!localStorage.getItem('tutorialComplete')) setShowTutorial(true);
  }, []);
  useEffect(() => {
    const handler = () => setShowTutorial(true);
    window.addEventListener('show-tutorial', handler);
    return () => window.removeEventListener('show-tutorial', handler);
  }, []);
  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => setShowInstallBanner(false));
    }
  };
  const tutorialSteps = [
    { target: '.camera-btn', content: 'Start the camera here.' },
    { target: '.capture-btn', content: 'Take a photo.' },
    { target: '.gallery-btn', content: 'View your gallery.' },
    { target: '.settings-btn', content: 'Open settings.' },
    { target: '.overlay-legend', content: 'See what the overlay colors mean.' },
    { target: '.export-btn', content: 'Export your captures.' },
  ];
  const handleJoyrideCallback = (data: any) => {
    if (data.status === 'finished' || data.status === 'skipped') {
      setShowTutorial(false);
      localStorage.setItem('tutorialComplete', 'true');
    }
  };
  return (
    <SettingsProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          <Joyride
            steps={tutorialSteps}
            run={showTutorial}
            continuous
            showSkipButton
            showProgress
            callback={handleJoyrideCallback}
            styles={{ options: { zIndex: 10000 } }}
          />
          {showInstallBanner && (
            <div className="fixed bottom-0 left-0 right-0 bg-blue-600 text-white p-4 flex justify-between items-center z-50" role="dialog" aria-label="Install app banner">
              <span>Install CameraAI for a better experience!</span>
              <button onClick={handleInstallClick} className="bg-white text-blue-600 px-3 py-1 rounded" aria-label="Install app">Install</button>
            </div>
          )}
        </TooltipProvider>
      </QueryClientProvider>
    </SettingsProvider>
  );
};

export default App;
