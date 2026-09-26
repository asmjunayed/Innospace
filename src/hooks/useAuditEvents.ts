import { useState, useEffect, useCallback } from 'react';
import { AuditEvent } from '../types';
import { auditRepository } from '../services/db/repositories/auditRepository';

export function useAuditEvents(limit?: number) {
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAuditEvents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await auditRepository.getAll(limit);
      setAuditEvents(data);
    } catch (err) {
      console.error('Failed to load audit events:', err);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    loadAuditEvents();
  }, [loadAuditEvents]);

  const logEvent = async (event: Omit<AuditEvent, 'id' | 'timestamp'>) => {
    const created = await auditRepository.log(event);
    setAuditEvents((prev) => [created, ...prev]);
    return created;
  };

  return {
    auditEvents,
    loading,
    logEvent,
    refreshAuditEvents: loadAuditEvents,
  };
}
