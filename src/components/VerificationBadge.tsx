import React from 'react';
import { Link } from 'react-router-dom';

export interface VerificationBadgeProps {
  testId: string;
  primaryTestId?: string;
  standard: string;
  title?: string;
  hideSqa?: boolean;
  style?: React.CSSProperties;
}

export const VerificationBadge: React.FC<VerificationBadgeProps> = ({
  testId,
  primaryTestId,
  standard,
  title,
  hideSqa = false,
  style
}) => {
  const targetTest = primaryTestId || (testId.includes(' ') ? testId.split(' ')[0] : testId);

  return (
    <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', ...style }}>
      <Link
        to={`/verify?test=${encodeURIComponent(targetTest)}`}
        className="hud-badge hud-badge-primary"
        style={{
          textDecoration: 'none',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '3px 9px',
          fontSize: '0.74rem',
          borderRadius: '4px',
          transition: 'all 0.2s ease',
          boxShadow: '0 1px 4px rgba(0,0,0,0.2)'
        }}
        title={title || `View scientific proof and reference benchmark for ${testId} (${standard})`}
      >
        <span style={{ color: '#10b981', fontWeight: 800 }}>✓ VERIFIED:</span>
        <span style={{ color: '#fff', fontWeight: 600 }}>{testId}</span>
        <span style={{ opacity: 0.8, color: 'var(--color-primary)' }}>({standard})</span>
      </Link>
      {!hideSqa && (
        <Link
          to="/verify?tab=traceability"
          className="hud-badge hud-badge-success"
          style={{
            textDecoration: 'none',
            cursor: 'pointer',
            padding: '3px 8px',
            fontSize: '0.74rem',
            borderRadius: '4px',
            transition: 'all 0.2s ease'
          }}
          title="Inspect full NQA-1 / ISO 17025 Traceability Matrix"
        >
          IEEE 730 SQA
        </Link>
      )}
    </div>
  );
};

export default VerificationBadge;
