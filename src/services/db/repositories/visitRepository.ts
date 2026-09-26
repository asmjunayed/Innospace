import { db } from '../../../db';
import { Visit, VisitStatus } from '../../../types';

export const visitRepository = {
  async getAll(): Promise<Visit[]> {
    return await db.visits.reverse().toArray();
  },

  async getById(id: string): Promise<Visit | undefined> {
    return await db.visits.get(id);
  },

  async getByMoId(moId: string): Promise<Visit[]> {
    const all = await db.visits.where('moId').equals(moId).toArray();
    return all.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  },

  async getActiveVisit(moId: string): Promise<Visit | undefined> {
    return await db.visits
      .where('moId')
      .equals(moId)
      .and((v) => v.status === 'in_progress')
      .first();
  },

  async create(data: Omit<Visit, 'id' | 'visitCode'> & { id?: string; visitCode?: string }): Promise<Visit> {
    const id = data.id || `vis-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const count = await db.visits.count();
    const visitCode = data.visitCode || `VIS-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;
    
    const visit: Visit = {
      ...data,
      id,
      visitCode,
    };
    await db.visits.add(visit);
    return visit;
  },

  async update(id: string, updates: Partial<Omit<Visit, 'id' | 'visitCode'>>): Promise<Visit | undefined> {
    const existing = await db.visits.get(id);
    if (!existing) return undefined;
    const updated: Visit = {
      ...existing,
      ...updates,
    };
    await db.visits.put(updated);
    return updated;
  },

  async completeVisit(
    id: string, 
    latitude?: number | null, 
    longitude?: number | null, 
    accuracy?: number | null
  ): Promise<Visit | undefined> {
    const updates: Partial<Visit> = {
      status: 'ready_for_submission',
      completedAt: new Date().toISOString(),
    };
    if (latitude !== undefined) updates.currentLatitude = latitude;
    if (longitude !== undefined) updates.currentLongitude = longitude;
    if (accuracy !== undefined) updates.currentAccuracy = accuracy;

    return this.update(id, updates);
  },

  async submitVisit(id: string): Promise<Visit | undefined> {
    return this.update(id, {
      status: 'submitted',
      completedAt: new Date().toISOString()
    });
  },

  async delete(id: string): Promise<boolean> {
    const exists = await db.visits.get(id);
    if (!exists) return false;
    await db.visits.delete(id);
    return true;
  }
};
