import { db } from '../../../db';
import { Employee, RelationshipStatus, DataSource } from '../../../types';

export const employeeRepository = {
  async getAll(): Promise<Employee[]> {
    return await db.employees.toArray();
  },

  async getById(id: string): Promise<Employee | undefined> {
    return await db.employees.get(id);
  },

  async getByCode(code: string): Promise<Employee | undefined> {
    return await db.employees.where('employeeCode').equals(code).first();
  },

  async getByInstituteId(instituteId: string): Promise<Employee[]> {
    return await db.employees.where('currentInstituteId').equals(instituteId).toArray();
  },

  async getUnmapped(): Promise<Employee[]> {
    const all = await db.employees.toArray();
    return all.filter((e) => !e.currentInstituteId || e.relationshipStatus === 'unmapped');
  },

  async create(data: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Employee> {
    const now = new Date().toISOString();
    const id = data.id || `emp-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const employee: Employee = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };
    await db.employees.add(employee);
    return employee;
  },

  async update(id: string, updates: Partial<Omit<Employee, 'id' | 'createdAt'>>): Promise<Employee | undefined> {
    const existing = await db.employees.get(id);
    if (!existing) return undefined;
    const now = new Date().toISOString();
    const updated: Employee = {
      ...existing,
      ...updates,
      updatedAt: now,
    };
    await db.employees.put(updated);
    return updated;
  },

  async delete(id: string): Promise<boolean> {
    const exists = await db.employees.get(id);
    if (!exists) return false;
    await db.employees.delete(id);
    return true;
  },

  async search(query: string, status?: RelationshipStatus, instituteId?: string): Promise<Employee[]> {
    const all = await db.employees.toArray();
    const q = query.trim().toLowerCase();

    return all.filter((emp) => {
      const matchesQuery = !q ||
        emp.name.toLowerCase().includes(q) ||
        emp.employeeCode.toLowerCase().includes(q) ||
        emp.designation.toLowerCase().includes(q) ||
        emp.phone.includes(q);

      const matchesStatus = !status || (status as string) === 'ALL' || emp.relationshipStatus === status;
      const matchesInstitute = !instituteId || instituteId === 'ALL' || emp.currentInstituteId === instituteId;

      return matchesQuery && matchesStatus && matchesInstitute;
    });
  },

  async findPossibleDuplicates(name: string, excludeId?: string): Promise<Employee[]> {
    const cleanName = name.trim().toLowerCase();
    const all = await db.employees.toArray();
    return all.filter((emp) => {
      if (excludeId && emp.id === excludeId) return false;
      const otherName = emp.name.trim().toLowerCase();
      return otherName.includes(cleanName) || cleanName.includes(otherName);
    });
  }
};
