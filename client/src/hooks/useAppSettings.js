import { useState, useEffect } from 'react';

const SETTINGS_KEY = 'videofetch_settings';

export const DEFAULT_SETTINGS = {
  // Category 1: Media Defaults
  defaultResolution: 'best', // 'best' | '1080p' | '720p' | '480p'
  defaultAudioBitrate: '320k', // '320k' | '256k' | '192k' | '128k' | '96k'
  
  // Category 2: Acceleration & Performance
  multiThreadAccel: true,
  maxConcurrentDownloads: 3,

  // Category 5: Theme & Appearance
  accentColor: 'lime', // 'lime' | 'cyan' | 'purple' | 'orange'
  autoClipboard: true,
};

export function useAppSettings() {
  const [settings, setSettings] = useState(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {}
    
    // Dynamically apply theme attribute to root document element
    const theme = settings.accentColor || 'lime';
    document.documentElement.setAttribute('data-theme', theme);
  }, [settings]);

  const updateSetting = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem(SETTINGS_KEY);
    document.documentElement.setAttribute('data-theme', 'lime');
  };

  return { settings, updateSetting, resetSettings };
}
