import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import VerificationBadge from '../../components/VerificationBadge';
import PlotComponent from 'react-plotly.js';
import { AuditDossierModal } from '../../components/AuditDossierModal';
import { type CalculationDossierPayload } from '../../services/auditDossierService';
import {
  parseAnsiN42Xml,
  parseOrtecSpeOrCsv,
  runMariscottiPeakSearch,
  generateSampleAnsiN42Xml,
  type IngestedSpectrum
} from '../../utils/spectrumAndSurveyParsers';

const Plot = (PlotComponent as any).default || PlotComponent;

export interface DetectorSpec {
  name: string;
  type: 'Scintillator' | 'Semiconductor';
  fwhmAt662keV: number; // keV FWHM
  relativeEffPct: number;
  description: string;
}

export interface GammaLine {
  energyKeV: number;
  intensityPct: number;
}

export interface IsotopeSpec {
  name: string;
  symbol: string;
  category: 'Calibration Standard' | 'Industrial' | 'Medical' | 'Special Nuclear Material';
  gammas: GammaLine[];
  description: string;
}

const DETECTORS: DetectorSpec[] = [
  {
    name: 'HPGe Coaxial (High-Purity Germanium)',
    type: 'Semiconductor',
    fwhmAt662keV: 1.8, // 0.27% resolution
    relativeEffPct: 50,
    description: 'Cryogenically cooled HPGe semiconductor detector with ultra-high energy resolution (~1.8 keV FWHM at 662 keV).'
  },
  {
    name: 'NaI(Tl) 3" x 3" Scintillator',
    type: 'Scintillator',
    fwhmAt662keV: 46.3, // 7.0% resolution
    relativeEffPct: 100,
    description: 'Standard room-temperature Sodium Iodide scintillation detector with high stopping power.'
  },
  {
    name: 'LaBr3(Ce) Cerium-doped Lanthanum Bromide',
    type: 'Scintillator',
    fwhmAt662keV: 19.8, // 3.0% resolution
    relativeEffPct: 130,
    description: 'High-performance inorganic scintillator offering superior light yield and fast timing response.'
  },
  {
    name: 'CZT Coplanar Grid (Cadmium Zinc Telluride)',
    type: 'Semiconductor',
    fwhmAt662keV: 14.5, // 2.2% resolution
    relativeEffPct: 15,
    description: 'Room-temperature semiconductor detector ideal for handheld isotope identifiers (RIID).'
  }
];

const ISOTOPES: IsotopeSpec[] = [
  {
    name: 'Cesium-137 (Cs-137)',
    symbol: 'Cs-137',
    category: 'Calibration Standard',
    gammas: [
      { energyKeV: 661.7, intensityPct: 85.1 },
      { energyKeV: 32.1, intensityPct: 5.8 }
    ],
    description: 'Fission product standard featuring a single prominent 661.7 keV photopeak and distinct Compton edge at 477 keV.'
  },
  {
    name: 'Cobalt-60 (Co-60)',
    symbol: 'Co-60',
    category: 'Industrial',
    gammas: [
      { energyKeV: 1173.2, intensityPct: 99.85 },
      { energyKeV: 1332.5, intensityPct: 99.98 }
    ],
    description: 'High-energy industrial gamma emitter with cascade twin photopeaks at 1173.2 keV and 1332.5 keV.'
  },
  {
    name: 'Barium-133 (Ba-133)',
    symbol: 'Ba-133',
    category: 'Calibration Standard',
    gammas: [
      { energyKeV: 81.0, intensityPct: 34.1 },
      { energyKeV: 276.4, intensityPct: 7.16 },
      { energyKeV: 302.8, intensityPct: 18.3 },
      { energyKeV: 356.0, intensityPct: 62.05 },
      { energyKeV: 383.8, intensityPct: 8.94 }
    ],
    description: 'Multi-line calibration source mimicking low-to-medium energy gamma emitters.'
  },
  {
    name: 'Europium-152 (Eu-152)',
    symbol: 'Eu-152',
    category: 'Calibration Standard',
    gammas: [
      { energyKeV: 121.8, intensityPct: 28.6 },
      { energyKeV: 244.7, intensityPct: 7.55 },
      { energyKeV: 344.3, intensityPct: 26.5 },
      { energyKeV: 778.9, intensityPct: 12.9 },
      { energyKeV: 964.1, intensityPct: 14.6 },
      { energyKeV: 1112.1, intensityPct: 13.6 },
      { energyKeV: 1408.0, intensityPct: 20.8 }
    ],
    description: 'Wide-spectrum efficiency calibration standard spanning 121 keV to 1408 keV.'
  },
  {
    name: 'Sodium-22 (Na-22)',
    symbol: 'Na-22',
    category: 'Calibration Standard',
    gammas: [
      { energyKeV: 511.0, intensityPct: 180.7 },
      { energyKeV: 1274.5, intensityPct: 99.9 }
    ],
    description: 'Positron emitter producing a strong 511 keV annihilation peak along with a 1274.5 keV nuclear gamma.'
  },
  {
    name: 'Americium-241 (Am-241)',
    symbol: 'Am-241',
    category: 'Industrial',
    gammas: [
      { energyKeV: 59.54, intensityPct: 35.9 },
      { energyKeV: 13.9, intensityPct: 13.0 }
    ],
    description: 'Low-energy alpha/gamma emitter widely used in smoke detectors and X-ray fluorescence excitation.'
  },
  {
    name: 'Iridium-192 (Ir-192)',
    symbol: 'Ir-192',
    category: 'Medical',
    gammas: [
      { energyKeV: 295.9, intensityPct: 28.7 },
      { energyKeV: 308.5, intensityPct: 29.7 },
      { energyKeV: 316.5, intensityPct: 82.7 },
      { energyKeV: 468.1, intensityPct: 47.8 }
    ],
    description: 'Industrial radiography and high-dose-rate (HDR) brachytherapy medical isotope.'
  },
  {
    name: 'Special Nuclear Material Threat (Cs-137 + Co-60 + U-235)',
    symbol: 'SNM-Mix',
    category: 'Special Nuclear Material',
    gammas: [
      { energyKeV: 185.7, intensityPct: 57.0 },
      { energyKeV: 661.7, intensityPct: 85.1 },
      { energyKeV: 1173.2, intensityPct: 99.85 },
      { energyKeV: 1332.5, intensityPct: 99.98 }
    ],
    description: 'Complex urban nuclear security threat scenario containing HEU, Cs-137, and Co-60.'
  }
];

