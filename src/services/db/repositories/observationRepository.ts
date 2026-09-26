import { db } from '../../../db';
import { FieldObservation, VerificationStatus } from '../../../types';

export const observationRepository = {
  async getAll(): Promise<FieldObservation[]> {
    const all = await db.observations.toArray();
    return all.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  },

  async getById(id: string): Promise<FieldObservation | undefined> {
    return await db.observations.get(id);
  },

  async getByVisitId(visitId: string): Promise<FieldObservation[]> {
    return await db.observations.where('visitId').equals(visitId).toArray();
  },

  async getBySubmittedBy(submittedBy: string): Promise<FieldObservation[]> {
    const all = await db.observations.where('submittedBy').equals(submittedBy).toArray();
    return all.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  },

  async getByStatus(status: VerificationStatus): Promise<FieldObservation[]> {
    return await db.observations.where('verificationStatus').equals(status).toArray();
  },

  async getPending(): Promise<FieldObservation[]> {
    return await db.observations.where('verificationStatus').equals('pending').toArray();
  },

  async create(
    data: Omit<FieldObservation, 'id' | 'observationCode' | 'submittedAt'> & { 
      id?: string; 
      observationCode?: string;
      submittedAt?: string;
    }
  ): Promise<FieldObservation> {
    const id = data.id || `obs-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const count = await db.observations.count();
    const observationCode = data.observationCode || `OBS-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;
    const submittedAt = data.submittedAt || new Date().toISOString();

    const observation: FieldObservation = {
      ...data,
      id,
      observationCode,
      submittedAt,
    };
    await db.observations.add(observation);
    return observation;
  },

  async update(
    id: string, 
    updates: Partial<Omit<FieldObservation, 'id' | 'observationCode'>>
  ): Promise<FieldObservation | undefined> {
    const existing = await db.observations.get(id);
    if (!existing) return undefined;
    const updated: FieldObservation = {
      ...existing,
      ...updates,
    };
    await db.observations.put(updated);
    return updated;
  },

  async verify(
    id: string, 
    status: VerificationStatus, 
    verifierId: string, 
    comment?: string | null
  ): Promise<FieldObservation | undefined> {
    return this.update(id, {
      verificationStatus: status,
      verifierId,
      verifiedAt: new Date().toISOString(),
      verifierComment: comment || null,
    });
  },

  async delete(id: string): Promise<boolean> {
    const exists = await db.observations.get(id);
    if (!exists) return false;
    await db.observations.delete(id);
    return true;
  }
};
