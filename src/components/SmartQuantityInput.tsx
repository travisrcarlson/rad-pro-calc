import React, { useState, useEffect, useMemo } from 'react';

export type QuantityDimension = 'activity' | 'distance' | 'thickness' | 'dose';

interface UnitSpec {
  unit: string;
  toBase: number; // multiplier to convert this unit -> base unit (GBq, m, cm, mSv)
  aliases: string[];
}

const DIMENSION_UNITS: Record<QuantityDimension, { baseUnit: string; units: UnitSpec[] }> = {
  activity: {
    baseUnit: 'GBq',
    units: [
      { unit: 'GBq', toBase: 1, aliases: ['gbq'] },
      { unit: 'MBq', toBase: 1e-3, aliases: ['mbq'] },
      { unit: 'Bq', toBase: 1e-9, aliases: ['bq'] },
      { unit: 'TBq', toBase: 1e3, aliases: ['tbq'] },
      { unit: 'Ci', toBase: 37.0, aliases: ['ci', 'curie', 'curies'] },
      { unit: 'mCi', toBase: 0.037, aliases: ['mci'] },
      { unit: 'µCi', toBase: 3.7e-5, aliases: ['uci', 'µci', 'mc'] }
    ]
  },
  distance: {
    baseUnit: 'm',
    units: [
      { unit: 'm', toBase: 1, aliases: ['m', 'meter', 'meters'] },
      { unit: 'cm', toBase: 0.01, aliases: ['cm'] },
      { unit: 'ft', toBase: 0.3048, aliases: ['ft', 'feet', 'foot'] },
      { unit: 'km', toBase: 1000, aliases: ['km'] }
    ]
  },
  thickness: {
    baseUnit: 'cm',
    units: [
      { unit: 'cm', toBase: 1, aliases: ['cm'] },
      { unit: 'mm', toBase: 0.1, aliases: ['mm'] },
      { unit: 'in', toBase: 2.54, aliases: ['in', 'inch', 'inches'] },
      { unit: 'm', toBase: 100, aliases: ['m'] }
    ]
  },
  dose: {
    baseUnit: 'mSv',
    units: [
      { unit: 'mSv', toBase: 1, aliases: ['msv'] },
      { unit: 'µSv', toBase: 1e-3, aliases: ['usv', 'µsv'] },
      { unit: 'Sv', toBase: 1000, aliases: ['sv'] },
      { unit: 'rem', toBase: 10, aliases: ['rem'] },
      { unit: 'mrem', toBase: 0.01, aliases: ['mrem'] }
    ]
  }
};

export interface SmartQuantityInputProps {
  label: string;
  dimension: QuantityDimension;
  /** Canonical value in base unit: GBq (activity), m (distance), cm (thickness), mSv (dose) */
  valueBase: number;
  onChangeBase: (newBaseVal: number) => void;
  minBase?: number;
  maxBase?: number;
  placeholder?: string;
}

