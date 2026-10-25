/**
 * Real-World Radiological File Ingestion & Signal Processing Engine
 *
 * Implements:
 * 1. ANSI N42.42 (2006 / 2020) XML Spectrum Parser (<RadInstrumentData>, <ChannelData>, <EnergyCalibration>)
 * 2. ORTEC Maestro ASCII (.SPE) & Multi-Channel CSV / TKA Spectrum Parser
 * 3. Mariscotti (1967) Generalized Second-Difference Photopeak Search & Trapezoidal Compton Net-Area Solver
 * 4. MARSSIM (NUREG-1575) Field Survey Unit CSV Ingestion & Export Engine
 */

export interface IngestedSpectrum {
  sourceFormat: 'ANSI_N42_42' | 'ORTEC_SPE' | 'MCA_CSV' | 'SYNTHETIC';
  fileName: string;
  instrumentModel: string;
  sampleDescription: string;
  liveTimeSec: number;
  realTimeSec: number;
  calibrationCoeffs: [number, number, number]; // [a0_keV, a1_keV_per_ch, a2_keV_per_ch2]
  channels: number[];
  energiesKeV: number[];
  counts: number[];
}

export interface MariscottiPeak {
  peakIndex: number;
  channelCentroid: number;
  energyKeV: number;
  grossCounts: number;
  continuumCounts: number;
  netAreaCounts: number;
  netAreaUncertainty: number;
  peakHeightCounts: number;
  fwhmKeV: number;
  fwhmPct: number;
  mariscottiZScore: number; // -S_i / F_i significance in standard deviations
  matchedIsotope: string;
  matchedLineKeV: number;
  branchingIntensityPct: number;
}

export interface ReferenceGammaLine {
  isotope: string;
  symbol: string;
  energyKeV: number;
  intensityPct: number;
  category: string;
}

