import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Settings {
  language: string;
  customAIEndpoint: string;
  customAIApiKey: string;
  voiceCommandsEnabled: boolean;
  aiOverlayEnabled: boolean;
  faceOverlayEnabled: boolean;
  detectionIntervalMs: number;
  detectionConfidence: number;
}

const defaultSettings: Settings = {
  language: 'en',
  customAIEndpoint: '',
  customAIApiKey: '',
  voiceCommandsEnabled: false,
  aiOverlayEnabled: false,
  faceOverlayEnabled: false,
  detectionIntervalMs: 200,
  detectionConfidence: 0.5,
};

const SettingsContext = createContext<{
  settings: Settings;
  setSettings: (s: Settings) => void;
  updateSettings: (s: Partial<Settings>) => void;
} | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const updateSettings = (s: Partial<Settings>) => setSettings(prev => ({ ...prev, ...s }));
  return (
    <SettingsContext.Provider value={{ settings, setSettings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
};