export const SmartQuantityInput: React.FC<SmartQuantityInputProps> = ({
  label,
  dimension,
  valueBase,
  onChangeBase,
  minBase = 0,
  maxBase = 1e12,
  placeholder
}) => {
  const spec = DIMENSION_UNITS[dimension];
  const [selectedUnit, setSelectedUnit] = useState<string>(spec.baseUnit);
  const currentUnitSpec = useMemo(
    () => spec.units.find(u => u.unit === selectedUnit) || spec.units[0],
    [spec, selectedUnit]
  );

  const displayNumeric = useMemo(() => {
    const val = valueBase / currentUnitSpec.toBase;
    if (!Number.isFinite(val)) return '0';
    if (Math.abs(val) >= 1e5 || (Math.abs(val) > 0 && Math.abs(val) < 1e-3)) {
      return val.toExponential(3);
    }
    return String(Number(val.toPrecision(5)));
  }, [valueBase, currentUnitSpec]);

  const [rawText, setRawText] = useState<string>(displayNumeric);
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    setRawText(displayNumeric);
  }, [displayNumeric]);

  const parseAndCommit = (text: string, fallbackUnitSpec: UnitSpec) => {
    const trimmed = text.trim();
    if (!trimmed) {
      setRawText(displayNumeric);
      return;
    }

    // Match scientific/decimal number optionally followed by unit token (e.g. "250 mCi", "3.7e10 Bq", "6 ft")
    const match = trimmed.match(/^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)\s*([a-zA-Zµ]+)?$/i);
    if (!match) {
      setWarning('Enter a number or unit expression (e.g. 10 Ci, 3.7e11 Bq)');
      return;
    }

    const num = parseFloat(match[1]);
    if (!Number.isFinite(num)) {
      setWarning('Invalid numeric value');
      return;
    }

    let unitToUse = fallbackUnitSpec;
    if (match[2]) {
      const unitToken = match[2].toLowerCase();
      const matchedSpec = spec.units.find(
        u => u.unit.toLowerCase() === unitToken || u.aliases.includes(unitToken)
      );
      if (matchedSpec) {
        unitToUse = matchedSpec;
        setSelectedUnit(matchedSpec.unit);
      }
    }

    let computedBase = num * unitToUse.toBase;
    if (computedBase < minBase) {
      computedBase = minBase;
      setWarning(`Clamped to minimum (${minBase} ${spec.baseUnit})`);
    } else if (computedBase > maxBase) {
      computedBase = maxBase;
      setWarning(`Clamped to maximum (${maxBase} ${spec.baseUnit})`);
    } else {
      setWarning(null);
    }

    onChangeBase(Number(computedBase.toPrecision(7)));
  };

  const secondaryConversionLabel = useMemo(() => {
    if (dimension === 'activity') {
      const ci = valueBase / 37.0;
      const bq = valueBase * 1e9;
      return `${ci >= 0.01 ? `${ci.toFixed(3)} Ci` : `${(ci * 1000).toFixed(2)} mCi`} • ${bq.toExponential(2)} Bq`;
    }
    if (dimension === 'distance') {
      const ft = valueBase / 0.3048;
      return `${valueBase.toFixed(2)} m • ${ft.toFixed(2)} ft`;
    }
    if (dimension === 'thickness') {
      const inches = valueBase / 2.54;
      const mm = valueBase * 10;
      return `${mm.toFixed(1)} mm • ${inches.toFixed(2)} in`;
    }
    const rem = valueBase / 10.0;
    return `${valueBase.toFixed(3)} mSv • ${rem >= 0.1 ? `${rem.toFixed(3)} rem` : `${(rem * 1000).toFixed(1)} mrem`}`;
  }, [dimension, valueBase]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={{ fontSize: '0.70rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
          {label}
        </label>
        <span style={{ fontSize: '0.67rem', color: '#64748b', fontFamily: 'var(--font-mono)' }}>
          {secondaryConversionLabel}
        </span>
      </div>
      <div style={{ display: 'flex', gap: '4px' }}>
        <input
          type="text"
          className="form-control"
          value={rawText}
          placeholder={placeholder || `e.g. 100 ${selectedUnit}`}
          title="Tip: You can type scientific notation (3.7e10) or inline units (e.g. '10 Ci', '250 mCi', '6 ft', '2 in') and press Enter"
          onChange={e => {
            setRawText(e.target.value);
            if (warning) setWarning(null);
          }}
          onBlur={() => parseAndCommit(rawText, currentUnitSpec)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              parseAndCommit(rawText, currentUnitSpec);
            }
          }}
          style={{
            flex: 1,
            padding: '5px 8px',
            fontSize: '0.80rem',
            fontFamily: 'var(--font-mono)'
          }}
        />
        <select
          className="form-control"
          value={selectedUnit}
          onChange={e => {
            const nextUnit = e.target.value;
            setSelectedUnit(nextUnit);
            setWarning(null);
          }}
          style={{
            width: '74px',
            padding: '4px 6px',
            fontSize: '0.75rem',
            fontFamily: 'var(--font-mono)'
          }}
        >
          {spec.units.map(u => (
            <option key={u.unit} value={u.unit}>
              {u.unit}
            </option>
          ))}
        </select>
      </div>
      {warning && (
        <span style={{ fontSize: '0.68rem', color: '#fbbf24' }}>{warning}</span>
      )}
    </div>
  );
};