export const REFERENCE_GAMMA_LIBRARY: ReferenceGammaLine[] = [
  { isotope: 'Americium-241 (Am-241)', symbol: 'Am-241', energyKeV: 59.54, intensityPct: 35.9, category: 'Industrial / Actinide' },
  { isotope: 'Lead X-Ray (Pb Kα1)', symbol: 'Pb-X', energyKeV: 74.97, intensityPct: 46.0, category: 'Fluorescence' },
  { isotope: 'Barium-133 (Ba-133)', symbol: 'Ba-133', energyKeV: 81.00, intensityPct: 34.1, category: 'Calibration' },
  { isotope: 'Cobalt-57 (Co-57)', symbol: 'Co-57', energyKeV: 122.06, intensityPct: 85.6, category: 'Calibration' },
  { isotope: 'Europium-152 (Eu-152)', symbol: 'Eu-152', energyKeV: 121.78, intensityPct: 28.6, category: 'Calibration' },
  { isotope: 'Technetium-99m (Tc-99m)', symbol: 'Tc-99m', energyKeV: 140.51, intensityPct: 89.0, category: 'Medical' },
  { isotope: 'Uranium-235 (U-235)', symbol: 'U-235', energyKeV: 185.72, intensityPct: 57.2, category: 'SNM' },
  { isotope: 'Europium-152 (Eu-152)', symbol: 'Eu-152', energyKeV: 244.70, intensityPct: 7.55, category: 'Calibration' },
  { isotope: 'Barium-133 (Ba-133)', symbol: 'Ba-133', energyKeV: 276.40, intensityPct: 7.16, category: 'Calibration' },
  { isotope: 'Iridium-192 (Ir-192)', symbol: 'Ir-192', energyKeV: 295.96, intensityPct: 28.7, category: 'Industrial / HDR' },
  { isotope: 'Barium-133 (Ba-133)', symbol: 'Ba-133', energyKeV: 302.85, intensityPct: 18.3, category: 'Calibration' },
  { isotope: 'Iridium-192 (Ir-192)', symbol: 'Ir-192', energyKeV: 308.46, intensityPct: 29.7, category: 'Industrial / HDR' },
  { isotope: 'Iridium-192 (Ir-192)', symbol: 'Ir-192', energyKeV: 316.51, intensityPct: 82.8, category: 'Industrial / HDR' },
  { isotope: 'Europium-152 (Eu-152)', symbol: 'Eu-152', energyKeV: 344.28, intensityPct: 26.5, category: 'Calibration' },
  { isotope: 'Lead-214 (Ra-226 Progeny)', symbol: 'Pb-214', energyKeV: 351.93, intensityPct: 35.6, category: 'NORM' },
  { isotope: 'Barium-133 (Ba-133)', symbol: 'Ba-133', energyKeV: 356.01, intensityPct: 62.05, category: 'Calibration' },
  { isotope: 'Iodine-131 (I-131)', symbol: 'I-131', energyKeV: 364.49, intensityPct: 81.5, category: 'Medical / Fission' },
  { isotope: 'Barium-133 (Ba-133)', symbol: 'Ba-133', energyKeV: 383.85, intensityPct: 8.94, category: 'Calibration' },
  { isotope: 'Plutonium-239 (Pu-239)', symbol: 'Pu-239', energyKeV: 413.71, intensityPct: 0.0015, category: 'SNM' },
  { isotope: 'Iridium-192 (Ir-192)', symbol: 'Ir-192', energyKeV: 468.07, intensityPct: 47.8, category: 'Industrial / HDR' },
  { isotope: 'Positron Annihilation / Na-22', symbol: 'e+e- / Na-22', energyKeV: 511.00, intensityPct: 180.7, category: 'PET / Pair' },
  { isotope: 'Bismuth-214 (Ra-226 Progeny)', symbol: 'Bi-214', energyKeV: 609.32, intensityPct: 45.5, category: 'NORM' },
  { isotope: 'Cesium-137 (Cs-137 / Ba-137m)', symbol: 'Cs-137', energyKeV: 661.66, intensityPct: 85.1, category: 'Industrial / Fission' },
  { isotope: 'Europium-152 (Eu-152)', symbol: 'Eu-152', energyKeV: 778.90, intensityPct: 12.9, category: 'Calibration' },
  { isotope: 'Manganese-54 (Mn-54)', symbol: 'Mn-54', energyKeV: 834.85, intensityPct: 99.98, category: 'Activation' },
  { isotope: 'Europium-152 (Eu-152)', symbol: 'Eu-152', energyKeV: 964.08, intensityPct: 14.6, category: 'Calibration' },
  { isotope: 'Europium-152 (Eu-152)', symbol: 'Eu-152', energyKeV: 1112.07, intensityPct: 13.6, category: 'Calibration' },
  { isotope: 'Cobalt-60 (Co-60)', symbol: 'Co-60', energyKeV: 1173.23, intensityPct: 99.85, category: 'Industrial / Activation' },
  { isotope: 'Sodium-22 (Na-22)', symbol: 'Na-22', energyKeV: 1274.53, intensityPct: 99.94, category: 'Calibration' },
  { isotope: 'Cobalt-60 (Co-60)', symbol: 'Co-60', energyKeV: 1332.49, intensityPct: 99.98, category: 'Industrial / Activation' },
  { isotope: 'Europium-152 (Eu-152)', symbol: 'Eu-152', energyKeV: 1408.01, intensityPct: 20.8, category: 'Calibration' },
  { isotope: 'Potassium-40 (K-40)', symbol: 'K-40', energyKeV: 1460.82, intensityPct: 10.66, category: 'NORM' },
  { isotope: 'Bismuth-214 (Ra-226 Progeny)', symbol: 'Bi-214', energyKeV: 1764.49, intensityPct: 15.3, category: 'NORM' },
  { isotope: 'Thallium-208 (Th-232 Progeny)', symbol: 'Tl-208', energyKeV: 2614.51, intensityPct: 99.75, category: 'NORM' }
];

/**
 * Parses an ISO 8601 duration string like "PT300S" or "PT5M30S" into seconds.
 */
