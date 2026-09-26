import { db } from '../../../db';
import { Institute, LocationStatus, DataSource } from '../../../types';

export const instituteRepository = {
  async getAll(): Promise<Institute[]> {
    return await db.institutes.toArray();
  },

  async getById(id: string): Promise<Institute | undefined> {
    return await db.institutes.get(id);
  },

  async getByCode(code: string): Promise<Institute | undefined> {
    return await db.institutes.where('instituteCode').equals(code).first();
  },

  async create(data: Omit<Institute, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Institute> {
    const now = new Date().toISOString();
    const id = data.id || `ins-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const institute: Institute = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };
    await db.institutes.add(institute);
    return institute;
  },

  async update(id: string, updates: Partial<Omit<Institute, 'id' | 'createdAt'>>): Promise<Institute | undefined> {
    const existing = await db.institutes.get(id);
    if (!existing) return undefined;
    const now = new Date().toISOString();
    const updated: Institute = {
      ...existing,
      ...updates,
      updatedAt: now,
    };
    await db.institutes.put(updated);
    return updated;
  },

  async updateLocation(
    id: string, 
    latitude: number, 
    longitude: number, 
    status: LocationStatus = 'observed',
    source: DataSource = 'field_visit'
  ): Promise<Institute | undefined> {
    return this.update(id, {
      latitude,
      longitude,
      locationStatus: status,
      dataSource: source,
    });
  },

  async delete(id: string): Promise<boolean> {
    const exists = await db.institutes.get(id);
    if (!exists) return false;
    await db.institutes.delete(id);
    return true;
  },

  async search(query: string, district?: string, type?: string, status?: LocationStatus): Promise<Institute[]> {
    let collection = await db.institutes.toArray();
    const q = query.trim().toLowerCase();

    return collection.filter((ins) => {
      const matchesQuery = !q || 
        ins.name.toLowerCase().includes(q) || 
        ins.instituteCode.toLowerCase().includes(q) ||
        ins.area.toLowerCase().includes(q) ||
        ins.address.toLowerCase().includes(q);
      
      const matchesDistrict = !district || district === 'ALL' || ins.district === district;
      const matchesType = !type || type === 'ALL' || ins.type === type;
      const matchesStatus = !status || (status as string) === 'ALL' || ins.locationStatus === status;

      return matchesQuery && matchesDistrict && matchesType && matchesStatus;
    });
  },

  async findPossibleDuplicates(name: string, excludeId?: string): Promise<Institute[]> {
    const cleanName = name.trim().toLowerCase();
    const all = await db.institutes.toArray();
    return all.filter((ins) => {
      if (excludeId && ins.id === excludeId) return false;
      const otherName = ins.name.trim().toLowerCase();
      return otherName.includes(cleanName) || cleanName.includes(otherName);
    });
  }
};
