import { useState, useEffect, useCallback } from 'react';
import { Visit } from '../types';
import { visitRepository } from '../services/db/repositories/visitRepository';
import { auditRepository } from '../services/db/repositories/auditRepository';

export function useVisits(moId?: string) {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [activeVisit, setActiveVisit] = useState<Visit | null>(null);
  const [loading, setLoading] = useState(true);

  const loadVisits = useCallback(async () => {
    setLoading(true);
    try {
      let data: Visit[];
      if (moId) {
        data = await visitRepository.getByMoId(moId);
        const inProgress = await visitRepository.getActiveVisit(moId);
        setActiveVisit(inProgress || null);
      } else {
        data = await visitRepository.getAll();
      }
      setVisits(data);
    } catch (err) {
      console.error('Failed to load visits:', err);
    } finally {
      setLoading(false);
    }
  }, [moId]);

  useEffect(() => {
    loadVisits();
  }, [loadVisits]);

  const startVisit = async (
    instituteId: string, 
    latitude: number | null, 
    longitude: number | null, 
    accuracy: number | null = 10,
    actorName = 'Marketing Officer'
  ): Promise<Visit> => {
    if (!moId) throw new Error('moId is required to start a visit');
    const newVisit = await visitRepository.create({
      moId,
      instituteId,
      startedAt: new Date().toISOString(),
      completedAt: null,
      currentLatitude: latitude,
      currentLongitude: longitude,
      currentAccuracy: accuracy,
      status: 'in_progress',
    });

    await auditRepository.log({
      entityType: 'Visit',
      entityId: newVisit.id,
      action: 'VISIT_STARTED',
      previousValue: null,
      newValue: { instituteId, latitude, longitude },
      actorId: moId,
      actorRole: 'mo',
      description: `${actorName} started field visit at institute ${instituteId}`,
    });

    setActiveVisit(newVisit);
    setVisits((prev) => [newVisit, ...prev]);
    return newVisit;
  };

  const completeVisit = async (
    visitId: string, 
    latitude?: number | null, 
    longitude?: number | null, 
    accuracy?: number | null,
    actorName = 'Marketing Officer'
  ): Promise<Visit | undefined> => {
    const updated = await visitRepository.submitVisit(visitId);
    if (updated) {
      if (moId) {
        await auditRepository.log({
          entityType: 'Visit',
          entityId: visitId,
          action: 'VISIT_COMPLETED',
          previousValue: { status: 'in_progress' },
          newValue: { status: 'submitted' },
          actorId: moId,
          actorRole: 'mo',
          description: `${actorName} completed & submitted visit ${updated.visitCode}`,
        });
      }
      setActiveVisit(null);
      setVisits((prev) => prev.map((v) => (v.id === visitId ? updated : v)));
    }
    return updated;
  };

  return {
    visits,
    activeVisit,
    loading,
    startVisit,
    completeVisit,
    refreshVisits: loadVisits,
  };
}
