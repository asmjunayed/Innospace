import { useState, useEffect, useCallback } from 'react';
import { FieldObservation, VerificationStatus } from '../types';
import { observationRepository } from '../services/db/repositories/observationRepository';
import { instituteRepository } from '../services/db/repositories/instituteRepository';
import { employeeRepository } from '../services/db/repositories/employeeRepository';
import { relationshipRepository } from '../services/db/repositories/relationshipRepository';
import { auditRepository } from '../services/db/repositories/auditRepository';

export function useObservations(filterStatus?: VerificationStatus) {
  const [observations, setObservations] = useState<FieldObservation[]>([]);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const loadObservations = useCallback(async () => {
    setLoading(true);
    try {
      let data: FieldObservation[];
      if (filterStatus) {
        data = await observationRepository.getByStatus(filterStatus);
      } else {
        data = await observationRepository.getAll();
      }
      setObservations(data);

      const pending = await observationRepository.getPending();
      setPendingCount(pending.length);
    } catch (err) {
      console.error('Failed to load observations:', err);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    loadObservations();
  }, [loadObservations]);

  const submitObservation = async (
    obsData: Omit<FieldObservation, 'id' | 'observationCode' | 'submittedAt'>,
    actorName = 'Marketing Officer'
  ): Promise<FieldObservation> => {
    const created = await observationRepository.create(obsData);

    await auditRepository.log({
      entityType: 'FieldObservation',
      entityId: created.id,
      action: 'OBSERVATION_SUBMITTED',
      previousValue: null,
      newValue: created.proposedValue,
      actorId: created.submittedBy,
      actorRole: 'mo',
      description: `${actorName} submitted observation [${created.observationCode}] for verification`,
    });

    setObservations((prev) => [created, ...prev]);
    setPendingCount((prev) => prev + 1);
    return created;
  };

  const approveObservation = async (
    observationId: string,
    verifierId: string,
    verifierComment?: string
  ): Promise<FieldObservation | undefined> => {
    const obs = await observationRepository.getById(observationId);
    if (!obs) return undefined;

    // Apply change to trusted master data based on entityType
    if (obs.entityType === 'institute_location' && obs.entityId) {
      if (obs.latitude !== null && obs.longitude !== null) {
        await instituteRepository.updateLocation(
          obs.entityId,
          obs.latitude,
          obs.longitude,
          'verified',
          'verified_update'
        );
      }
    } else if (obs.entityType === 'employee_relationship' && obs.entityId) {
      const prop = obs.proposedValue || {};
      if (prop.instituteId) {
        // SCENARIO 3: Archive all previous active relationships for other institutes as historical
        const existingRels = await relationshipRepository.getByEmployeeId(obs.entityId);
        for (const rel of existingRels) {
          if (rel.status === 'active' && rel.instituteId !== prop.instituteId) {
            await relationshipRepository.update(rel.id, {
              status: 'historical',
            });
          }
        }

        await employeeRepository.update(obs.entityId, {
          currentInstituteId: prop.instituteId,
          relationshipStatus: 'verified',
          dataSource: 'verified_update',
          designation: prop.designation || undefined,
          phone: prop.phone || undefined,
        });

        // Set new active relationship if not already existing
        const hasActiveForTarget = existingRels.some(
          (r) => r.status === 'active' && r.instituteId === prop.instituteId
        );
        if (!hasActiveForTarget) {
          await relationshipRepository.create({
            employeeId: obs.entityId,
            instituteId: prop.instituteId,
            status: 'active',
            source: 'admin_verification',
          });
        }
      } else if (prop.designation || prop.phone) {
        await employeeRepository.update(obs.entityId, {
          designation: prop.designation,
          phone: prop.phone,
          relationshipStatus: 'verified',
          dataSource: 'verified_update',
        });
      }
    } else if (obs.entityType === 'new_employee') {
      const prop = obs.proposedValue || {};
      const newEmp = await employeeRepository.create({
        employeeCode: `EMP-NEW-${Math.floor(100 + Math.random() * 900)}`,
        name: prop.name || 'New Employee',
        designation: prop.designation || 'Staff',
        phone: prop.phone || '',
        currentInstituteId: prop.instituteId || null,
        relationshipStatus: prop.instituteId ? 'verified' : 'unmapped',
        dataSource: 'verified_update',
      });

      if (prop.instituteId) {
        await relationshipRepository.create({
          employeeId: newEmp.id,
          instituteId: prop.instituteId,
          status: 'active',
          source: 'admin_verification',
        });
      }
    } else if (obs.entityType === 'new_institute') {
      const prop = obs.proposedValue || {};
      const newInst = await instituteRepository.create({
        instituteCode: prop.candidateCode || `INS-VER-${Math.floor(1000 + Math.random() * 9000)}`,
        name: prop.name || 'New Verified Institute',
        type: prop.type || 'College',
        district: prop.district || 'Dhaka',
        area: prop.area || 'General Area',
        address: prop.address || '',
        latitude: obs.latitude ?? prop.latitude ?? null,
        longitude: obs.longitude ?? prop.longitude ?? null,
        locationStatus: 'verified',
        dataSource: 'verified_update',
      });

      await auditRepository.log({
        entityType: 'Institute',
        entityId: newInst.id,
        action: 'CREATE_MASTER_INSTITUTE',
        previousValue: null,
        newValue: newInst,
        actorId: verifierId,
        actorRole: 'admin',
        description: `Created new master Institute [${newInst.name}] from approved field discovery`,
      });
    }

    const verified = await observationRepository.verify(
      observationId,
      'approved',
      verifierId,
      verifierComment
    );

    await auditRepository.log({
      entityType: 'FieldObservation',
      entityId: observationId,
      action: 'VERIFICATION_APPROVED',
      previousValue: obs.existingValue,
      newValue: obs.proposedValue,
      actorId: verifierId,
      actorRole: 'admin',
      description: `Verifier approved observation [${obs.observationCode}] into Trusted Master Data`,
    });

    await loadObservations();
    return verified;
  };

  const rejectObservation = async (
    observationId: string,
    verifierId: string,
    verifierComment?: string
  ): Promise<FieldObservation | undefined> => {
    const obs = await observationRepository.getById(observationId);
    if (!obs) return undefined;

    const rejected = await observationRepository.verify(
      observationId,
      'rejected',
      verifierId,
      verifierComment
    );

    await auditRepository.log({
      entityType: 'FieldObservation',
      entityId: observationId,
      action: 'VERIFICATION_REJECTED',
      previousValue: obs.proposedValue,
      newValue: null,
      actorId: verifierId,
      actorRole: 'admin',
      description: `Verifier rejected observation [${obs.observationCode}] (${verifierComment || 'No comment'})`,
    });

    await loadObservations();
    return rejected;
  };

  const requestMoreInformationObservation = async (
    observationId: string,
    verifierId: string,
    verifierComment: string
  ): Promise<FieldObservation | undefined> => {
    const obs = await observationRepository.getById(observationId);
    if (!obs) return undefined;

    const updated = await observationRepository.verify(
      observationId,
      'needs_more_information',
      verifierId,
      verifierComment
    );

    await auditRepository.log({
      entityType: 'FieldObservation',
      entityId: observationId,
      action: 'VERIFICATION_NEEDS_INFO',
      previousValue: obs.proposedValue,
      newValue: null,
      actorId: verifierId,
      actorRole: 'admin',
      description: `Verifier requested more information on observation [${obs.observationCode}]: ${verifierComment}`,
    });

    await loadObservations();
    return updated;
  };

  const deleteObservation = async (observationId: string): Promise<boolean> => {
    const success = await observationRepository.delete(observationId);
    if (success) {
      setObservations((prev) => prev.filter((o) => o.id !== observationId));
      setPendingCount((prev) => Math.max(0, prev - 1));
    }
    return success;
  };

  const updateObservation = async (
    observationId: string,
    updates: Partial<Omit<FieldObservation, 'id' | 'observationCode'>>
  ): Promise<FieldObservation | undefined> => {
    const updated = await observationRepository.update(observationId, updates);
    if (updated) {
      setObservations((prev) => prev.map((o) => (o.id === observationId ? updated : o)));
    }
    return updated;
  };

  return {
    observations,
    pendingCount,
    loading,
    submitObservation,
    approveObservation,
    rejectObservation,
    requestMoreInformationObservation,
    deleteObservation,
    updateObservation,
    refreshObservations: loadObservations,
  };
}
