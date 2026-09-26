import { db } from '../../../db';
import { ImportJob } from '../../../types';

export const importJobRepository = {
  async getAll(): Promise<ImportJob[]> {
    const all = await db.importJobs.toArray();
    return all.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  },

  async getById(id: string): Promise<ImportJob | undefined> {
    return await db.importJobs.get(id);
  },

  async create(
    data: Omit<ImportJob, 'id' | 'jobCode' | 'uploadedAt'> & { id?: string; jobCode?: string; uploadedAt?: string }
  ): Promise<ImportJob> {
    const id = data.id || `imp-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const count = await db.importJobs.count();
    const jobCode = data.jobCode || `IMP-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;
    const uploadedAt = data.uploadedAt || new Date().toISOString();

    const job: ImportJob = {
      ...data,
      id,
      jobCode,
      uploadedAt,
    };
    await db.importJobs.add(job);
    return job;
  },

  async update(id: string, updates: Partial<Omit<ImportJob, 'id' | 'jobCode'>>): Promise<ImportJob | undefined> {
    const existing = await db.importJobs.get(id);
    if (!existing) return undefined;
    const updated: ImportJob = {
      ...existing,
      ...updates,
    };
    await db.importJobs.put(updated);
    return updated;
  }
};
