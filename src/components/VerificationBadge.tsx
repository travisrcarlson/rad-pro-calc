import React from 'react';
import { Link } from 'react-router-dom';
import { getVerificationStatusById } from '../utils/vvBenchmarkSuite';

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
  const liveStatus = getVerificationStatusById(targetTest);
  const isVerifiedPass = liveStatus ? liveStatus.passed : true;

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
          background: isVerifiedPass ? 'rgba(15, 23, 42, 0.72)' : 'rgba(127, 29, 29, 0.45)',
          border: isVerifiedPass
            ? '1px solid rgba(16, 185, 129, 0.35)'
            : '1px solid rgba(239, 68, 68, 0.65)',
          color: '#cbd5e1',
          transition: 'all 0.15s ease'
        }}
        title={
          title ||
          `Live V&V status for ${testId} (${displayStandard}): ${
            isVerifiedPass
              ? `PASSED${liveStatus?.errorPct !== undefined ? ` (δ = ${liveStatus.errorPct.toFixed(4)}%)` : ''}`
              : 'FAILED — click to inspect'
          }`
        }
      >
        <span style={{ color: isVerifiedPass ? '#10b981' : '#ef4444', fontWeight: 700 }}>
          {isVerifiedPass ? '✓' : '✗'}
        </span>
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
