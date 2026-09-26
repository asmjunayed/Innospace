import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { GpsLocationResult, DemoGpsPreset, Institute } from '../types';
import { geolocationService, DEMO_LOCATIONS, GeolocationErrorDetails } from '../services/geolocationService';
import { settingsRepository } from '../services/db/repositories/settingsRepository';

export interface GpsContextType {
  location: GpsLocationResult;
  isDemoMode: boolean;
  selectedDemoKey: string;
  demoPresets: DemoGpsPreset[];
  toggleDemoMode: (enabled?: boolean) => Promise<void>;
  selectDemoLocation: (key: string) => Promise<void>;
  setCustomCoordinates: (lat: number, lng: number, name?: string) => void;
  refreshRealGps: () => Promise<void>;
  calculateDistanceMeters: (lat: number, lng: number) => number;
  findNearestInstitute: () => Promise<{ institute: Institute; distanceMeters: number } | null>;
  isLocating: boolean;
  gpsError: string | null;
  gpsErrorCode: GeolocationErrorDetails['code'] | null;
  isPoorAccuracy: boolean;
}

const GpsContext = createContext<GpsContextType | undefined>(undefined);

export const GpsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);
  const [selectedDemoKey, setSelectedDemoKey] = useState<string>('abc_model');
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsErrorCode, setGpsErrorCode] = useState<GeolocationErrorDetails['code'] | null>(null);

  const [location, setLocation] = useState<GpsLocationResult>(() => 
    geolocationService.getDemoLocation('abc_model')
  );

  // Initialize from persisted AppSettings
  useEffect(() => {
    async function initSettings() {
      try {
        const settings = await settingsRepository.getSettings();
        setIsDemoMode(settings.demoModeEnabled);
        const key = settings.selectedDemoLocationKey || 'abc_model';
        setSelectedDemoKey(key);
        if (settings.demoModeEnabled) {
          setLocation(geolocationService.getDemoLocation(key));
        } else {
          refreshRealGps();
        }
      } catch (err) {
        console.error('Failed to init GPS settings:', err);
      }
    }
    initSettings();
  }, []);

  const refreshRealGps = useCallback(async (): Promise<void> => {
    setIsLocating(true);
    setGpsError(null);
    setGpsErrorCode(null);
    try {
      const realLoc = await geolocationService.getRealLocation();
      setLocation(realLoc);
      setIsLocating(false);
      setIsDemoMode(false);
    } catch (err: any) {
      console.warn('Real GPS failed:', err);
      const code = err.code || 'UNKNOWN';
      const message = err.message || 'Unable to retrieve physical GPS coordinates.';
      setGpsError(message);
      setGpsErrorCode(code);
      setIsLocating(false);
      // Fallback to active demo location so app remains functional
      setLocation(geolocationService.getDemoLocation(selectedDemoKey));
    }
  }, [selectedDemoKey]);

  const selectDemoLocation = async (key: string): Promise<void> => {
    setSelectedDemoKey(key);
    const demoLoc = geolocationService.getDemoLocation(key);
    setLocation(demoLoc);
    setGpsError(null);
    setGpsErrorCode(null);
    await settingsRepository.updateSettings({
      selectedDemoLocationKey: key,
      demoModeEnabled: true,
    });
    setIsDemoMode(true);
  };

  const setCustomCoordinates = (lat: number, lng: number, name?: string) => {
    setLocation({
      latitude: lat,
      longitude: lng,
      accuracy: 10,
      isDemo: true,
      locationName: name || 'Custom Coordinates',
      source: 'demo',
      timestamp: new Date().toISOString(),
    });
  };

  const toggleDemoMode = async (enabled?: boolean): Promise<void> => {
    const nextVal = enabled !== undefined ? enabled : !isDemoMode;
    setIsDemoMode(nextVal);
    await settingsRepository.updateSettings({ demoModeEnabled: nextVal });

    if (nextVal) {
      setGpsError(null);
      setGpsErrorCode(null);
      selectDemoLocation(selectedDemoKey);
    } else {
      await refreshRealGps();
    }
  };

  const calculateDistanceMeters = (targetLat: number, targetLng: number): number => {
    return geolocationService.calculateDistance(
      location.latitude,
      location.longitude,
      targetLat,
      targetLng
    );
  };

  const findNearestInstitute = async () => {
    return geolocationService.findNearestInstitute(location.latitude, location.longitude);
  };

  const isPoorAccuracy = location.accuracy > 50;
  const demoPresets = Object.values(DEMO_LOCATIONS);

  return (
    <GpsContext.Provider
      value={{
        location,
        isDemoMode,
        selectedDemoKey,
        demoPresets,
        toggleDemoMode,
        selectDemoLocation,
        setCustomCoordinates,
        refreshRealGps,
        calculateDistanceMeters,
        findNearestInstitute,
        isLocating,
        gpsError,
        gpsErrorCode,
        isPoorAccuracy,
      }}
    >
      {children}
    </GpsContext.Provider>
  );
};

export const useGps = (): GpsContextType => {
  const context = useContext(GpsContext);
  if (!context) {
    throw new Error('useGps must be used within a GpsProvider');
  }
  return context;
};