function parseIsoDurationSec(raw: string | null | undefined, fallback = 300): number {
  if (!raw) return fallback;
  const trimmed = raw.trim();
  const numOnly = Number(trimmed);
  if (!isNaN(numOnly) && numOnly > 0) return numOnly;

  const m = trimmed.match(/PT(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?/i);
  if (!m) return fallback;
  const hours = parseFloat(m[1] || '0');
  const mins = parseFloat(m[2] || '0');
  const secs = parseFloat(m[3] || '0');
  const total = hours * 3600 + mins * 60 + secs;
  return total > 0 ? total : fallback;
}

/**
 * Parses an ANSI N42.42 XML document into an IngestedSpectrum.
 */
export function parseAnsiN42Xml(xmlText: string, fileName = 'spectrum.n42'): IngestedSpectrum {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'application/xml');

  const getTagText = (tagNames: string[]): string | null => {
    for (const name of tagNames) {
      const el = doc.getElementsByTagName(name)[0] || doc.querySelector(name);
      if (el && el.textContent && el.textContent.trim().length > 0) {
        return el.textContent.trim();
      }
    }
    return null;
  };

  const instrumentModel =
    getTagText(['RadInstrumentModelName', 'InstrumentModel', 'Model', 'RadDetectorInformation']) ||
    'ANSI N42.42 Spectrometer';
  const sampleDescription =
    getTagText(['MeasurementClassCode', 'SampleDescription', 'Remarks', 'Title']) ||
    'Ingested ANSI N42.42 Field Spectrum';

  const liveTimeSec = parseIsoDurationSec(getTagText(['LiveTimeDuration', 'LiveTime']), 300);
  const realTimeSec = parseIsoDurationSec(getTagText(['RealTimeDuration', 'RealTime']), liveTimeSec);

  const coeffText = getTagText(['CoefficientValues', 'EnergyCalibrationCoefficients', 'CalibrationCoefficients']);
  let coeffs: [number, number, number] = [0.0, 1.4648, 0.0];
  if (coeffText) {
    const nums = coeffText
      .trim()
      .split(/[\s,]+/)
      .map(Number)
      .filter(n => !isNaN(n));
    if (nums.length >= 2) {
      coeffs = [nums[0], nums[1], nums[2] || 0.0];
    }
  }

  const channelDataRaw = getTagText(['ChannelData', 'Counts', 'SpectrumData']) || '';
  const counts = channelDataRaw
    .trim()
    .split(/[\s,;]+/)
    .map(v => Math.max(0, Math.round(Number(v))))
    .filter(v => !isNaN(v));

  if (counts.length < 16) {
    throw new Error('ANSI N42.42 XML file did not contain a valid <ChannelData> count array (minimum 16 channels).');
  }

  const channels = counts.map((_, idx) => idx);
  const energiesKeV = channels.map(ch => Math.max(0, coeffs[0] + coeffs[1] * ch + coeffs[2] * ch * ch));

  return {
    sourceFormat: 'ANSI_N42_42',
    fileName,
    instrumentModel,
    sampleDescription,
    liveTimeSec,
    realTimeSec,
    calibrationCoeffs: coeffs,
    channels,
    energiesKeV,
    counts
  };
}

/**
 * Parses an ORTEC Maestro ASCII .SPE file or a 1/2/3-column MCA .CSV/.TKA file.
 */
