import { useState, useEffect, useCallback } from 'react';
import { AppSettings } from '../types';
import { settingsRepository } from '../services/db/repositories/settingsRepository';

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>({
    id: 'default',
    locationSearchRadiusMeters: 1000,
    locationVerificationThresholdMeters: 100,
    demoModeEnabled: true,
    appVersion: '1.0.0-prototype',
    selectedDemoLocationKey: 'abc_model',
  });
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    try {
      const data = await settingsRepository.getSettings();
      setSettings(data);
    } catch (err) {
      console.error('Failed to load app settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const updateSettings = async (updates: Partial<Omit<AppSettings, 'id'>>) => {
    const updated = await settingsRepository.updateSettings(updates);
    setSettings(updated);
    return updated;
  };

  const resetDefaults = async () => {
    const defaulted = await settingsRepository.resetDefaults();
    setSettings(defaulted);
    return defaulted;
  };

  return {
    settings,
    loading,
    updateSettings,
    resetDefaults,
    refreshSettings: loadSettings,
  };
}
