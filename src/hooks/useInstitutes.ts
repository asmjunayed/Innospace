import { useState, useEffect, useCallback } from 'react';
import { Institute, LocationStatus } from '../types';
import { instituteRepository } from '../services/db/repositories/instituteRepository';

export function useInstitutes() {
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [loading, setLoading] = useState(true);

  const loadInstitutes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await instituteRepository.getAll();
      setInstitutes(data);
    } catch (err) {
      console.error('Failed to load institutes:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInstitutes();
  }, [loadInstitutes]);

  const searchInstitutes = async (query: string, district?: string, type?: string, status?: LocationStatus) => {
    return await instituteRepository.search(query, district, type, status);
  };

  const updateLocation = async (
    id: string, 
    latitude: number, 
    longitude: number, 
    status: LocationStatus = 'observed'
  ) => {
    const updated = await instituteRepository.updateLocation(id, latitude, longitude, status);
    if (updated) {
      setInstitutes((prev) => prev.map((item) => (item.id === id ? updated : item)));
    }
    return updated;
  };

  const checkDuplicates = async (name: string, excludeId?: string) => {
    return await instituteRepository.findPossibleDuplicates(name, excludeId);
  };

  return {
    institutes,
    loading,
    refreshInstitutes: loadInstitutes,
    searchInstitutes,
    updateLocation,
    checkDuplicates,
  };
}
