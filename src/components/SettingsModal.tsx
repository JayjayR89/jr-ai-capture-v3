import React, { useState, useEffect } from 'react';
import { X, User, Settings, Image, Info, CheckCircle, AlertCircle, Download, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';

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

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
  user: User | null;
  lastCapture: CapturedImage | null;
  aiDescription: string;
  onSettingsChange: (newSettings: Settings) => void;
  isPuterAvailable: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  isAuthenticated,
  user,
  lastCapture,
  aiDescription,
  onSettingsChange,
  isPuterAvailable
}) => {
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

  useEffect(() => {
    const saved = localStorage.getItem('aiCameraSettings');
    if (saved) {
      setSettings(JSON.parse(saved));
    }
  }, []);

  const handleSettingChange = (key: keyof Settings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    onSettingsChange(newSettings);
  };

  const handleExport = () => {
    const data = {
      settings,
      lastCapture: lastCapture ? {
        ...lastCapture,
        timestamp: lastCapture.timestamp.toISOString()
      } : null,
      aiDescription,
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `camera-ai-settings-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Settings exported",
      description: "Your settings have been saved to a file",
      duration: 3000
    });
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.settings) {
          setSettings(data.settings);
          onSettingsChange(data.settings);
          toast({
            title: "Settings imported",
            description: "Your settings have been loaded from file",
            duration: 3000
          });
        }
      } catch (error) {
        toast({
          title: "Import failed",
          description: "Could not load settings file",
          variant: "destructive",
          duration: 3000
        });
      }
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    const defaultSettings: Settings = {
      theme: 'dark',
      streaming: true,
      autoCapture: false,
      captureTime: 5,
      captureAmount: 5,
      captureQuality: 'high',
      completeAlert: true,
      tooltips: true
    };
    setSettings(defaultSettings);
    onSettingsChange(defaultSettings);
    toast({
      title: "Settings reset",
      description: "All settings have been restored to defaults",
      duration: 3000
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Settings className="h-6 w-6" />
              Settings
            </h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-6">
            {/* Theme Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Appearance</h3>
              <div className="space-y-2">
                <Label>Theme</Label>
                <RadioGroup
                  value={settings.theme}
                  onValueChange={(value) => handleSettingChange('theme', value)}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="light" id="light" />
                    <Label htmlFor="light">Light</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="dark" id="dark" />
                    <Label htmlFor="dark">Dark</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            {/* Camera Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Camera</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="streaming">Enable streaming</Label>
                  <Switch
                    id="streaming"
                    checked={settings.streaming}
                    onCheckedChange={(checked) => handleSettingChange('streaming', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="tooltips">Show tooltips</Label>
                  <Switch
                    id="tooltips"
                    checked={settings.tooltips}
                    onCheckedChange={(checked) => handleSettingChange('tooltips', checked)}
                  />
                </div>
              </div>
            </div>

            {/* Auto-Capture Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Auto-Capture</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="autoCapture">Enable auto-capture</Label>
                  <Switch
                    id="autoCapture"
                    checked={settings.autoCapture}
                    onCheckedChange={(checked) => handleSettingChange('autoCapture', checked)}
                  />
                </div>
                
                {settings.autoCapture && (
                  <>
                    <div className="space-y-2">
                      <Label>Capture interval (seconds)</Label>
                      <Slider
                        value={[settings.captureTime]}
                        onValueChange={([value]) => handleSettingChange('captureTime', value)}
                        min={1}
                        max={30}
                        step={1}
                      />
                      <div className="text-sm text-muted-foreground">{settings.captureTime}s</div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Number of captures</Label>
                      <Slider
                        value={[settings.captureAmount]}
                        onValueChange={([value]) => handleSettingChange('captureAmount', value)}
                        min={1}
                        max={20}
                        step={1}
                      />
                      <div className="text-sm text-muted-foreground">{settings.captureAmount} images</div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="completeAlert">Alert when complete</Label>
                      <Switch
                        id="completeAlert"
                        checked={settings.completeAlert}
                        onCheckedChange={(checked) => handleSettingChange('completeAlert', checked)}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Quality Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Image Quality</h3>
              <div className="space-y-2">
                <Label>Capture quality</Label>
                <Select
                  value={settings.captureQuality}
                  onValueChange={(value) => handleSettingChange('captureQuality', value as 'high' | 'medium' | 'low')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High (larger files)</SelectItem>
                    <SelectItem value="medium">Medium (balanced)</SelectItem>
                    <SelectItem value="low">Low (smaller files)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* AI Features */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">AI Features</h3>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  AI features require authentication with Puter.com
                </p>
                {!isPuterAvailable && (
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">AI service unavailable</span>
                  </div>
                )}
                {isAuthenticated && isPuterAvailable ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm">Signed in as {user?.username}</span>
                  </div>
                ) : isPuterAvailable ? (
                  <div className="flex items-center gap-2 text-yellow-600">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">Not signed in</span>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Export/Import Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Data Management</h3>
              <div className="flex gap-2">
                <Button onClick={handleExport} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export Settings
                </Button>
                <Button variant="outline" asChild>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImport}
                      className="hidden"
                    />
                    <Download className="h-4 w-4 mr-2 rotate-180" />
                    Import Settings
                  </label>
                </Button>
                <Button onClick={handleReset} variant="outline" className="text-red-600">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              </div>
            </div>

            {/* Current Session Info */}
            {lastCapture && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Current Session</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Image className="h-4 w-4" />
                    <span className="text-sm">Last capture: {lastCapture.timestamp.toLocaleString()}</span>
                  </div>
                  {aiDescription && (
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      <span className="text-sm">AI description available</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};