export function parseOrtecSpeOrCsv(rawText: string, fileName = 'spectrum.spe'): IngestedSpectrum {
  const lines = rawText.split(/\r?\n/);

  // Check if ORTEC ASCII .SPE format (contains $DATA:)
  const dataHeaderIdx = lines.findIndex(l => l.trim().toUpperCase().startsWith('$DATA:'));
  if (dataHeaderIdx !== -1) {
    let sampleDescription = 'ORTEC Maestro .SPE Spectrum';
    const specIdIdx = lines.findIndex(l => l.trim().toUpperCase().startsWith('$SPEC_ID:'));
    if (specIdIdx !== -1 && lines[specIdIdx + 1]) {
      sampleDescription = lines[specIdIdx + 1].trim();
    }

    let liveTimeSec = 300;
    let realTimeSec = 300;
    const measTimIdx = lines.findIndex(l => l.trim().toUpperCase().startsWith('$MEAS_TIM:'));
    if (measTimIdx !== -1 && lines[measTimIdx + 1]) {
      const parts = lines[measTimIdx + 1].trim().split(/\s+/).map(Number);
      if (!isNaN(parts[0]) && parts[0] > 0) liveTimeSec = parts[0];
      if (!isNaN(parts[1]) && parts[1] > 0) realTimeSec = parts[1];
    }

    let coeffs: [number, number, number] = [0.0, 1.4648, 0.0];
    const enerFitIdx = lines.findIndex(l => l.trim().toUpperCase().startsWith('$ENER_FIT:'));
    if (enerFitIdx !== -1 && lines[enerFitIdx + 1]) {
      const parts = lines[enerFitIdx + 1].trim().split(/\s+/).map(Number);
      if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        coeffs = [parts[0], parts[1], parts[2] || 0.0];
      }
    }

    const rangeLine = lines[dataHeaderIdx + 1]?.trim().split(/\s+/).map(Number) || [0, 2047];
    const startCh = !isNaN(rangeLine[0]) ? rangeLine[0] : 0;
    const counts: number[] = [];

    for (let i = dataHeaderIdx + 2; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('$')) break;
      if (!line) continue;
      const tokens = line.split(/\s+/).map(Number).filter(n => !isNaN(n));
      for (const c of tokens) {
        counts.push(Math.max(0, Math.round(c)));
      }
    }

    const channels = counts.map((_, idx) => startCh + idx);
    const energiesKeV = channels.map(ch => Math.max(0, coeffs[0] + coeffs[1] * ch + coeffs[2] * ch * ch));

    return {
      sourceFormat: 'ORTEC_SPE',
      fileName,
      instrumentModel: 'ORTEC Maestro MCA (.SPE)',
      sampleDescription,
      liveTimeSec,
      realTimeSec,
      calibrationCoeffs: coeffs,
      channels,
      energiesKeV,
      counts
    };
  }

  // Otherwise parse as CSV / TKA (1, 2, or 3 numeric columns: [channel], [energy_keV], counts)
  const channels: number[] = [];
  const energiesKeV: number[] = [];
  const counts: number[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || /^[a-zA-Z]/.test(line)) continue;
    const cols = line.split(/[,;\t\s]+/).map(Number).filter(n => !isNaN(n));
    if (cols.length === 1) {
      const ch = channels.length;
      channels.push(ch);
      energiesKeV.push(ch * 1.4648);
      counts.push(Math.max(0, Math.round(cols[0])));
    } else if (cols.length === 2) {
      const ch = channels.length;
      channels.push(ch);
      energiesKeV.push(Math.max(0, cols[0]));
      counts.push(Math.max(0, Math.round(cols[1])));
    } else if (cols.length >= 3) {
      channels.push(Math.round(cols[0]));
      energiesKeV.push(Math.max(0, cols[1]));
      counts.push(Math.max(0, Math.round(cols[2])));
    }
  }

  if (counts.length < 16) {
    throw new Error('Spectrum file did not contain enough numeric channel rows (minimum 16 channels).');
  }

  const dE = energiesKeV.length > 1 ? (energiesKeV[energiesKeV.length - 1] - energiesKeV[0]) / (energiesKeV.length - 1) : 1.4648;
  return {
    sourceFormat: 'MCA_CSV',
    fileName,
    instrumentModel: 'Multi-Channel CSV / TKA Import',
    sampleDescription: `Imported ${counts.length}-channel pulse-height spectrum`,
    liveTimeSec: 300,
    realTimeSec: 300,
    calibrationCoeffs: [energiesKeV[0] || 0, dE, 0],
    channels,
    energiesKeV,
    counts
  };
}

/**
 * Mariscotti (1967) Generalized Second-Difference Photopeak Finder & Trapezoidal Net-Area Solver.
 *
 * Reference: M.A. Mariscotti, "A method for automatic identification of peaks in the presence of
 * background and its application to spectrum analysis", Nucl. Instrum. Methods 50 (1967) 309-320.
 */
