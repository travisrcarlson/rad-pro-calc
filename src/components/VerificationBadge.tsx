import React from 'react';
import { Link } from 'react-router-dom';

export interface VerificationBadgeProps {
  testId: string;
  primaryTestId?: string;
  standard?: string;
  label?: string;
  title?: string;
  hideSqa?: boolean;
  style?: React.CSSProperties;
}

export const VerificationBadge: React.FC<VerificationBadgeProps> = ({
  testId,
  primaryTestId,
  standard,
  label,
  title,
  hideSqa = false,
  style
}) => {
  const targetTest = primaryTestId || (testId.includes(' ') ? testId.split(' ')[0] : testId);
  const displayStandard = standard || label || 'ISO 17025';

  return (
    <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', ...style }}>
      <Link
        to={`/verify?test=${encodeURIComponent(targetTest)}`}
        style={{
          textDecoration: 'none',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '3px 9px',
          fontSize: '0.72rem',
          borderRadius: '5px',
          background: 'rgba(15, 23, 42, 0.72)',
          border: '1px solid rgba(148, 163, 184, 0.24)',
          color: '#cbd5e1',
          transition: 'all 0.15s ease'
        }}
        title={title || `View scientific proof and reference benchmark for ${testId} (${displayStandard})`}
      >
        <span style={{ color: '#94a3b8', fontWeight: 700 }}>✓</span>
        <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{testId}</span>
        <span style={{ color: '#94a3b8' }}>({displayStandard})</span>
      </Link>
      {!hideSqa && (
        <Link
          to="/verify?tab=iso_matrix"
          style={{
            textDecoration: 'none',
            cursor: 'pointer',
            padding: '3px 8px',
            fontSize: '0.71rem',
            borderRadius: '5px',
            background: 'rgba(15, 23, 42, 0.72)',
            border: '1px solid rgba(148, 163, 184, 0.22)',
            color: '#94a3b8',
            fontWeight: 600,
            transition: 'all 0.15s ease'
          }}
          title="Inspect ISO / IEC 17025 & NQA-1 Compliance Register"
        >
          ISO 17025 SQA
        </Link>
      )}
    </div>
  );
};

export default VerificationBadge;
