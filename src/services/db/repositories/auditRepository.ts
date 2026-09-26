import { db } from '../../../db';
import { AuditEvent } from '../../../types';

export const auditRepository = {
  async getAll(limit?: number): Promise<AuditEvent[]> {
    const all = await db.auditEvents.toArray();
    const sorted = all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return limit ? sorted.slice(0, limit) : sorted;
  },

  async getById(id: string): Promise<AuditEvent | undefined> {
    return await db.auditEvents.get(id);
  },

  async getByEntity(entityType: string, entityId: string): Promise<AuditEvent[]> {
    const all = await db.auditEvents
      .where('entityType')
      .equals(entityType)
      .and((a) => a.entityId === entityId)
      .toArray();
    return all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  async log(
    event: Omit<AuditEvent, 'id' | 'timestamp'> & { id?: string; timestamp?: string }
  ): Promise<AuditEvent> {
    const id = event.id || `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const timestamp = event.timestamp || new Date().toISOString();

    const auditEvent: AuditEvent = {
      ...event,
      id,
      timestamp,
    };
    await db.auditEvents.add(auditEvent);
    return auditEvent;
  }
};