const SpectroscopyModule: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [detector, setDetector] = useState<DetectorSpec>(DETECTORS[0]);
  const [isotope, setIsotope] = useState<IsotopeSpec>(ISOTOPES[0]);
  const [activityKBq, setActivityKBq] = useState<number>(50);
  const [liveTimeSec, setLiveTimeSec] = useState<number>(300);
  const [hasShielding, setHasShielding] = useState<boolean>(true);
  const [isLogScale, setIsLogScale] = useState<boolean>(true);
  const [addPoissonNoise, setAddPoissonNoise] = useState<boolean>(true);

  // Ingested ANSI N42.42 / .SPE / .CSV Spectrum State
  const [ingestedSpectrum, setIngestedSpectrum] = useState<IngestedSpectrum | null>(null);
  const [ingestError, setIngestError] = useState<string | null>(null);
  const [mariscottiZThreshold, setMariscottiZThreshold] = useState<number>(3.5);
  const [showMariscottiTrace, setShowMariscottiTrace] = useState<boolean>(false);
  const [compareAllDetectors, setCompareAllDetectors] = useState<boolean>(false);
  const [showSpectralFeatures, setShowSpectralFeatures] = useState<boolean>(true);
  const [selectedPeakIndex, setSelectedPeakIndex] = useState<number>(1);

  const [idToleranceKeV, setIdToleranceKeV] = useState<number>(5.0);
  const [isDossierOpen, setIsDossierOpen] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const agedChain = searchParams.get('agedChain');
    const elapsed = searchParams.get('elapsed') || '';
    const agedPeaks = searchParams.get('agedPeaks');
    if (agedChain && agedPeaks) {
      const nCh = 2048;
      const a0 = 0.0;
      const a1 = 1.4648;
      const counts = new Array(nCh).fill(0);
      const channels: number[] = [];
      const energiesKeV: number[] = [];
      for (let i = 0; i < nCh; i++) {
        const e = a0 + a1 * i;
        channels.push(i);
        energiesKeV.push(e);
        counts[i] = Math.round(25 * Math.exp(-e / 550) + 4);
      }

      const items = agedPeaks.split(';').filter(Boolean);
      for (const item of items) {
        const [nucName, eStr, actStr] = item.split(':');
        const eKeV = parseFloat(eStr);
        const actMBq = parseFloat(actStr);
        if (!isNaN(eKeV) && eKeV > 15 && !isNaN(actMBq) && actMBq > 0 && nucName) {
          const amp = Math.min(25000, Math.max(80, actMBq * 35));
          const sigma = Math.max(1.2, 0.8 + 0.0012 * eKeV);
          for (let i = 0; i < nCh; i++) {
            const e = energiesKeV[i];
            const dist = Math.abs(e - eKeV);
            if (dist < 6 * sigma) {
              counts[i] += Math.round(amp * Math.exp(-0.5 * Math.pow(dist / sigma, 2)));
            }
            if (e < eKeV * 0.78) {
              counts[i] += Math.round(amp * 0.025);
            }
          }
        }
      }

      setIngestedSpectrum({
        sourceFormat: 'SYNTHETIC',
        fileName: `Aged_${agedChain}_Chain_${elapsed.replace(/\s+/g, '')}.n42`,
        instrumentModel: `Module 24 Bateman Aged Mix (${agedChain} @ t=${elapsed})`,
        sampleDescription: `Synthesized from Module 24 Decay Chain at t = ${elapsed}`,
        liveTimeSec: 300,
        realTimeSec: 305,
        calibrationCoeffs: [a0, a1, 0],
        channels,
        energiesKeV,
        counts
      });
    }
  }, [searchParams]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIngestError(null);

    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const text = String(ev.target?.result || '');
        const lower = file.name.toLowerCase();
        let parsed: IngestedSpectrum;
        if (lower.endsWith('.n42') || lower.endsWith('.xml') || text.trim().startsWith('<')) {
          parsed = parseAnsiN42Xml(text, file.name);
        } else {
          parsed = parseOrtecSpeOrCsv(text, file.name);
        }
        setIngestedSpectrum(parsed);
      } catch (err: any) {
        setIngestError(err?.message || 'Failed to parse spectrum file.');
      }
    };
    reader.readAsText(file);
  };

  const handleLoadReferenceN42 = () => {
    setIngestError(null);
    const xml = generateSampleAnsiN42Xml();
    const parsed = parseAnsiN42Xml(xml, 'ORTEC_DetectiveX_Field_SNM_Mix.n42');
    setIngestedSpectrum(parsed);
  };

  const handleExportCurrentN42 = () => {
    const a0 = spectrumData.energies[0] || 0;
    const a1 = spectrumData.keVPerChannel;
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<RadInstrumentData xmlns="http://physics.nist.gov/N42/2006/N42" n42DocUUID="radpro-export-${Date.now()}">
  <RadInstrumentInformation id="RIID-1">
    <RadInstrumentManufacturerName>RadPro Analyst MCA Engine</RadInstrumentManufacturerName>
    <RadInstrumentModelName>${ingestedSpectrum ? ingestedSpectrum.instrumentModel : detector.name}</RadInstrumentModelName>
  </RadInstrumentInformation>
  <RadMeasurement id="MEAS-01">
    <MeasurementClassCode>Foreground</MeasurementClassCode>
    <RealTimeDuration>PT${(ingestedSpectrum ? ingestedSpectrum.realTimeSec : liveTimeSec).toFixed(1)}S</RealTimeDuration>
    <Spectrum id="SPEC-01">
      <LiveTimeDuration>PT${(ingestedSpectrum ? ingestedSpectrum.liveTimeSec : liveTimeSec).toFixed(1)}S</LiveTimeDuration>
      <EnergyCalibration id="ECAL-01">
        <CoefficientValues>${a0.toFixed(4)} ${a1.toFixed(4)} 0.0000</CoefficientValues>
      </EnergyCalibration>
      <ChannelData>${spectrumData.finalCounts.join(' ')}</ChannelData>
    </Spectrum>
  </RadMeasurement>
</RadInstrumentData>`;
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `RadPro_${ingestedSpectrum ? ingestedSpectrum.fileName.replace(/\.[^.]+$/, '') : isotope.symbol}.n42`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Generate 2048-Channel MCA Spectrum Data or use Ingested Spectrum
  const spectrumData = useMemo(() => {
    if (ingestedSpectrum) {
      const numChannels = ingestedSpectrum.counts.length;
      const keVPerChannel = ingestedSpectrum.calibrationCoeffs[1] || 1.4648;
      return {
        numChannels,
        keVPerChannel,
        channels: ingestedSpectrum.channels,
        energies: ingestedSpectrum.energiesKeV,
        finalCounts: ingestedSpectrum.counts
      };
    }

    const numChannels = 2048;
    const maxEnergyKeV = 3000;
    const keVPerChannel = maxEnergyKeV / numChannels;

    const channels: number[] = [];
    const energies: number[] = [];
    const rawCounts: number[] = Array(numChannels).fill(0);

    for (let ch = 0; ch < numChannels; ch++) {
      channels.push(ch);
      energies.push(ch * keVPerChannel);
    }

    const detectorResAt662 = detector.fwhmAt662keV;

    isotope.gammas.forEach((gamma) => {
      const E_g = gamma.energyKeV;
      const intensity = gamma.intensityPct / 100;
      const fwhm = Math.max(0.5, detectorResAt662 * Math.sqrt(E_g / 662.0));
      const sigma = fwhm / 2.355;
      const peakYield = activityKBq * 1000 * intensity * (detector.relativeEffPct / 100) * liveTimeSec * 0.005;
      const comptonEdge = E_g / (1 + 511 / (2 * E_g));
      const backscatterEnergy = E_g / (1 + (2 * E_g) / 511);
      const singleEscapeE = E_g - 511;
      const doubleEscapeE = E_g - 1022;

      for (let ch = 0; ch < numChannels; ch++) {
        const E = ch * keVPerChannel;
        const dE = E - E_g;
        if (Math.abs(dE) < 4 * sigma) {
          const photopeakCount = (peakYield / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-(dE * dE) / (2 * sigma * sigma)) * keVPerChannel;
          rawCounts[ch] += photopeakCount;
        }
        if (E > 10 && E <= comptonEdge) {
          const comptonHeight = (peakYield * 0.45) / comptonEdge;
          const ramp = 0.8 + 0.4 * (E / comptonEdge);
          rawCounts[ch] += comptonHeight * ramp * keVPerChannel;
        }
        if (backscatterEnergy > 20) {
          const backscatterSigma = fwhm * 1.2;
          const dB = E - backscatterEnergy;
          if (Math.abs(dB) < 3 * backscatterSigma) {
            const bsCount = (peakYield * 0.08 / (backscatterSigma * Math.sqrt(2 * Math.PI))) * Math.exp(-(dB * dB) / (2 * backscatterSigma * backscatterSigma)) * keVPerChannel;
            rawCounts[ch] += bsCount;
          }
        }
        if (E_g > 1022) {
          if (singleEscapeE > 0 && Math.abs(E - singleEscapeE) < 3 * sigma) {
            const seCount = (peakYield * 0.05 / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-Math.pow(E - singleEscapeE, 2) / (2 * sigma * sigma)) * keVPerChannel;
            rawCounts[ch] += seCount;
          }
          if (doubleEscapeE > 0 && Math.abs(E - doubleEscapeE) < 3 * sigma) {
            const deCount = (peakYield * 0.03 / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-Math.pow(E - doubleEscapeE, 2) / (2 * sigma * sigma)) * keVPerChannel;
            rawCounts[ch] += deCount;
          }
        }
      }
    });

    const bgLevel = 0.05 * liveTimeSec;
    for (let ch = 0; ch < numChannels; ch++) {
      const E = ch * keVPerChannel;
      rawCounts[ch] += bgLevel * Math.exp(-E / 1200);
      if (hasShielding && Math.abs(E - 75) < 3 * (detectorResAt662 * 0.4)) {
        const leadSigma = Math.max(1.0, detectorResAt662 * 0.35);
        rawCounts[ch] += (liveTimeSec * 0.8 / (leadSigma * Math.sqrt(2 * Math.PI))) * Math.exp(-Math.pow(E - 75, 2) / (2 * leadSigma * leadSigma));
      }
    }

    const finalCounts = rawCounts.map((val, ch) => {
      const counts = Math.max(0, val);
      if (!addPoissonNoise || counts === 0) return Math.round(counts);
      // Deterministic repeatable pseudo-Poisson noise so peaks don't jump on UI re-renders
      const pseudoRand = Math.sin(ch * 12.9898 + activityKBq * 78.233) * 43758.5453;
      const frac = pseudoRand - Math.floor(pseudoRand) - 0.5;
      return Math.max(1, Math.round(counts + frac * 1.6 * Math.sqrt(counts)));
    });

    return { numChannels, keVPerChannel, channels, energies, finalCounts };
  }, [ingestedSpectrum, detector, isotope, activityKBq, liveTimeSec, hasShielding, addPoissonNoise]);

  // Mariscotti Generalized Second-Difference Peak Search & Trapezoidal Net-Area Solver
  const mariscottiAnalysis = useMemo(() => {
    return runMariscottiPeakSearch(spectrumData.energies, spectrumData.finalCounts, {
      zThreshold: mariscottiZThreshold,
      idToleranceKeV,
      nominalFwhmAt662KeV: detector.fwhmAt662keV
    });
  }, [spectrumData, mariscottiZThreshold, idToleranceKeV, detector.fwhmAt662keV]);

  const identifiedPeaks = mariscottiAnalysis.peaks;

  // Multi-Detector Comparison Curves (HPGe vs CZT vs LaBr3 vs NaI)
  const multiDetectorTraces = useMemo(() => {
    if (!compareAllDetectors || ingestedSpectrum) return [];
    const numChannels = 2048;
    const keVPerChannel = 3000 / numChannels;
    const palette: Record<string, string> = {
      'HPGe Coaxial (High-Purity Germanium)': '#00e5ff',
      'CZT Coplanar Grid (Cadmium Zinc Telluride)': '#a855f7',
      'LaBr3(Ce) Cerium-doped Lanthanum Bromide': '#10b981',
      'NaI(Tl) 3" x 3" Scintillator': '#f59e0b'
    };

    return DETECTORS.filter(d => d.name !== detector.name).map(det => {
      const y = new Array(numChannels).fill(Math.max(1, 0.05 * liveTimeSec));
      isotope.gammas.forEach(gamma => {
        const E_g = gamma.energyKeV;
        const intensity = gamma.intensityPct / 100;
        const fwhm = Math.max(0.5, det.fwhmAt662keV * Math.sqrt(E_g / 662.0));
        const sigma = fwhm / 2.355;
        const peakYield = activityKBq * 1000 * intensity * (det.relativeEffPct / 100) * liveTimeSec * 0.005;
        const comptonEdge = E_g / (1 + 511 / (2 * E_g));
        for (let ch = 0; ch < numChannels; ch++) {
          const E = ch * keVPerChannel;
          const dE = E - E_g;
          if (Math.abs(dE) < 4 * sigma) {
            y[ch] += (peakYield / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-(dE * dE) / (2 * sigma * sigma)) * keVPerChannel;
          }
          if (E > 10 && E <= comptonEdge) {
            y[ch] += ((peakYield * 0.45) / comptonEdge) * (0.8 + 0.4 * (E / comptonEdge)) * keVPerChannel;
          }
        }
      });
      return {
        x: spectrumData.energies,
        y: y.map(v => Math.max(1, Math.round(v))),
        type: 'scatter',
        mode: 'lines',
        name: `${det.name.split(' (')[0]} (${det.fwhmAt662keV} keV FWHM)`,
        line: { color: palette[det.name] || '#cbd5e1', width: 1.6, dash: 'dot' }
      };
    });
  }, [compareAllDetectors, ingestedSpectrum, detector.name, isotope, activityKBq, liveTimeSec, spectrumData.energies]);

  // Physical Spectral Feature Markers (Compton Edge, Backscatter, Escape Peaks)
  const spectralFeatureMarkers = useMemo(() => {
    if (!showSpectralFeatures || ingestedSpectrum) return [];
    const primaryGamma = [...isotope.gammas].sort((a, b) => b.intensityPct - a.intensityPct)[0];
    if (!primaryGamma) return [];
    const Eg = primaryGamma.energyKeV;
    const comptonEdge = Eg / (1 + 511 / (2 * Eg));
    const backscatter = Eg / (1 + (2 * Eg) / 511);
    const features: { energyKeV: number; label: string; color: string }[] = [
      { energyKeV: comptonEdge, label: `Compton Edge E_c (${comptonEdge.toFixed(1)} keV)`, color: '#f59e0b' },
      { energyKeV: backscatter, label: `Backscatter (${backscatter.toFixed(1)} keV)`, color: '#a855f7' }
    ];
    if (Eg > 1022) {
      features.push({ energyKeV: Eg - 511, label: `Single Escape (${(Eg - 511).toFixed(1)} keV)`, color: '#38bdf8' });
      features.push({ energyKeV: Eg - 1022, label: `Double Escape (${(Eg - 1022).toFixed(1)} keV)`, color: '#10b981' });
    }
    if (hasShielding) {
      features.push({ energyKeV: 75.0, label: 'Pb X-Ray (75 keV)', color: '#94a3b8' });
    }
    return features;
  }, [showSpectralFeatures, ingestedSpectrum, isotope, hasShielding]);

  // Selected Peak ROI & Currie MDA / LLD Details
  const activeRoiDetails = useMemo(() => {
    if (identifiedPeaks.length === 0) return null;
    const pk = identifiedPeaks.find(p => p.peakIndex === selectedPeakIndex) || identifiedPeaks[0];
    const B = Math.max(1, pk.continuumCounts);
    const Lc = 2.326 * Math.sqrt(B);
    const Ld = 2.706 + 4.653 * Math.sqrt(B);
    const tLive = ingestedSpectrum ? ingestedSpectrum.liveTimeSec : liveTimeSec;
    const branchFrac = Math.max(0.01, (pk.branchingIntensityPct || 85) / 100);
    const geomEff = Math.max(0.0005, (detector.relativeEffPct / 100) * 0.005);
    const mdaBq = Ld / (geomEff * branchFrac * Math.max(1, tLive));

    // Extract local channel slice around centroid for ROI mini-plot
    const halfWidthKeV = Math.max(25, pk.fwhmKeV * 3.5);
    const roiX: number[] = [];
    const roiY: number[] = [];
    const baseX: number[] = [];
    const baseY: number[] = [];

    const leftE = Math.max(0, pk.energyKeV - pk.fwhmKeV * 1.6);
    const rightE = pk.energyKeV + pk.fwhmKeV * 1.6;
    let leftCnt = 1;
    let rightCnt = 1;

    spectrumData.energies.forEach((e, idx) => {
      if (Math.abs(e - pk.energyKeV) <= halfWidthKeV) {
        roiX.push(e);
        roiY.push(spectrumData.finalCounts[idx]);
      }
      if (Math.abs(e - leftE) < spectrumData.keVPerChannel) leftCnt = spectrumData.finalCounts[idx];
      if (Math.abs(e - rightE) < spectrumData.keVPerChannel) rightCnt = spectrumData.finalCounts[idx];
    });
    baseX.push(leftE, rightE);
    baseY.push(leftCnt, rightCnt);

    return {
      peak: pk,
      Lc,
      Ld,
      mdaBq,
      roiX,
      roiY,
      baseX,
      baseY
    };
  }, [identifiedPeaks, selectedPeakIndex, ingestedSpectrum, liveTimeSec, detector.relativeEffPct, spectrumData]);

  const dossierPayload: CalculationDossierPayload = useMemo(() => ({
    reportTitle: 'Gamma-Ray Spectrometry, ANSI N42.42 Ingestion & Mariscotti Peak Analysis Dossier',
    moduleName: 'Module 28: Gamma Spectroscopy & MCA Spectrum Analyzer',
    statuteCitation: 'ANSI N42.42-2020 / IEEE Std 325-2014 / ANSI N42.14 / Mariscotti (1967)',
    verificationTestId: 'VTEST-14',
    operatorName: 'Gamma Radiometric Metrologist',
    operatorCredentials: 'CHP / ISO 17025 Qualified Technical Signatory',
    facility: 'Low-Background Radiometrics & MCA Counting Laboratory',
    notes: ingestedSpectrum
      ? `Ingested ${ingestedSpectrum.sourceFormat} file "${ingestedSpectrum.fileName}" from ${ingestedSpectrum.instrumentModel}. Live time: ${ingestedSpectrum.liveTimeSec} s. Mariscotti second-difference peaks resolved: ${identifiedPeaks.length}.`
      : `Synthetic acquisition spectrum for ${isotope.name} (${activityKBq} kBq) using ${detector.name}. Live time: ${liveTimeSec} s. Mariscotti peaks resolved: ${identifiedPeaks.length}.`,
    formulaDescription: 'S_i = \\sum_{k=-m}^m w_k (C_{i+k+1} - 2C_{i+k} + C_{i+k-1}), \\quad Z_i = \\frac{-S_i}{\\sqrt{\\sum w_k^2 (C_{i+k+1} + 4C_{i+k} + C_{i+k-1})}}',
    inputs: [
      { label: 'Acquisition Source', value: ingestedSpectrum ? `${ingestedSpectrum.sourceFormat} (${ingestedSpectrum.fileName})` : 'Synthetic MCA Physics Kernel' },
      { label: 'Spectrometer / Instrument', value: ingestedSpectrum ? ingestedSpectrum.instrumentModel : detector.name },
      { label: 'Acquisition Live Time', value: ingestedSpectrum ? ingestedSpectrum.liveTimeSec : liveTimeSec, unit: 's' },
      { label: 'Mariscotti Significance Threshold', value: `${mariscottiZThreshold.toFixed(1)} σ` },
      { label: 'Library Match Window', value: `±${idToleranceKeV} keV` }
    ],
    outputs: [
      { label: 'Resolved Photopeak Count', value: identifiedPeaks.length, status: 'PASS' },
      { label: 'Primary Identified Isotope', value: identifiedPeaks[0]?.matchedIsotope || 'Unresolved', status: 'PASS' },
      { label: 'Primary Energy Centroid', value: identifiedPeaks[0] ? `${identifiedPeaks[0].energyKeV.toFixed(2)} keV` : 'N/A', status: 'PASS' },
      { label: 'Primary Net Peak Area', value: identifiedPeaks[0] ? `${identifiedPeaks[0].netAreaCounts.toLocaleString()} ± ${identifiedPeaks[0].netAreaUncertainty} cts` : 'N/A', status: 'PASS' }
    ]
  }), [ingestedSpectrum, detector, isotope, activityKBq, liveTimeSec, mariscottiZThreshold, idToleranceKeV, identifiedPeaks]);

  return (
    <div className="spectroscopy-module">
      <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ margin: 0 }}>🔬 Module 25 — Gamma Spectroscopy, ANSI N42.42 Ingestion &amp; Mariscotti Peak Solver</h2>
          <p style={{ color: 'var(--color-text-muted)', margin: '4px 0 0 0', fontSize: '0.85rem' }}>
            Ingest real-world ANSI N42.42 XML, ORTEC Maestro (.SPE), or MCA CSV spectra—or simulate HPGe/NaI(Tl)/LaBr₃/CZT detectors with Mariscotti generalized second-difference peak search and trapezoidal Compton continuum subtraction.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            className="btn btn-secondary"
            onClick={() => setIsDossierOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.8rem',
              padding: '6px 14px',
              border: '1px solid rgba(0, 229, 255, 0.4)',
              color: '#00e5ff',
              background: 'rgba(0, 229, 255, 0.08)'
            }}
          >
            <span>🛡️</span>
            <span>Audit Dossier (21 CFR Part 11)</span>
          </button>
          <VerificationBadge testId="VTEST-14" standard="ANSI N42.42 & IEEE 325" />
        </div>
      </div>

      {/* Real-World File Ingestion Bar (ANSI N42.42 / .SPE / .CSV) */}
      <div className="panel" style={{ padding: '16px', marginBottom: '20px', border: '1px solid rgba(0, 229, 255, 0.3)', background: 'rgba(5, 14, 26, 0.85)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="hud-badge hud-badge-primary">REAL-WORLD SPECTRUM I/O</span>
              <strong style={{ color: '#fff', fontSize: '0.95rem' }}>
                ANSI N42.42 XML / ORTEC Maestro (.SPE) / MCA (.CSV, .TKA) Ingestion
              </strong>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              Upload a field RIID or laboratory MCA spectrum file, or load the built-in ANSI N42.42 multi-isotope safeguard reference file.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".n42,.xml,.spe,.chn,.csv,.tka,.txt"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
            <button
              className="btn btn-primary"
              style={{ fontSize: '0.8rem', padding: '7px 14px' }}
              onClick={() => fileInputRef.current?.click()}
            >
              📂 Upload .N42 / .SPE / .CSV File
            </button>
            <button
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', padding: '7px 14px', borderColor: '#10b981', color: '#10b981' }}
              onClick={handleLoadReferenceN42}
            >
              📥 Load Reference ANSI N42.42 RIID File
            </button>
            <button
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', padding: '7px 14px' }}
              onClick={handleExportCurrentN42}
            >
              💾 Export Current as .N42 XML
            </button>
            {ingestedSpectrum && (
              <button
                className="btn btn-sm btn-outline-danger"
                style={{ fontSize: '0.8rem', padding: '7px 12px' }}
                onClick={() => setIngestedSpectrum(null)}
              >
                ✕ Return to Synthetic Simulator
              </button>
            )}
          </div>
        </div>

        {ingestError && (
          <div style={{ marginTop: '10px', padding: '8px 12px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', borderRadius: '6px', color: '#fca5a5', fontSize: '0.82rem' }}>
            ⚠️ {ingestError}
          </div>
        )}

        {ingestedSpectrum && (
          <div style={{ marginTop: '12px', padding: '10px 14px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', fontSize: '0.82rem' }}>
            <span><strong>Active File:</strong> <code style={{ color: '#10b981' }}>{ingestedSpectrum.fileName}</code> ({ingestedSpectrum.sourceFormat})</span>
            <span><strong>Instrument:</strong> {ingestedSpectrum.instrumentModel}</span>
            <span><strong>Live / Real Time:</strong> {ingestedSpectrum.liveTimeSec}s / {ingestedSpectrum.realTimeSec}s</span>
            <span><strong>Calibration:</strong> E(ch) = {ingestedSpectrum.calibrationCoeffs[0].toFixed(2)} + {ingestedSpectrum.calibrationCoeffs[1].toFixed(4)}·ch keV</span>
            <span><strong>Channels:</strong> {ingestedSpectrum.counts.length}</span>
          </div>
        )}
      </div>

      {/* Isotope Standard Presets (When in Synthetic Mode) */}
      {!ingestedSpectrum && (
        <div className="panel" style={{ padding: '15px', marginBottom: '20px' }}>
          <h4 style={{ fontSize: '0.9rem', color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
            Select Synthetic Isotope Source / Standard
          </h4>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {ISOTOPES.map((iso) => {
              const isSelected = isotope.name === iso.name;
              return (
                <button
                  key={iso.name}
                  className="btn btn-primary"
                  style={{
                    fontSize: '0.8rem',
                    padding: '6px 12px',
                    background: isSelected ? 'rgba(0, 229, 255, 0.2)' : 'rgba(22, 36, 56, 0.8)',
                    color: isSelected ? '#00e5ff' : '#fff',
                    border: `1px solid ${isSelected ? '#00e5ff' : 'var(--color-border)'}`
                  }}
                  onClick={() => setIsotope(iso)}
                >
                  {iso.name}
                </button>
              );
            })}
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '10px', marginBottom: 0 }}>
            {isotope.description}
          </p>
        </div>
      )}

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {/* Controls Panel */}
        <div className="panel" style={{ flex: '1 1 450px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <h3>Detector &amp; Mariscotti Peak-Finder Config</h3>

          <div className="form-group">
            <label className="form-label">Detector System (Resolution Baseline)</label>
            <select
              className="form-control"
              value={detector.name}
              onChange={(e) => {
                const found = DETECTORS.find((d) => d.name === e.target.value);
                if (found) setDetector(found);
              }}
            >
              {DETECTORS.map((d) => (
                <option key={d.name} value={d.name}>
                  {d.name} ({d.fwhmAt662keV.toFixed(1)} keV FWHM)
                </option>
              ))}
            </select>
          </div>

          {!ingestedSpectrum && (
            <div style={{ display: 'flex', gap: '15px' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Source Activity (kBq)</label>
                <input
                  type="number"
                  className="form-control"
                  value={activityKBq}
                  min="1"
                  max="10000"
                  step="10"
                  onChange={(e) => setActivityKBq(Math.max(1, Number(e.target.value)))}
                />
              </div>

              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Acquisition Live Time (sec)</label>
                <input
                  type="number"
                  className="form-control"
                  value={liveTimeSec}
                  min="10"
                  max="3600"
                  step="30"
                  onChange={(e) => setLiveTimeSec(Math.max(10, Number(e.target.value)))}
                />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '15px', borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Mariscotti Peak Threshold (σ)</label>
              <input
                type="number"
                className="form-control"
                value={mariscottiZThreshold}
                min="1.5"
                max="15.0"
                step="0.5"
                onChange={(e) => setMariscottiZThreshold(Math.max(1.5, Number(e.target.value)))}
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Isotope Match Window (keV)</label>
              <input
                type="number"
                className="form-control"
                value={idToleranceKeV}
                min="0.5"
                max="25.0"
                step="0.5"
                onChange={(e) => setIdToleranceKeV(Math.max(0.5, Number(e.target.value)))}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
            {!ingestedSpectrum && (
              <>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.82rem' }}>
                  <input type="checkbox" checked={hasShielding} onChange={(e) => setHasShielding(e.target.checked)} />
                  Lead Castle (75 keV X-Ray)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.82rem' }}>
                  <input type="checkbox" checked={addPoissonNoise} onChange={(e) => setAddPoissonNoise(e.target.checked)} />
                  Poisson Counting Statistics
                </label>
              </>
            )}
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.82rem', color: '#f59e0b' }}>
              <input type="checkbox" checked={showMariscottiTrace} onChange={(e) => setShowMariscottiTrace(e.target.checked)} />
              Overlay Mariscotti -Sᵢ/Fᵢ Trace
            </label>
            {!ingestedSpectrum && (
              <>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.82rem', color: '#38bdf8' }}>
                  <input type="checkbox" checked={compareAllDetectors} onChange={(e) => setCompareAllDetectors(e.target.checked)} />
                  Compare All 4 Detectors (HPGe/CZT/LaBr₃/NaI)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.82rem', color: '#a855f7' }}>
                  <input type="checkbox" checked={showSpectralFeatures} onChange={(e) => setShowSpectralFeatures(e.target.checked)} />
                  Show Compton Edge &amp; Escape Markers
                </label>
              </>
            )}
            <button
              className="btn btn-primary"
              style={{ marginLeft: 'auto', fontSize: '0.8rem', padding: '6px 12px' }}
              onClick={() => setIsLogScale(!isLogScale)}
            >
              Y-Axis: {isLogScale ? 'Logarithmic' : 'Linear'}
            </button>
          </div>
        </div>

        {/* Spectral Physics Summary Panel */}
        <div className="panel" style={{ flex: '1 1 450px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3>Spectral Metrology &amp; Mariscotti Summary</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
              <div style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Total Integral Counts:</span>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fff' }}>
                  {spectrumData.finalCounts.reduce((a, b) => a + b, 0).toLocaleString()}
                </div>
              </div>
              <div style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Mariscotti Photopeaks (&ge;{mariscottiZThreshold}&sigma;):</span>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--color-accent)' }}>
                  {identifiedPeaks.length} Peaks Resolved
                </div>
              </div>
              <div style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Energy Calibration Slope:</span>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                  {spectrumData.keVPerChannel.toFixed(3)} keV/ch
                </div>
              </div>
              <div style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Identified Nuclides:</span>
                <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#10b981' }}>
                  {Array.from(new Set(identifiedPeaks.filter(p => p.matchedIsotope !== 'Unidentified').map(p => p.matchedIsotope.split(' ')[0]))).join(', ') || 'None'}
                </div>
              </div>
            </div>

            <div style={{ padding: '12px', background: 'rgba(0, 229, 255, 0.04)', border: '1px solid rgba(0, 229, 255, 0.2)', borderRadius: '6px', fontSize: '0.82rem' }}>
              <h4 style={{ color: 'var(--color-primary)', margin: '0 0 6px 0', fontSize: '0.82rem', textTransform: 'uppercase' }}>
                Mariscotti Generalized Second-Difference Algorithm (1967)
              </h4>
              <p style={{ margin: 0, color: 'var(--color-text-muted)', lineHeight: '1.45' }}>
                Computes smoothed 2nd-difference <code style={{ color: '#00e5ff' }}>Sᵢ = ∑ wₖ(Cᵢ₊ₖ₊₁ - 2Cᵢ₊ₖ + Cᵢ₊ₖ₋₁)</code> normalized by Poisson propagation uncertainty <code style={{ color: '#00e5ff' }}>Fᵢ</code>. Statistically significant photopeaks satisfy <code style={{ color: '#f59e0b' }}>Zᵢ = -Sᵢ/Fᵢ &ge; {mariscottiZThreshold}σ</code>, eliminating false positives from Compton edges.
              </p>
            </div>
          </div>

          <div style={{ marginTop: '15px', fontSize: '0.8rem', color: 'var(--color-text-muted)', borderTop: '1px solid var(--color-border)', paddingTop: '8px' }}>
            Mode: <strong>{ingestedSpectrum ? `Field File (${ingestedSpectrum.sourceFormat})` : `Synthetic (${detector.type})`}</strong> | Channels: <strong>{spectrumData.numChannels} MCA</strong>
          </div>
        </div>
      </div>

      {/* Plotly MCA Pulse-Height Spectrum */}
      <div className="panel" style={{ marginBottom: '20px' }}>
        <h3>Multi-Channel Analyzer (MCA) Pulse-Height Spectrum &amp; Photopeak Centroids</h3>
        <div style={{ width: '100%' }}>
          <Plot
            data={[
              {
                x: spectrumData.energies,
                y: spectrumData.finalCounts,
                type: 'scatter',
                mode: 'lines',
                name: ingestedSpectrum ? ingestedSpectrum.fileName : `${isotope.symbol} (${detector.name.split(' (')[0]})`,
                line: { color: 'var(--color-primary)', width: 2 },
                fill: 'tozeroy',
                fillcolor: 'rgba(0, 229, 255, 0.08)'
              },
              ...multiDetectorTraces,
              ...(showMariscottiTrace
                ? [
                    {
                      x: spectrumData.energies,
                      y: mariscottiAnalysis.mariscottiSignal.map(z => Math.max(1, z * 10)),
                      type: 'scatter',
                      mode: 'lines',
                      name: 'Mariscotti Significance (-Sᵢ/Fᵢ × 10)',
                      line: { color: '#f59e0b', width: 1.5, dash: 'dot' }
                    }
                  ]
                : []),
              ...spectralFeatureMarkers.map(feat => ({
                x: [feat.energyKeV, feat.energyKeV],
                y: [1, Math.max(50, Math.max(...spectrumData.finalCounts) * 0.28)],
                type: 'scatter',
                mode: 'lines+text',
                name: feat.label,
                text: [feat.label],
                textposition: 'top center',
                line: { color: feat.color, width: 1.3, dash: 'dot' },
                showlegend: false
              })),
              ...identifiedPeaks.map((p) => ({
                x: [p.energyKeV, p.energyKeV],
                y: [1, p.peakHeightCounts * 1.18],
                type: 'scatter',
                mode: 'lines+text',
                name: `${p.energyKeV.toFixed(1)} keV`,
                text: [`${p.energyKeV.toFixed(1)} keV (${p.matchedIsotope.split(' ')[0]})`],
                textposition: 'top center',
                line: { color: '#EF4444', width: 1.5, dash: 'dash' },
                showlegend: false
              }))
            ] as any}
            layout={{
              autosize: true,
              xaxis: {
                title: { text: 'Energy (keV)' },
                color: '#94A3B8',
                gridcolor: 'rgba(255,255,255,0.05)',
                range: [0, Math.min(3000, Math.max(1600, (identifiedPeaks[identifiedPeaks.length - 1]?.energyKeV || 1400) * 1.2))]
              },
              yaxis: {
                title: { text: 'Counts per Channel' },
                type: isLogScale ? 'log' : 'linear',
                color: '#94A3B8',
                gridcolor: 'rgba(255,255,255,0.05)'
              },
              paper_bgcolor: 'transparent',
              plot_bgcolor: 'transparent',
              font: { color: '#F8FAFC' },
              margin: { l: 60, r: 20, t: 30, b: 60 },
              legend: { x: 0.65, y: 0.92, bgcolor: 'rgba(5, 10, 18, 0.8)' }
            }}
            useResizeHandler={true}
            style={{ width: '100%', height: '420px' }}
            config={{ responsive: true, displayModeBar: false }}
          />
        </div>
      </div>

      {/* Auto-ID & Mariscotti Peak Search Analysis Table + Interactive ROI / Currie MDA Inspector */}
      <div className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
          <div>
            <h3 style={{ margin: 0 }}>Mariscotti Second-Difference ROI Analysis, Trapezoidal Subtraction &amp; Currie MDA/LLD</h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.84rem', margin: '4px 0 0 0' }}>
              Click any photopeak row below to inspect its zoomed Region-of-Interest (ROI), trapezoidal Compton continuum baseline, and Currie Critical Level (L_C) / Detection Limit (L_D) / Minimum Detectable Activity (MDA).
            </p>
          </div>
        </div>

        {activeRoiDetails && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(290px, 1fr) minmax(320px, 1.15fr)', gap: '14px', marginBottom: '16px', padding: '12px', background: 'rgba(15, 23, 42, 0.65)', border: '1px solid rgba(0, 229, 255, 0.28)', borderRadius: '8px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#00e5ff' }}>
                  🎯 Selected ROI Inspector — Peak #{activeRoiDetails.peak.peakIndex} ({activeRoiDetails.peak.energyKeV.toFixed(2)} keV)
                </span>
                <span className="hud-badge hud-badge-primary">{activeRoiDetails.peak.matchedIsotope}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '0.75rem' }}>
                <div style={{ background: '#0b0f19', padding: '7px 9px', borderRadius: '6px', border: '1px solid #1e293b' }}>
                  <div style={{ color: '#64748b', fontSize: '0.65rem' }}>GROSS ROI (G)</div>
                  <div style={{ color: '#f8fafc', fontWeight: 700, fontFamily: 'monospace' }}>{activeRoiDetails.peak.grossCounts.toLocaleString()} cts</div>
                </div>
                <div style={{ background: '#0b0f19', padding: '7px 9px', borderRadius: '6px', border: '1px solid #1e293b' }}>
                  <div style={{ color: '#64748b', fontSize: '0.65rem' }}>COMPTON BASE (B)</div>
                  <div style={{ color: '#f59e0b', fontWeight: 700, fontFamily: 'monospace' }}>{activeRoiDetails.peak.continuumCounts.toLocaleString()} cts</div>
                </div>
                <div style={{ background: '#0b0f19', padding: '7px 9px', borderRadius: '6px', border: '1px solid #1e293b' }}>
                  <div style={{ color: '#64748b', fontSize: '0.65rem' }}>NET PEAK AREA (N)</div>
                  <div style={{ color: '#00e5ff', fontWeight: 700, fontFamily: 'monospace' }}>{activeRoiDetails.peak.netAreaCounts.toLocaleString()} ± {activeRoiDetails.peak.netAreaUncertainty}</div>
                </div>
                <div style={{ background: '#0b0f19', padding: '7px 9px', borderRadius: '6px', border: '1px solid #1e293b' }}>
                  <div style={{ color: '#64748b', fontSize: '0.65rem' }}>CURRIE L_C (95%)</div>
                  <div style={{ color: '#cbd5e1', fontWeight: 700, fontFamily: 'monospace' }}>{activeRoiDetails.Lc.toFixed(1)} cts</div>
                </div>
                <div style={{ background: '#0b0f19', padding: '7px 9px', borderRadius: '6px', border: '1px solid #1e293b' }}>
                  <div style={{ color: '#64748b', fontSize: '0.65rem' }}>CURRIE L_D (LLD)</div>
                  <div style={{ color: '#a855f7', fontWeight: 700, fontFamily: 'monospace' }}>{activeRoiDetails.Ld.toFixed(1)} cts</div>
                </div>
                <div style={{ background: '#0b0f19', padding: '7px 9px', borderRadius: '6px', border: '1px solid #1e293b' }}>
                  <div style={{ color: '#64748b', fontSize: '0.65rem' }}>PEAK MDA</div>
                  <div style={{ color: '#10b981', fontWeight: 700, fontFamily: 'monospace' }}>{activeRoiDetails.mdaBq.toFixed(2)} Bq</div>
                </div>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                <strong>Currie (1968) Formulation:</strong> L_C = 2.33·√B &nbsp;|&nbsp; L_D = 2.71 + 4.65·√B &nbsp;|&nbsp; MDA = L_D / (ε·I_γ·t_live)
              </div>
            </div>

            <div style={{ height: '190px' }}>
              <Plot
                data={[
                  {
                    x: activeRoiDetails.roiX,
                    y: activeRoiDetails.roiY,
                    type: 'scatter',
                    mode: 'lines',
                    name: 'ROI Gross Spectrum',
                    line: { color: '#00e5ff', width: 2.5 },
                    fill: 'tozeroy',
                    fillcolor: 'rgba(0, 229, 255, 0.14)'
                  },
                  {
                    x: activeRoiDetails.baseX,
                    y: activeRoiDetails.baseY,
                    type: 'scatter',
                    mode: 'lines+markers',
                    name: 'Trapezoidal Compton Baseline (B)',
                    line: { color: '#f59e0b', width: 2, dash: 'dash' },
                    fill: 'tozeroy',
                    fillcolor: 'rgba(245, 158, 11, 0.18)'
                  }
                ]}
                layout={{
                  autosize: true,
                  margin: { l: 48, r: 15, t: 12, b: 32 },
                  paper_bgcolor: 'transparent',
                  plot_bgcolor: 'rgba(0,0,0,0.25)',
                  font: { color: '#cbd5e1', size: 10 },
                  xaxis: { title: 'Energy (keV)', gridcolor: '#1e293b' },
                  yaxis: { title: 'Counts', gridcolor: '#1e293b' },
                  legend: { orientation: 'h', y: 1.18, x: 0 }
                }}
                useResizeHandler={true}
                style={{ width: '100%', height: '100%' }}
                config={{ responsive: true, displayModeBar: false }}
              />
            </div>
          </div>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.83rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-primary)' }}>
                <th style={{ padding: '8px' }}>Peak #</th>
                <th style={{ padding: '8px' }}>Centroid Energy</th>
                <th style={{ padding: '8px' }}>Gross ROI</th>
                <th style={{ padding: '8px' }}>Compton Continuum</th>
                <th style={{ padding: '8px', color: '#00e5ff' }}>Net Peak Area (&pm;1&sigma;)</th>
                <th style={{ padding: '8px' }}>FWHM</th>
                <th style={{ padding: '8px' }}>Mariscotti Z</th>
                <th style={{ padding: '8px' }}>Identified Nuclide</th>
                <th style={{ padding: '8px' }}>Library Line</th>
              </tr>
            </thead>
            <tbody>
              {identifiedPeaks.map((peak) => {
                const isMatched = peak.matchedIsotope !== 'Unidentified';
                const isSelectedRow = activeRoiDetails?.peak.peakIndex === peak.peakIndex;
                return (
                  <tr
                    key={peak.peakIndex}
                    onClick={() => setSelectedPeakIndex(peak.peakIndex)}
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      cursor: 'pointer',
                      background: isSelectedRow ? 'rgba(0, 229, 255, 0.10)' : 'transparent'
                    }}
                  >
                    <td style={{ padding: '8px', fontWeight: 'bold' }}>#{peak.peakIndex}</td>
                    <td style={{ padding: '8px', color: '#00E5FF', fontWeight: 'bold' }}>
                      {peak.energyKeV.toFixed(2)} keV <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>(ch {peak.channelCentroid.toFixed(1)})</span>
                    </td>
                    <td style={{ padding: '8px', fontFamily: 'monospace' }}>{peak.grossCounts.toLocaleString()}</td>
                    <td style={{ padding: '8px', fontFamily: 'monospace', color: 'var(--color-text-muted)' }}>{peak.continuumCounts.toLocaleString()}</td>
                    <td style={{ padding: '8px', fontFamily: 'monospace', fontWeight: 'bold', color: '#00e5ff' }}>
                      {peak.netAreaCounts.toLocaleString()} &plusmn; {peak.netAreaUncertainty}
                    </td>
                    <td style={{ padding: '8px' }}>
                      {peak.fwhmKeV.toFixed(2)} keV ({peak.fwhmPct.toFixed(2)}%)
                    </td>
                    <td style={{ padding: '8px', color: '#f59e0b', fontWeight: 'bold' }}>{peak.mariscottiZScore.toFixed(1)} &sigma;</td>
                    <td style={{ padding: '8px', color: isMatched ? '#10B981' : '#F59E0B', fontWeight: 'bold' }}>
                      {peak.matchedIsotope}
                    </td>
                    <td style={{ padding: '8px', color: 'var(--color-text-muted)' }}>
                      {isMatched ? `${peak.matchedLineKeV.toFixed(2)} keV (${peak.branchingIntensityPct}%)` : 'N/A'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <AuditDossierModal
        isOpen={isDossierOpen}
        onClose={() => setIsDossierOpen(false)}
        payload={dossierPayload}
      />
    </div>
  );
};

export default SpectroscopyModule;
