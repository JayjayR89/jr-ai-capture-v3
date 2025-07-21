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
import ReactConfetti from 'react-confetti';

const queryClient = new QueryClient();

const App = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState<number | undefined>(undefined);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
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
    const handler = (e: any) => {
      if (e.detail && typeof e.detail.step === 'number') {
        setTutorialStep(e.detail.step);
        setShowTutorial(true);
      } else {
        setTutorialStep(undefined);
        setShowTutorial(true);
      }
    };
    window.addEventListener('show-tutorial', handler);
    return () => window.removeEventListener('show-tutorial', handler);
  }, []);
  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => setShowInstallBanner(false));
    }
  };
  const checklistItems = [
    { key: 'firstPhoto', label: 'Take your first photo' },
    { key: 'firstExport', label: 'Export a capture' },
    // ...add more as needed
  ];
  const checklistState = checklistItems.map(item => ({
    ...item,
    done: !!localStorage.getItem(item.key),
  }));
  // Multi-language tutorial content
  const tutorialContent = {
    en: {
      welcome: (
        <div style={{ textAlign: 'center' }}>
          <img src="/icon-192.png" alt="CameraAI Logo" style={{ width: 64, margin: '0 auto 16px' }} />
          <h2>Welcome to CameraAI!</h2>
          <p>Capture, analyze, and export images with AI-powered features. Let’s take a quick tour!</p>
        </div>
      ),
      ready: (
        <div style={{ textAlign: 'center' }}>
          <h2>You’re ready!</h2>
          <p>Enjoy using CameraAI. 🎉</p>
        </div>
      ),
      camera: 'Start the camera here.',
      capture: 'Take a photo.',
      gallery: 'View your gallery.',
      settings: 'Open settings.',
      overlay: 'See what the overlay colors mean.',
      export: 'Export your captures.'
    },
    // Add other languages as needed
  };
  const lang = 'en'; // Replace with settings.language if available
  const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
  const steps = [
    {
      target: 'body',
      placement: 'center',
      content: tutorialContent[lang].welcome,
      disableBeacon: true,
      spotlightClicks: false,
    },
    { target: '.camera-btn', content: tutorialContent[lang].camera },
    { target: '.capture-btn', content: tutorialContent[lang].capture },
    { target: '.gallery-btn', content: tutorialContent[lang].gallery },
    { target: '.settings-btn', content: tutorialContent[lang].settings },
    { target: '.overlay-legend', content: tutorialContent[lang].overlay },
    { target: '.export-btn', content: tutorialContent[lang].export },
    // ...add more or conditionally include mobile/desktop steps
    {
      target: 'body',
      placement: 'center',
      content: tutorialContent[lang].ready,
      disableBeacon: true,
      spotlightClicks: false,
    },
  ];
  const handleJoyrideCallback = (data: any) => {
    if (data.status === 'finished' || data.status === 'skipped') {
      setShowTutorial(false);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 4000);
      setShowChecklist(true);
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
            steps={steps}
            run={showTutorial}
            stepIndex={tutorialStep}
            continuous
            showSkipButton
            showProgress
            callback={handleJoyrideCallback}
            styles={{
              options: {
                zIndex: 10000,
                primaryColor: '#3B82F6',
                textColor: '#222',
                backgroundColor: '#fff',
                arrowColor: '#3B82F6',
              }
            }}
            locale={{
              back: 'Back',
              close: 'Close',
              last: 'Finish',
              next: 'Next',
              skip: 'Skip',
            }}
            disableOverlayClose
            ariaLive="polite"
          />
          {showConfetti && <ReactConfetti />}
          {showChecklist && (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
              <div className="bg-white rounded shadow-lg p-6 w-full max-w-xs">
                <h3 className="text-lg font-bold mb-4">Get Started Checklist</h3>
                <ul>
                  {checklistState.map(item => (
                    <li key={item.key} className="mb-2">
                      <input type="checkbox" checked={item.done} readOnly /> {item.label}
                    </li>
                  ))}
                </ul>
                <button onClick={() => setShowChecklist(false)} className="mt-4 bg-blue-600 text-white px-3 py-1 rounded">Close</button>
              </div>
            </div>
          )}
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
