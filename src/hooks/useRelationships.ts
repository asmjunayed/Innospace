import { useState, useEffect, useCallback } from 'react';
import { EmployeeInstituteRelationship, EmployeeRelationshipStatus } from '../types';
import { relationshipRepository } from '../services/db/repositories/relationshipRepository';

export function useRelationships(employeeId?: string, instituteId?: string) {
  const [relationships, setRelationships] = useState<EmployeeInstituteRelationship[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRelationships = useCallback(async () => {
    setLoading(true);
    try {
      let data: EmployeeInstituteRelationship[];
      if (employeeId) {
        data = await relationshipRepository.getByEmployeeId(employeeId);
      } else if (instituteId) {
        data = await relationshipRepository.getByInstituteId(instituteId);
      } else {
        data = await relationshipRepository.getAll();
      }
      setRelationships(data);
    } catch (err) {
      console.error('Failed to load relationships:', err);
    } finally {
      setLoading(false);
    }
  }, [employeeId, instituteId]);

  useEffect(() => {
    loadRelationships();
  }, [loadRelationships]);

  const updateStatus = async (id: string, status: EmployeeRelationshipStatus) => {
    const updated = await relationshipRepository.updateStatus(id, status);
    if (updated) {
      setRelationships((prev) => prev.map((r) => (r.id === id ? updated : r)));
    }
    return updated;
  };

  return {
    relationships,
    loading,
    updateStatus,
    refreshRelationships: loadRelationships,
  };
}