export function runMariscottiPeakSearch(
  energiesKeV: number[],
  counts: number[],
  options: {
    zThreshold?: number;     // Minimum significance -S_i / F_i (default 3.0 sigma)
    idToleranceKeV?: number; // Isotope library match window (keV)
    nominalFwhmAt662KeV?: number;
  } = {}
): {
  peaks: MariscottiPeak[];
  mariscottiSignal: number[]; // Z_i = max(0, -S_i / F_i) across all channels for plotting
} {
  const zThreshold = options.zThreshold ?? 3.0;
  const idToleranceKeV = options.idToleranceKeV ?? 6.0;
  const n = counts.length;
  if (n < 10) return { peaks: [], mariscottiSignal: [] };

  // Step 1: Raw second difference D_i = C_{i+1} - 2*C_i + C_{i-1} and variance V_i = C_{i+1} + 4*C_i + C_{i-1}
  const D = new Float64Array(n);
  const V = new Float64Array(n);
  for (let i = 1; i < n - 1; i++) {
    const cPrev = Math.max(1, counts[i - 1]);
    const cCurr = Math.max(1, counts[i]);
    const cNext = Math.max(1, counts[i + 1]);
    D[i] = counts[i + 1] - 2 * counts[i] + counts[i - 1];
    V[i] = cNext + 4 * cCurr + cPrev;
  }

  // Step 2: 5-point binomial/Gaussian smoothing kernel w = [1, 4, 6, 4, 1] / 16
  const weights = [1, 4, 6, 4, 1];
  const S = new Float64Array(n);
  const F = new Float64Array(n);
  const mariscottiSignal: number[] = new Array(n).fill(0);

  for (let i = 3; i < n - 3; i++) {
    let sSum = 0;
    let fVarSum = 0;
    for (let k = -2; k <= 2; k++) {
      const w = weights[k + 2];
      sSum += w * D[i + k];
      fVarSum += w * w * V[i + k];
    }
    S[i] = sSum;
    F[i] = Math.sqrt(Math.max(1, fVarSum));
    // Photopeaks have negative second derivative (S_i < 0)
    const zVal = -S[i] / F[i];
    mariscottiSignal[i] = Math.max(0, zVal);
  }

  // Step 3: Locate local maxima of Z_i = -S_i / F_i exceeding zThreshold
  const rawPeakChannels: number[] = [];
  const minSeparationCh = 6;
  const maxSpectrumHeight = Math.max(1, ...counts);

  for (let i = 5; i < n - 5; i++) {
    const z = mariscottiSignal[i];
    if (z < zThreshold) continue;
    if (counts[i] < Math.max(8, maxSpectrumHeight * 0.004)) continue;

    let isLocalMax = true;
    for (let j = i - 3; j <= i + 3; j++) {
      if (j !== i && mariscottiSignal[j] > z) {
        isLocalMax = false;
        break;
      }
    }
    if (!isLocalMax) continue;

    // Enforce minimum channel distance (keep stronger peak)
    if (rawPeakChannels.length > 0) {
      const prevCh = rawPeakChannels[rawPeakChannels.length - 1];
      if (i - prevCh < minSeparationCh) {
        if (mariscottiSignal[i] > mariscottiSignal[prevCh]) {
          rawPeakChannels[rawPeakChannels.length - 1] = i;
        }
        continue;
      }
    }
    rawPeakChannels.push(i);
  }

  // Step 4: Refine centroid, ROI net area, FWHM, and match against Reference Gamma Library
  const keVPerCh = energiesKeV.length > 1 ? Math.abs(energiesKeV[1] - energiesKeV[0]) || 1.4648 : 1.4648;

  const peaks: MariscottiPeak[] = rawPeakChannels.map((chIdx, idx) => {
    // Locate true counts maximum within ±2 channels of second-difference extremum
    let maxCh = chIdx;
    for (let k = Math.max(2, chIdx - 2); k <= Math.min(n - 3, chIdx + 2); k++) {
      if (counts[k] > counts[maxCh]) maxCh = k;
    }

    // Parabolic sub-channel centroid interpolation
    const yL = Math.log(Math.max(1, counts[maxCh - 1]));
    const y0 = Math.log(Math.max(1, counts[maxCh]));
    const yR = Math.log(Math.max(1, counts[maxCh + 1]));
    const denom = 2 * (2 * y0 - yL - yR);
    const deltaCh = Math.abs(denom) > 1e-6 ? Math.max(-0.5, Math.min(0.5, (yR - yL) / denom)) : 0;
    const channelCentroid = maxCh + deltaCh;
    const energyKeV = energiesKeV[maxCh] + deltaCh * keVPerCh;

    // Estimate ROI half-width based on detector resolution or local half-maximum
    const expectedFwhmKeV =
      (options.nominalFwhmAt662KeV ?? 4.5) * Math.sqrt(Math.max(30, energyKeV) / 661.7);
    const roiHalfCh = Math.max(4, Math.min(35, Math.ceil((expectedFwhmKeV * 1.4) / keVPerCh)));
    const leftCh = Math.max(1, maxCh - roiHalfCh);
    const rightCh = Math.min(n - 2, maxCh + roiHalfCh);

    // Trapezoidal Compton continuum background between leftCh and rightCh
    const bgLeft = (counts[Math.max(0, leftCh - 1)] + counts[leftCh] + counts[leftCh + 1]) / 3;
    const bgRight = (counts[rightCh - 1] + counts[rightCh] + counts[Math.min(n - 1, rightCh + 1)]) / 3;
    const roiWidth = rightCh - leftCh + 1;

    let grossCounts = 0;
    for (let c = leftCh; c <= rightCh; c++) {
      grossCounts += counts[c];
    }
    const continuumCounts = 0.5 * (bgLeft + bgRight) * roiWidth;
    const netAreaCounts = Math.max(1, Math.round(grossCounts - continuumCounts));
    const netAreaUncertainty = Math.sqrt(grossCounts + continuumCounts * (roiWidth / 6));

    // Measure empirical FWHM from continuum-subtracted peak profile
    const baselineAtCenter = 0.5 * (bgLeft + bgRight);
    const netPeakHeight = Math.max(1, counts[maxCh] - baselineAtCenter);
    const halfMaxLevel = baselineAtCenter + 0.5 * netPeakHeight;

    let leftHalfCh = maxCh - 1;
    while (leftHalfCh > leftCh && counts[leftHalfCh] > halfMaxLevel) leftHalfCh--;
    let rightHalfCh = maxCh + 1;
    while (rightHalfCh < rightCh && counts[rightHalfCh] > halfMaxLevel) rightHalfCh++;

    const measuredFwhmKeV = Math.max(0.8, (rightHalfCh - leftHalfCh) * keVPerCh);
    const fwhmPct = energyKeV > 0 ? (measuredFwhmKeV / energyKeV) * 100 : 0;

    // Match against REFERENCE_GAMMA_LIBRARY
    let matchedIsotope = 'Unidentified';
    let matchedLineKeV = 0;
    let branchingIntensityPct = 0;
    let bestDiff = idToleranceKeV;

    for (const ref of REFERENCE_GAMMA_LIBRARY) {
      const diff = Math.abs(ref.energyKeV - energyKeV);
      if (diff <= bestDiff) {
        bestDiff = diff;
        matchedIsotope = ref.isotope;
        matchedLineKeV = ref.energyKeV;
        branchingIntensityPct = ref.intensityPct;
      }
    }

    return {
      peakIndex: idx + 1,
      channelCentroid,
      energyKeV,
      grossCounts: Math.round(grossCounts),
      continuumCounts: Math.round(continuumCounts),
      netAreaCounts,
      netAreaUncertainty: Number(netAreaUncertainty.toFixed(1)),
      peakHeightCounts: counts[maxCh],
      fwhmKeV: measuredFwhmKeV,
      fwhmPct,
      mariscottiZScore: Number(mariscottiSignal[chIdx].toFixed(2)),
      matchedIsotope,
      matchedLineKeV,
      branchingIntensityPct
    };
  });

  return { peaks, mariscottiSignal };
}

