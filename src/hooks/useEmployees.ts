import { useState, useEffect, useCallback } from 'react';
import { Employee, RelationshipStatus } from '../types';
import { employeeRepository } from '../services/db/repositories/employeeRepository';

export function useEmployees(instituteId?: string) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    try {
      let data: Employee[];
      if (instituteId) {
        data = await employeeRepository.getByInstituteId(instituteId);
      } else {
        data = await employeeRepository.getAll();
      }
      setEmployees(data);
    } catch (err) {
      console.error('Failed to load employees:', err);
    } finally {
      setLoading(false);
    }
  }, [instituteId]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const searchEmployees = async (query: string, status?: RelationshipStatus) => {
    return await employeeRepository.search(query, status, instituteId);
  };

  const getUnmappedEmployees = async () => {
    return await employeeRepository.getUnmapped();
  };

  const updateEmployee = async (id: string, updates: Partial<Omit<Employee, 'id' | 'createdAt'>>) => {
    const updated = await employeeRepository.update(id, updates);
    if (updated) {
      setEmployees((prev) => prev.map((item) => (item.id === id ? updated : item)));
    }
    return updated;
  };

  const checkDuplicates = async (name: string, excludeId?: string) => {
    return await employeeRepository.findPossibleDuplicates(name, excludeId);
  };

  return {
    employees,
    loading,
    refreshEmployees: loadEmployees,
    searchEmployees,
    getUnmappedEmployees,
    updateEmployee,
    checkDuplicates,
  };
}
