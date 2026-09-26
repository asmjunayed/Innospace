import { Institute, GpsLocationResult, DemoGpsPreset } from '../types';
import { instituteRepository } from './db/repositories/instituteRepository';
import { settingsRepository } from './db/repositories/settingsRepository';

export const DEMO_LOCATIONS: Record<string, DemoGpsPreset> = {
  abc_model: {
    key: 'abc_model',
    label: 'Scenario 1: ABC Model College (50m Match)',
    instituteName: 'ABC Model College Gate',
    latitude: 23.74685,
    longitude: 90.37645,
    accuracy: 6,
    description: 'Road 7, Dhanmondi (~48m from stored ABC Model College gate, confirms location & faculty)',
  },
  scenario_2_mismatch: {
    key: 'scenario_2_mismatch',
    label: 'Scenario 2: Significant GPS Mismatch (320m drift)',
    instituteName: 'Dhanmondi Model School Area',
    latitude: 23.7448,
    longitude: 90.3805,
    accuracy: 8,
    description: '320m drift from stored coordinates — triggers "Use Current Location" proposal',
  },
  scenario_3_transfer: {
    key: 'scenario_3_transfer',
    label: 'Scenario 3: XYZ School Faculty Transfer',
    instituteName: 'ABC Model College Campus',
    latitude: 23.7465,
    longitude: 90.3762,
    accuracy: 5,
    description: 'Visiting ABC Model College; search and propose transfer for faculty from XYZ School',
  },
  scenario_4_new_institute: {
    key: 'scenario_4_new_institute',
    label: 'Scenario 4: Add New Institute & Duplicate Check',
    instituteName: 'Mirpur Sector 10 Unregistered Site',
    latitude: 23.8065,
    longitude: 90.3695,
    accuracy: 10,
    description: 'Unregistered site; capture GPS and evaluate duplicate candidate warning',
  },
  poor_accuracy: {
    key: 'poor_accuracy',
    label: 'Edge Case: Poor GPS Accuracy (±140m)',
    instituteName: 'Weak Satellite Signal Area',
    latitude: 23.7468,
    longitude: 90.3760,
    accuracy: 140,
    description: 'Degraded satellite fix (> 100m tolerance threshold)',
  },
  no_matching: {
    key: 'no_matching',
    label: 'Edge Case: Far Outskirts (> 10km away)',
    instituteName: 'Remote Area (No Nearby Institutes)',
    latitude: 23.8300,
    longitude: 90.2800,
    accuracy: 18,
    description: 'Isolated field location far from all registered master database institutions',
  },
};

export interface GeolocationErrorDetails {
  code: 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'UNSUPPORTED' | 'UNKNOWN';
  message: string;
}

export const geolocationService = {
  /**
   * 1. getRealLocation(): Uses browser navigator.geolocation with typed error recognition
   */
  async getRealLocation(): Promise<GpsLocationResult> {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      const err: GeolocationErrorDetails = {
        code: 'UNSUPPORTED',
        message: 'Geolocation is not supported by your browser or environment.',
      };
      throw err;
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: Math.round(position.coords.accuracy),
            isDemo: false,
            locationName: 'Hardware GPS Location',
            source: 'hardware',
            timestamp: new Date().toISOString(),
          });
        },
        (error) => {
          let code: GeolocationErrorDetails['code'] = 'UNKNOWN';
          let message = 'Unable to retrieve physical GPS coordinates.';

          if (error.code === 1) {
            code = 'PERMISSION_DENIED';
            message = 'Location permission was denied. Please allow location access in your browser settings, or use Demo GPS mode.';
          } else if (error.code === 2) {
            code = 'POSITION_UNAVAILABLE';
            message = 'GPS location is unavailable. Check your device GPS sensors or switch to Demo GPS mode.';
          } else if (error.code === 3) {
            code = 'TIMEOUT';
            message = 'GPS location request timed out. Please try again or switch to Demo GPS mode.';
          }

          reject({ code, message });
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 }
      );
    });
  },

  /**
   * 2. getDemoLocation(key?): Returns a selected demo Institute location
   */
  getDemoLocation(key = 'abc_model'): GpsLocationResult {
    const preset = DEMO_LOCATIONS[key] || DEMO_LOCATIONS.abc_model;
    return {
      latitude: preset.latitude,
      longitude: preset.longitude,
      accuracy: preset.accuracy,
      isDemo: true,
      locationName: preset.label,
      source: 'demo',
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * 3. getCurrentLocation(): Uses real GPS when available unless demo mode is enabled
   */
  async getCurrentLocation(preferDemo?: boolean, demoKey?: string): Promise<GpsLocationResult> {
    const settings = await settingsRepository.getSettings();
    const isDemo = preferDemo !== undefined ? preferDemo : settings.demoModeEnabled;
    const selectedKey = demoKey || settings.selectedDemoLocationKey || 'abc_model';

    if (isDemo) {
      return this.getDemoLocation(selectedKey);
    }

    try {
      return await this.getRealLocation();
    } catch (err: any) {
      console.warn('Real GPS failed or permission denied, falling back to Demo Location:', err);
      return this.getDemoLocation(selectedKey);
    }
  },

  /**
   * 4. calculateDistance(): Haversine formula (returns distance in meters)
   */
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth radius in metres
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c);
  },

  /**
   * 5. findNearbyInstitutes(): Returns existing institutes within the configured search radius
   */
  async findNearbyInstitutes(
    latitude: number, 
    longitude: number, 
    searchRadiusMeters?: number
  ): Promise<Array<Institute & { distanceMeters: number; isWithinThreshold: boolean }>> {
    const settings = await settingsRepository.getSettings();
    const radius = searchRadiusMeters ?? settings.locationSearchRadiusMeters;
    const threshold = settings.locationVerificationThresholdMeters;

    const allInstitutes = await instituteRepository.getAll();

    const withDistances = allInstitutes
      .filter((ins) => ins.latitude !== null && ins.longitude !== null)
      .map((ins) => {
        const distance = this.calculateDistance(latitude, longitude, ins.latitude!, ins.longitude!);
        return {
          ...ins,
          distanceMeters: distance,
          isWithinThreshold: distance <= threshold,
        };
      })
      .filter((ins) => ins.distanceMeters <= radius)
      .sort((a, b) => a.distanceMeters - b.distanceMeters);

    return withDistances;
  },

  /**
   * 6. findNearestInstitute(): Finds the closest institute in the registry regardless of distance
   */
  async findNearestInstitute(
    latitude: number,
    longitude: number
  ): Promise<{ institute: Institute; distanceMeters: number } | null> {
    const allInstitutes = await instituteRepository.getAll();
    const withCoords = allInstitutes.filter((ins) => ins.latitude !== null && ins.longitude !== null);
    if (withCoords.length === 0) return null;

    let closest: Institute = withCoords[0];
    let minDistance = this.calculateDistance(latitude, longitude, closest.latitude!, closest.longitude!);

    for (let i = 1; i < withCoords.length; i++) {
      const ins = withCoords[i];
      const dist = this.calculateDistance(latitude, longitude, ins.latitude!, ins.longitude!);
      if (dist < minDistance) {
        minDistance = dist;
        closest = ins;
      }
    }

    return {
      institute: closest,
      distanceMeters: minDistance,
    };
  }
};
