import { db } from '../../../db';
import { EmployeeInstituteRelationship, EmployeeRelationshipStatus } from '../../../types';

export const relationshipRepository = {
  async getAll(): Promise<EmployeeInstituteRelationship[]> {
    return await db.relationships.toArray();
  },

  async getById(id: string): Promise<EmployeeInstituteRelationship | undefined> {
    return await db.relationships.get(id);
  },

  async getByEmployeeId(employeeId: string): Promise<EmployeeInstituteRelationship[]> {
    return await db.relationships.where('employeeId').equals(employeeId).toArray();
  },

  async getByInstituteId(instituteId: string): Promise<EmployeeInstituteRelationship[]> {
    return await db.relationships.where('instituteId').equals(instituteId).toArray();
  },

  async getActiveForEmployee(employeeId: string): Promise<EmployeeInstituteRelationship | undefined> {
    return await db.relationships
      .where('employeeId')
      .equals(employeeId)
      .and((r) => r.status === 'active')
      .first();
  },

  async create(
    data: Omit<EmployeeInstituteRelationship, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ): Promise<EmployeeInstituteRelationship> {
    const now = new Date().toISOString();
    const id = data.id || `rel-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const relationship: EmployeeInstituteRelationship = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };
    await db.relationships.add(relationship);
    return relationship;
  },

  async update(
    id: string, 
    updates: Partial<Omit<EmployeeInstituteRelationship, 'id' | 'createdAt'>>
  ): Promise<EmployeeInstituteRelationship | undefined> {
    const existing = await db.relationships.get(id);
    if (!existing) return undefined;
    const now = new Date().toISOString();
    const updated: EmployeeInstituteRelationship = {
      ...existing,
      ...updates,
      updatedAt: now,
    };
    await db.relationships.put(updated);
    return updated;
  },

  async updateStatus(id: string, status: EmployeeRelationshipStatus): Promise<EmployeeInstituteRelationship | undefined> {
    return this.update(id, { status });
  },

  async delete(id: string): Promise<boolean> {
    const exists = await db.relationships.get(id);
    if (!exists) return false;
    await db.relationships.delete(id);
    return true;
  }
};