/**
 * Generates an authentic ANSI N42.42-2020 XML Field RIID Spectrum (Mixed Am-241 + Cs-137 + Co-60 + K-40)
 * for immediate ingestion testing or download.
 */
export function generateSampleAnsiN42Xml(): string {
  const numChannels = 1024;
  const a0 = 0.0;
  const a1 = 2.0; // 2.0 keV/channel -> 0 to 2048 keV
  const counts = new Array(numChannels).fill(0);

  const peaks = [
    { e: 59.54, area: 4200, sigma: 2.2 },   // Am-241
    { e: 185.72, area: 3100, sigma: 3.1 },  // U-235
    { e: 661.66, area: 14500, sigma: 5.2 }, // Cs-137
    { e: 1173.23, area: 8900, sigma: 6.8 }, // Co-60
    { e: 1332.49, area: 8400, sigma: 7.2 }, // Co-60
    { e: 1460.82, area: 1950, sigma: 7.6 }  // K-40 NORM
  ];

  for (let ch = 0; ch < numChannels; ch++) {
    const E = a0 + a1 * ch;
    // Exponential + Compton continuum baseline
    let val = 85 * Math.exp(-E / 550) + (E < 477 ? 24 : E < 1118 ? 10 : 2);
    for (const p of peaks) {
      const dE = E - p.e;
      if (Math.abs(dE) < 5 * p.sigma) {
        val += (p.area / (p.sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-(dE * dE) / (2 * p.sigma * p.sigma)) * a1;
      }
    }
    // Deterministic pseudo-Poisson jitter
    const jitter = Math.sin(ch * 12.9898) * Math.sqrt(val) * 0.65;
    counts[ch] = Math.max(1, Math.round(val + jitter));
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<RadInstrumentData xmlns="http://physics.nist.gov/N42/2006/N42" n42DocUUID="8f4a2e10-9c44-4d8a-b112-radprocalc42">
  <RadInstrumentInformation id="RIID-1">
    <RadInstrumentManufacturerName>ORTEC / FLIR Safeguards</RadInstrumentManufacturerName>
    <RadInstrumentModelName>Detective-X High-Purity Germanium / LaBr3 RIID (ANSI N42.42)</RadInstrumentModelName>
  </RadInstrumentInformation>
  <RadMeasurement id="MEAS-01">
    <MeasurementClassCode>Foreground</MeasurementClassCode>
    <StartDateTime>2026-10-25T18:00:00Z</StartDateTime>
    <RealTimeDuration>PT305.0S</RealTimeDuration>
    <Spectrum id="SPEC-01">
      <LiveTimeDuration>PT300.0S</LiveTimeDuration>
      <EnergyCalibration id="ECAL-01">
        <CoefficientValues>${a0.toFixed(4)} ${a1.toFixed(4)} 0.0000</CoefficientValues>
      </EnergyCalibration>
      <ChannelData>${counts.join(' ')}</ChannelData>
    </Spectrum>
  </RadMeasurement>
</RadInstrumentData>`;
}

export interface MarssimCsvSamplePoint {
  id: string;
  areaType: 'SU' | 'REF';
  value: number;
  xMeters: number;
  yMeters: number;
}

/**
 * Parses a MARSSIM Field Survey Unit CSV file containing Survey Unit (SU) and Reference Area (REF) measurements.
 */
export function parseMarssimSurveyCsv(csvText: string): {
  suValues: number[];
  refValues: number[];
  spatialPoints: MarssimCsvSamplePoint[];
} {
  const lines = csvText.split(/\r?\n/);
  const suValues: number[] = [];
  const refValues: number[] = [];
  const spatialPoints: MarssimCsvSamplePoint[] = [];

  let sampleCounter = 0;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const cols = line.split(/[,;\t]+/).map(s => s.trim());
    // Skip header row
    if (/^(sample|id|point|type|area)/i.test(cols[0]) && isNaN(Number(cols[1])) && isNaN(Number(cols[2]))) {
      continue;
    }

    sampleCounter++;
    // Supported layouts:
    // 1) sample_id, area_type (SU|REF), value, x_m, y_m
    // 2) area_type (SU|REF), value
    // 3) numeric list
    const secondColUpper = (cols[1] || '').toUpperCase();
    const firstColUpper = (cols[0] || '').toUpperCase();

    if (secondColUpper === 'SU' || secondColUpper === 'REF' || secondColUpper === 'BACKGROUND') {
      const val = parseFloat(cols[2]);
      if (isNaN(val)) continue;
      const isRef = secondColUpper === 'REF' || secondColUpper === 'BACKGROUND';
      const xMeters = !isNaN(parseFloat(cols[3])) ? parseFloat(cols[3]) : (sampleCounter % 5) * 2.2;
      const yMeters = !isNaN(parseFloat(cols[4])) ? parseFloat(cols[4]) : Math.floor(sampleCounter / 5) * 2.2;
      if (isRef) refValues.push(val);
      else suValues.push(val);
      spatialPoints.push({
        id: cols[0] || `S-${sampleCounter}`,
        areaType: isRef ? 'REF' : 'SU',
        value: val,
        xMeters,
        yMeters
      });
    } else if (firstColUpper === 'SU' || firstColUpper === 'REF') {
      const val = parseFloat(cols[1]);
      if (isNaN(val)) continue;
      const isRef = firstColUpper === 'REF';
      if (isRef) refValues.push(val);
      else suValues.push(val);
      spatialPoints.push({
        id: `S-${sampleCounter}`,
        areaType: isRef ? 'REF' : 'SU',
        value: val,
        xMeters: (sampleCounter % 5) * 2.2,
        yMeters: Math.floor(sampleCounter / 5) * 2.2
      });
    } else {
      // Treat all numeric tokens on line as Survey Unit measurements
      for (const token of cols) {
        const val = parseFloat(token);
        if (!isNaN(val)) {
          suValues.push(val);
          spatialPoints.push({
            id: `SU-${suValues.length}`,
            areaType: 'SU',
            value: val,
            xMeters: ((suValues.length - 1) % 5) * 2.4 + 1.2,
            yMeters: Math.floor((suValues.length - 1) / 5) * 2.1 + 1.1
          });
        }
      }
    }
  }

  return { suValues, refValues, spatialPoints };
}

/**
 * Generates a NUREG-1575 MARSSIM Class 1 Final Status Survey (FSS) sample CSV with 2D grid coordinates.
 */
export function generateSampleMarssimCsv(dcglW = 5000): string {
  const suPoints = [
    ['FSS-01', 'SU', (dcglW * 0.52).toFixed(1), '1.5', '1.3'],
    ['FSS-02', 'SU', (dcglW * 0.64).toFixed(1), '4.0', '1.3'],
    ['FSS-03', 'SU', (dcglW * 0.41).toFixed(1), '6.5', '1.3'],
    ['FSS-04', 'SU', (dcglW * 0.88).toFixed(1), '9.0', '1.3'],
    ['FSS-05', 'SU', (dcglW * 0.59).toFixed(1), '2.7', '3.5'],
    ['FSS-06', 'SU', (dcglW * 0.71).toFixed(1), '5.2', '3.5'],
    ['FSS-07', 'SU', (dcglW * 0.96).toFixed(1), '7.7', '3.5'],
    ['FSS-08', 'SU', (dcglW * 0.48).toFixed(1), '10.2', '3.5'],
    ['FSS-09', 'SU', (dcglW * 0.77).toFixed(1), '1.5', '5.7'],
    ['FSS-10', 'SU', (dcglW * 0.55).toFixed(1), '4.0', '5.7'],
    ['FSS-11', 'SU', (dcglW * 0.81).toFixed(1), '6.5', '5.7'],
    ['FSS-12', 'SU', (dcglW * 0.44).toFixed(1), '9.0', '5.7'],
    ['FSS-13', 'SU', (dcglW * 0.67).toFixed(1), '2.7', '7.9'],
    ['FSS-14', 'SU', (dcglW * 0.53).toFixed(1), '5.2', '7.9']
  ];
  const refPoints = [
    ['REF-01', 'REF', '38.0', '0.0', '0.0'],
    ['REF-02', 'REF', '44.0', '0.0', '0.0'],
    ['REF-03', 'REF', '35.0', '0.0', '0.0'],
    ['REF-04', 'REF', '51.0', '0.0', '0.0'],
    ['REF-05', 'REF', '41.0', '0.0', '0.0'],
    ['REF-06', 'REF', '47.0', '0.0', '0.0'],
    ['REF-07', 'REF', '49.0', '0.0', '0.0'],
    ['REF-08', 'REF', '39.0', '0.0', '0.0'],
    ['REF-09', 'REF', '43.0', '0.0', '0.0'],
    ['REF-10', 'REF', '45.0', '0.0', '0.0'],
    ['REF-11', 'REF', '52.0', '0.0', '0.0'],
    ['REF-12', 'REF', '37.0', '0.0', '0.0']
  ];

  const rows = [
    '# MARSSIM NUREG-1575 Final Status Survey (FSS) Field Data Log',
    'sample_id,area_type,activity_value,x_m,y_m',
    ...suPoints.map(r => r.join(',')),
    ...refPoints.map(r => r.join(','))
  ];
  return rows.join('\n');
}
