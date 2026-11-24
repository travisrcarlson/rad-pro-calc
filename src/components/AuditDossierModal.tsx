import React, { useState } from 'react';
import { type CalculationDossierPayload, openPrintableAuditDossier, generateDossierHash } from '../services/auditDossierService';

interface AuditDossierModalProps {
  payload: CalculationDossierPayload;
  isOpen: boolean;
  onClose: () => void;
}

export const AuditDossierModal: React.FC<AuditDossierModalProps> = ({ payload, isOpen, onClose }) => {
  const [operatorName, setOperatorName] = useState(payload.operatorName || '');
  const [operatorCredentials, setOperatorCredentials] = useState(payload.operatorCredentials || '');
  const [facility, setFacility] = useState(payload.facility || '');
  const [notes, setNotes] = useState(payload.notes || 'Decision-support evaluation documented under ALARA review procedures.');
  const [previewHash, setPreviewHash] = useState<string>('');
  const [dossierTimestampIso, setDossierTimestampIso] = useState<string>(() => new Date().toISOString());

  React.useEffect(() => {
    if (isOpen) {
      setDossierTimestampIso(new Date().toISOString());
    }
  }, [isOpen]);

  const effectiveOperator = operatorName.trim() || 'Unassigned Evaluator';
  const effectiveCredentials = operatorCredentials.trim() || 'CHP / RSO / SBD';
  const effectiveFacility = facility.trim() || 'Radiological Engineering Evaluation';

  React.useEffect(() => {
    if (isOpen) {
      generateDossierHash(
        {
          ...payload,
          operatorName: effectiveOperator,
          operatorCredentials: effectiveCredentials,
          facility: effectiveFacility,
          notes
        },
        dossierTimestampIso
      ).then(hash => setPreviewHash(hash));
    }
  }, [isOpen, payload, effectiveOperator, effectiveCredentials, effectiveFacility, notes, dossierTimestampIso]);

  if (!isOpen) return null;

  const handleGenerate = () => {
    openPrintableAuditDossier(
      {
        ...payload,
        operatorName: effectiveOperator,
        operatorCredentials: effectiveCredentials,
        facility: effectiveFacility,
        notes
      },
      dossierTimestampIso
    );
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(5, 10, 18, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div className="panel" style={{
        width: '100%',
        maxWidth: '600px',
        borderRadius: '10px',
        border: '1px solid rgba(148, 163, 184, 0.32)',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(65, 90, 119, 0.3)', paddingBottom: '12px' }}>
          <div>
            <h3 style={{ margin: 0, color: 'var(--color-primary)', fontSize: '1.15rem' }}>
              Generate Technical Audit Dossier (SHA-256 Sealed)
            </h3>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
              Structured Health Physics Technical Evaluation Record with Cryptographic Integrity Checksum
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        <div style={{ fontSize: '0.80rem', color: '#cbd5e1' }}>
          Report: <strong>{payload.reportTitle}</strong> ({payload.moduleName})<br />
          Standard: <strong>{payload.statuteCitation}</strong>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Evaluator / Health Physicist Name</label>
            <input
              type="text"
              className="form-control"
              value={operatorName}
              placeholder="Evaluator / Health Physicist Name"
              onChange={(e) => setOperatorName(e.target.value)}
              style={{ width: '100%', padding: '6px', background: '#000', color: '#fff', border: '1px solid var(--color-border)', borderRadius: '4px' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Credentials / Qualification</label>
            <input
              type="text"
              className="form-control"
              value={operatorCredentials}
              placeholder="CHP / RSO / SBD (Level 4A / TMS)"
              onChange={(e) => setOperatorCredentials(e.target.value)}
              style={{ width: '100%', padding: '6px', background: '#000', color: '#fff', border: '1px solid var(--color-border)', borderRadius: '4px' }}
            />
          </div>
        </div>

        <div>
          <label style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Facility / Site / Jurisdiction</label>
          <input
            type="text"
            className="form-control"
            value={facility}
            placeholder="Facility / Organization / Site"
            onChange={(e) => setFacility(e.target.value)}
            style={{ width: '100%', padding: '6px', background: '#000', color: '#fff', border: '1px solid var(--color-border)', borderRadius: '4px' }}
          />
        </div>

        <div>
          <label style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Operational Notes &amp; Justification</label>
          <textarea
            rows={2}
            className="form-control"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{ width: '100%', padding: '6px', background: '#000', color: '#fff', border: '1px solid var(--color-border)', borderRadius: '4px' }}
          />
        </div>

        <div style={{
          background: 'rgba(0, 0, 0, 0.4)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '6px',
          padding: '10px',
          fontSize: '0.72rem',
          fontFamily: 'var(--font-mono)',
          color: '#10b981',
          wordBreak: 'break-all'
        }}>
          <strong>PRE-COMPUTED SHA-256 INTEGRITY FINGERPRINT:</strong><br />
          {previewHash || 'COMPUTING CRYPTOGRAPHIC FINGERPRINT...'}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
          <button
            onClick={onClose}
            style={{ padding: '8px 16px', fontSize: '0.80rem', background: 'transparent', border: '1px solid var(--color-border)', color: '#fff', borderRadius: '6px', cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            style={{
              padding: '8px 20px',
              fontSize: '0.80rem',
              fontWeight: 800,
              background: 'linear-gradient(135deg, #00e5ff, #0284c7)',
              color: '#000',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              boxShadow: '0 0 12px rgba(0, 229, 255, 0.4)'
            }}
          >
            Export PDF &amp; Print Dossier
          </button>
        </div>
      </div>
    </div>
  );
};
