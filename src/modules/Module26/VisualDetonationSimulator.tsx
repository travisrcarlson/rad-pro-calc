import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

export interface VisualDetonationProps {
  yieldKt: number;
  burstMode: 'surface' | 'air';
  burstAltitudeM: number;
  onYieldChange?: (y: number) => void;
  onBurstModeChange?: (mode: 'surface' | 'air') => void;
}

interface CityPreset {
  id: string;
  name: string;
  country: string;
  lat: number;
  lon: number;
  popDensityPerKm2: number;
}

const CITY_PRESETS: CityPreset[] = [
  { id: 'regina', name: 'Regina, Saskatchewan', country: 'Canada', lat: 50.448906, lon: -104.6108, popDensityPerKm2: 2250 },
  { id: 'nyc', name: 'New York City (Manhattan)', country: 'United States', lat: 40.7128, lon: -74.0060, popDensityPerKm2: 11300 },
  { id: 'dc', name: 'Washington D.C. (The Capitol)', country: 'United States', lat: 38.8899, lon: -77.0090, popDensityPerKm2: 4400 },
  { id: 'london', name: 'London (Westminster)', country: 'United Kingdom', lat: 51.5074, lon: -0.1278, popDensityPerKm2: 5700 },
  { id: 'tokyo', name: 'Tokyo (Shinjuku)', country: 'Japan', lat: 35.6895, lon: 139.6917, popDensityPerKm2: 15400 },
  { id: 'kyiv', name: 'Kyiv (Maidan)', country: 'Ukraine', lat: 50.4501, lon: 30.5234, popDensityPerKm2: 3500 },
  { id: 'hiroshima', name: 'Hiroshima (A-Bomb Dome)', country: 'Japan', lat: 34.3955, lon: 132.4536, popDensityPerKm2: 4200 }
];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
  life: number;
  maxLife: number;
  isEmber: boolean;
}

// Procedural audio synthesizer for nuclear detonation boom and rumbling shockwave
class DetonationSoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    // Lazy initialize upon user gesture
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted && this.ctx && this.ctx.state === 'running') {
      this.ctx.suspend();
    } else if (!muted && this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public playDetonation(yieldKt: number) {
    if (this.isMuted) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.ctx) {
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      const now = this.ctx.currentTime;
      const duration = Math.min(8.0, 2.5 + Math.log10(Math.max(1, yieldKt)) * 1.2);

      // 1. Initial High-Frequency Flash & Pressure Crack
      const crackOsc = this.ctx.createOscillator();
      const crackGain = this.ctx.createGain();
      crackOsc.type = 'triangle';
      crackOsc.frequency.setValueAtTime(140, now);
      crackOsc.frequency.exponentialRampToValueAtTime(35, now + 0.3);
      crackGain.gain.setValueAtTime(0.5, now);
      crackGain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      crackOsc.connect(crackGain);
      crackGain.connect(this.ctx.destination);
      crackOsc.start(now);
      crackOsc.stop(now + 0.45);

      // 2. Deep Sub-Bass Explosive Core (15 Hz to 45 Hz)
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(55, now);
      subOsc.frequency.exponentialRampToValueAtTime(22, now + 1.5);
      subOsc.frequency.exponentialRampToValueAtTime(15, now + duration);

      subGain.gain.setValueAtTime(0.7, now + 0.05);
      subGain.gain.exponentialRampToValueAtTime(0.9, now + 0.35);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      subOsc.connect(subGain);
      subGain.connect(this.ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + duration);

      // 3. Brown Noise Atmospheric Shockwave Reverberation
      const bufferSize = this.ctx.sampleRate * duration;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5; // Boost brown noise volume
      }

      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;

      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'lowpass';
      noiseFilter.frequency.setValueAtTime(120, now);
      noiseFilter.frequency.exponentialRampToValueAtTime(30, now + duration);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.01, now);
      noiseGain.gain.linearRampToValueAtTime(0.8, now + 0.25);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);

      noiseSource.start(now);
      noiseSource.stop(now + duration);
    } catch {
      // AudioContext policy suppression gracefully handled
    }
  }
}

const soundEngine = new DetonationSoundEngine();

export const VisualDetonationSimulator: React.FC<VisualDetonationProps> = ({
  yieldKt,
  burstMode,
  burstAltitudeM,
  onYieldChange,
  onBurstModeChange
}) => {
  // Simulator View Mode: 'profile' (Mushroom Cloud Elevation), 'map' (Outrider Blast Zones), 'split' (Dual)
  const [viewMode, setViewMode] = useState<'profile' | 'map' | 'split'>('profile');

  // Simulation Clock & Animation State
  const [simTimeSeconds, setSimTimeSeconds] = useState<number>(0.0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playSpeed, setPlaySpeed] = useState<number>(1.0);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [flashIntensity, setFlashIntensity] = useState<number>(0.0);

  // Selected City Preset for Casualties
  const [selectedCityId, setSelectedCityId] = useState<string>('regina');

  // Interactive Canvas References
  const profileCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const mapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);

  // Track the selected city
  const currentCity = useMemo(() => {
    return CITY_PRESETS.find(c => c.id === selectedCityId) || CITY_PRESETS[0];
  }, [selectedCityId]);

  // --- GLASSTONE & DOLAN / DEFENSE NUCLEAR AGENCY MUSHROOM CLOUD PHYSICS ---
  const cloudPhysics = useMemo(() => {
    const y = Math.max(0.001, yieldKt);

    // 1. Fireball Maximum Radius (Glasstone & Dolan Eq. 2.110: R ~ 70 * Y^0.38 m)
    const rFireballM = Math.round(70 * Math.pow(y, 0.38));
    const rFireballKm = rFireballM / 1000.0;

    // 2. Cloud Top Height (H_top in km)
    // Low yield (<=20 kt): H_top ~ 10 * Y^0.20 km (15 kt -> 12.0 km)
    // Medium yield (20 - 1000 kt): H_top ~ 12 * (Y / 20)^0.23 km (100 kt -> 16.5 km; 1.2 MT -> 25.5 km)
    // Megaton yield (>1000 kt): H_top ~ 25 * (Y / 1000)^0.22 km (15 MT -> 40 km; 50 MT Tsar -> 64 km)
    let hTopKm = 12.0;
    if (y <= 20) {
      hTopKm = 10.0 * Math.pow(y, 0.20);
    } else if (y <= 1000) {
      hTopKm = 12.0 * Math.pow(y / 20.0, 0.23);
    } else {
      hTopKm = 25.0 * Math.pow(y / 1000.0, 0.22);
    }

    // 3. Cloud Base Height (H_base in km)
    // Base of the mushroom cap is typically 55% - 65% of top height
    const hBaseFraction = Math.max(0.48, Math.min(0.68, 0.62 - 0.04 * Math.log10(Math.max(1, y / 20.0))));
    const hBaseKm = hTopKm * hBaseFraction;

    // 4. Cloud Cap Diameter (D_cap in km)
    // 15 kt -> ~5.5 km; 100 kt -> ~10.5 km; 1.2 MT -> ~22 km; 15 MT -> ~45 km; 50 MT -> ~95 km
    let dCapKm = 5.5;
    if (y <= 20) {
      dCapKm = 5.5 * Math.pow(y / 15.0, 0.35);
    } else {
      dCapKm = 6.0 * Math.pow(y / 20.0, 0.38);
    }

    // 5. Cloud Stem Diameter (D_stem in km)
    const dStemKm = Math.max(0.2, dCapKm * 0.18);

    // 6. Buoyant Ascent Half-Time & Stabilization Time
    const tRiseHalf = Math.max(12, Math.round(25 * Math.pow(y, 0.22))); // seconds to half height
    const tStabilize = Math.max(180, Math.round(240 * Math.pow(y, 0.15))); // ~4-8 minutes

    // 7. Outrider 4-Tier Damage Zones (Exact Kinematic Formulations)
    // Zone 1: Fireball Radius (km)
    const rZone1_FireballKm = rFireballKm;

    // Zone 2: Radiation / Heavy Blast (20 psi) Radius (km)
    // Kinney-Graham 20 psi shockwave contour
    const rZone2_Heavy20psiKm = Math.max(rFireballKm * 1.15, 0.38 * Math.pow(y, 0.33));

    // Zone 3: Moderate Blast (5 psi) Radius (km)
    const rZone3_Mod5psiKm = Math.max(rZone2_Heavy20psiKm * 1.8, 0.95 * Math.pow(y, 0.33));

    // Zone 4: Thermal Radiation (3rd Degree Burns, 10 cal/cm²) Radius (km)
    const rZone4_Thermal3rdKm = Math.max(rZone3_Mod5psiKm * 1.1, 0.82 * Math.pow(y, 0.41));

    return {
      rFireballKm,
      rFireballM,
      hTopKm,
      hBaseKm,
      dCapKm,
      dStemKm,
      tRiseHalf,
      tStabilize,
      rZone1_FireballKm,
      rZone2_Heavy20psiKm,
      rZone3_Mod5psiKm,
      rZone4_Thermal3rdKm
    };
  }, [yieldKt]);

  // --- OUTRIDER CASUALTY & HUMAN IMPACT CALCULATOR ---
  const casualties = useMemo(() => {
    const density = currentCity.popDensityPerKm2;
    const { rZone1_FireballKm, rZone2_Heavy20psiKm, rZone3_Mod5psiKm, rZone4_Thermal3rdKm } = cloudPhysics;

    // Concentric Annulus Areas (km²)
    const areaFireball = Math.PI * rZone1_FireballKm * rZone1_FireballKm;
    const area20psi = Math.PI * rZone2_Heavy20psiKm * rZone2_Heavy20psiKm;
    const area5psi = Math.PI * rZone3_Mod5psiKm * rZone3_Mod5psiKm;
    const areaThermal = Math.PI * rZone4_Thermal3rdKm * rZone4_Thermal3rdKm;

    // 100% fatalities in 20 psi zone
    const fatZone2 = area20psi * density * 0.98;
    // 50% fatalities, 40% injuries in 5 psi to 20 psi annulus
    const annulus5psi = Math.max(0, area5psi - area20psi);
    const fatZone3 = annulus5psi * density * 0.50;
    const injZone3 = annulus5psi * density * 0.40;

    // 15% fatalities (incendiary firestorms), 55% injuries in thermal annulus
    const annulusThermal = Math.max(0, areaThermal - area5psi);
    const fatZone4 = annulusThermal * density * 0.15;
    const injZone4 = annulusThermal * density * 0.55;

    const totalFatalities = Math.round(fatZone2 + fatZone3 + fatZone4);
    const totalInjuries = Math.round(injZone3 + injZone4);
    const totalImpactAreaKm2 = Math.round(areaThermal);
    const totalImpactAreaSqMi = Math.round(areaThermal * 0.386102);

    return {
      totalFatalities,
      totalInjuries,
      totalImpactAreaKm2,
      totalImpactAreaSqMi,
      areaFireball: areaFireball.toFixed(2),
      area20psi: area20psi.toFixed(2),
      area5psi: area5psi.toFixed(2),
      areaThermal: areaThermal.toFixed(2)
    };
  }, [cloudPhysics, currentCity]);

  // --- TRIGGER DETONATION EVENT ---
  const triggerDetonation = useCallback(() => {
    setSimTimeSeconds(0.0);
    setIsPlaying(true);
    setFlashIntensity(1.0);
    particlesRef.current = [];
    soundEngine.playDetonation(yieldKt);
  }, [yieldKt]);

  // Toggle Mute Audio
  const toggleMute = () => {
    const nextMuted = !isAudioMuted;
    setIsAudioMuted(nextMuted);
    soundEngine.setMuted(nextMuted);
  };

  // --- SIMULATION TICK LOOP ---
  useEffect(() => {
    let active = true;

    const tick = (now: number) => {
      if (!lastTimestampRef.current) lastTimestampRef.current = now;
      const deltaSec = (now - lastTimestampRef.current) / 1000.0;
      lastTimestampRef.current = now;

      if (isPlaying && active) {
        setSimTimeSeconds((prev) => {
          const next = prev + deltaSec * playSpeed;
          return Math.min(600, next); // cap at 10 minutes
        });

        // Flash decay
        setFlashIntensity((prev) => Math.max(0, prev - deltaSec * 1.8));
      }

      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      active = false;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      lastTimestampRef.current = null;
    };
  }, [isPlaying, playSpeed]);

  // Trigger on initial mount
  useEffect(() => {
    triggerDetonation();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- CANVAS 1: ATMOSPHERIC PROFILE & MUSHROOM CLOUD ELEVATION SIMULATOR ---
  useEffect(() => {
    const canvas = profileCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Viewport altitude range: 0 km to max(40 km, hTopKm * 1.35)
    const maxAltKm = Math.max(35, Math.ceil((cloudPhysics.hTopKm * 1.25) / 10) * 10);
    const groundY = height - 50; // 50px for ground terrain

    const kmToY = (altKm: number) => {
      const frac = altKm / maxAltKm;
      return groundY - frac * (groundY - 30);
    };

    const kmToPixelsX = (distKm: number) => {
      // Map horizontal width relative to cap diameter
      const visibleWidthKm = Math.max(cloudPhysics.dCapKm * 2.8, 30);
      return (distKm / visibleWidthKm) * (width * 0.85);
    };

    // 1. Clear & Atmospheric Gradient
    const skyGradient = ctx.createLinearGradient(0, 0, 0, groundY);
    skyGradient.addColorStop(0.0, '#020307'); // Deep Space / Mesosphere
    skyGradient.addColorStop(0.35, '#050c1e'); // Upper Stratosphere
    skyGradient.addColorStop(0.65, '#0d1d3a'); // Lower Stratosphere / Ozone
    skyGradient.addColorStop(0.85, '#132a4e'); // Tropopause
    skyGradient.addColorStop(1.0, '#1c3d6d'); // Troposphere
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, width, height);

    // 2. Stars in Upper Stratosphere / Mesosphere
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    for (let s = 0; s < 40; s++) {
      const starX = (s * 83.17) % width;
      const starY = (s * 37.49) % (groundY * 0.45);
      ctx.fillRect(starX, starY, 1.2, 1.2);
    }

    // 3. Atmospheric Layer Boundaries & Dashed Lines
    const tropopauseY = kmToY(12.0);
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.25)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(70, tropopauseY);
    ctx.lineTo(width - 20, tropopauseY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(0, 229, 255, 0.6)';
    ctx.font = '10px Inter, sans-serif';
    ctx.fillText('TROPOPAUSE INVERSION BOUNDARY (12 km)', 80, tropopauseY - 5);

    if (maxAltKm >= 50) {
      const stratopauseY = kmToY(50.0);
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.2)';
      ctx.setLineDash([3, 5]);
      ctx.beginPath();
      ctx.moveTo(70, stratopauseY);
      ctx.lineTo(width - 20, stratopauseY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(245, 158, 11, 0.6)';
      ctx.fillText('STRATOPAUSE (50 km)', 80, stratopauseY - 5);
    }

    // 4. Ground Terrain & Horizon
    const groundGrad = ctx.createLinearGradient(0, groundY, 0, height);
    groundGrad.addColorStop(0.0, '#101720');
    groundGrad.addColorStop(1.0, '#060a0f');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, groundY, width, height - groundY);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(width, groundY);
    ctx.stroke();

    // 5. Left Altitude Scale (Ruler)
    ctx.fillStyle = 'rgba(148, 163, 184, 0.8)';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'right';
    const altStep = maxAltKm >= 60 ? 10 : 5;
    for (let alt = 0; alt <= maxAltKm; alt += altStep) {
      const yPos = kmToY(alt);
      ctx.fillText(`${alt} km`, 50, yPos + 3);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.beginPath();
      ctx.moveTo(54, yPos);
      ctx.lineTo(60, yPos);
      ctx.stroke();
    }
    ctx.textAlign = 'left';

    // 6. Height Reference Landmarks (Mt Everest, Airliner, Burj Khalifa)
    // Burj Khalifa (0.83 km)
    const burjY = kmToY(0.83);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.fillRect(80, burjY, 2, groundY - burjY);
    ctx.fillText('Burj Khalifa (828m)', 85, burjY + 10);

    // Mt. Everest (8.85 km)
    const everestY = kmToY(8.85);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.beginPath();
    ctx.moveTo(75, groundY);
    ctx.lineTo(105, everestY);
    ctx.lineTo(135, groundY);
    ctx.closePath();
    ctx.fillStyle = 'rgba(100, 116, 139, 0.25)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillText('▲ Mt. Everest (8.85 km)', 110, everestY + 5);

    // Commercial Airliner (11 km)
    const planeY = kmToY(11.0);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.7)';
    ctx.fillText('✈ Commercial Airliner (11 km)', 85, planeY - 4);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.moveTo(85, planeY);
    ctx.lineTo(240, planeY);
    ctx.stroke();
    ctx.setLineDash([]);

    // 7. DETONATION & MUSHROOM CLOUD PHYSICS SIMULATION
    const centerX = width * 0.58;
    const t = simTimeSeconds;

    // Growth progression formulas
    const { hTopKm, hBaseKm, dCapKm, dStemKm, rFireballKm, tRiseHalf } = cloudPhysics;

    // Fractional heights at time t
    const currentGrowth = t / (t + tRiseHalf); // 0.0 to 1.0 smooth sigmoidal
    const currentTopKm = Math.max(rFireballKm * 1.5, hTopKm * currentGrowth);
    const currentBaseKm = Math.max(rFireballKm * 0.5, hBaseKm * Math.pow(currentGrowth, 1.2));
    const currentCapWidthKm = Math.max(rFireballKm * 2.0, dCapKm * Math.pow(currentGrowth, 0.8));
    const currentStemWidthKm = Math.max(rFireballKm * 0.6, dStemKm * Math.pow(currentGrowth, 0.6));

    const topY = kmToY(currentTopKm);
    const baseY = kmToY(currentBaseKm);
    const capWidthPx = kmToPixelsX(currentCapWidthKm);
    const stemWidthPx = kmToPixelsX(currentStemWidthKm);

    // Initial Flash & Fireball Phase (t < 4.0s)
    if (t < 4.0) {
      const fbFrac = Math.min(1.0, t / 1.5);
      const fbRadPx = kmToPixelsX(rFireballKm * fbFrac * 1.2);
      const fbY = burstMode === 'air' ? kmToY(burstAltitudeM / 1000.0) : groundY;

      const fbGrad = ctx.createRadialGradient(centerX, fbY, 0, centerX, fbY, fbRadPx);
      fbGrad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
      fbGrad.addColorStop(0.25, 'rgba(254, 240, 138, 0.95)');
      fbGrad.addColorStop(0.55, 'rgba(249, 115, 22, 0.85)');
      fbGrad.addColorStop(0.85, 'rgba(239, 68, 68, 0.6)');
      fbGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');

      ctx.fillStyle = fbGrad;
      ctx.beginPath();
      ctx.arc(centerX, fbY, fbRadPx, 0, Math.PI * 2);
      ctx.fill();

      // Expanding Shockwave Ring (Supersonic Wavefront)
      const shockSpeedKmS = 1.2; // hypersonic early shock speed
      const shockRadiusPx = kmToPixelsX(t * shockSpeedKmS * 4.0);
      ctx.strokeStyle = `rgba(255, 255, 255, ${Math.max(0, 0.8 - t * 0.2)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(centerX, fbY, shockRadiusPx, 0, Math.PI * 2);
      ctx.stroke();

      // Wilson Cloud Condensation Ring
      if (t > 0.4 && t < 2.5) {
        ctx.strokeStyle = `rgba(224, 242, 254, ${0.45 * (1 - t / 2.5)})`;
        ctx.lineWidth = 12;
        ctx.beginPath();
        ctx.arc(centerX, fbY, shockRadiusPx * 0.92, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Mushroom Cloud Construction (t >= 0.8s)
    if (t >= 0.8) {
      const cloudAlpha = Math.min(1.0, (t - 0.8) / 1.5);

      // A. Suction Debris Stem (from ground zero upward into cap base)
      const stemGrad = ctx.createLinearGradient(centerX - stemWidthPx / 2, 0, centerX + stemWidthPx / 2, 0);
      if (burstMode === 'surface') {
        // Surface burst: dark brown/charred radioactive pulverized earth
        stemGrad.addColorStop(0.0, `rgba(40, 25, 20, ${0.75 * cloudAlpha})`);
        stemGrad.addColorStop(0.3, `rgba(75, 50, 40, ${0.88 * cloudAlpha})`);
        stemGrad.addColorStop(0.5, `rgba(180, 80, 30, ${0.85 * cloudAlpha})`); // glowing core updraft
        stemGrad.addColorStop(0.7, `rgba(75, 50, 40, ${0.88 * cloudAlpha})`);
        stemGrad.addColorStop(1.0, `rgba(40, 25, 20, ${0.75 * cloudAlpha})`);
      } else {
        // Air burst: cleaner, lighter condensed water vapor and smoke
        stemGrad.addColorStop(0.0, `rgba(70, 75, 85, ${0.6 * cloudAlpha})`);
        stemGrad.addColorStop(0.5, `rgba(120, 125, 140, ${0.8 * cloudAlpha})`);
        stemGrad.addColorStop(1.0, `rgba(70, 75, 85, ${0.6 * cloudAlpha})`);
      }

      ctx.fillStyle = stemGrad;
      ctx.beginPath();
      // Flared base suction column
      ctx.moveTo(centerX - stemWidthPx * 0.9, groundY);
      ctx.quadraticCurveTo(centerX - stemWidthPx * 0.45, (groundY + baseY) / 2, centerX - stemWidthPx * 0.5, baseY + 10);
      ctx.lineTo(centerX + stemWidthPx * 0.5, baseY + 10);
      ctx.quadraticCurveTo(centerX + stemWidthPx * 0.45, (groundY + baseY) / 2, centerX + stemWidthPx * 0.9, groundY);
      ctx.closePath();
      ctx.fill();

      // B. Ground Debris Base Surge Skirt (for surface bursts)
      if (burstMode === 'surface') {
        const surgeRadiusPx = stemWidthPx * 1.8;
        const surgeGrad = ctx.createRadialGradient(centerX, groundY, 0, centerX, groundY, surgeRadiusPx);
        surgeGrad.addColorStop(0.0, `rgba(90, 60, 45, ${0.8 * cloudAlpha})`);
        surgeGrad.addColorStop(0.7, `rgba(50, 35, 25, ${0.5 * cloudAlpha})`);
        surgeGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = surgeGrad;
        ctx.beginPath();
        ctx.ellipse(centerX, groundY, surgeRadiusPx, surgeRadiusPx * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // C. Toroidal Mushroom Cap (The Anvil / Vortex Head)
      // Cap height spans between baseY and topY
      const capCenterY = (topY + baseY) / 2;
      const capRadiusY = Math.max(15, (baseY - topY) / 2);
      const capRadiusX = Math.max(25, capWidthPx / 2);

      // Core incandescent thermal glow inside the torus
      if (t < 120) {
        const fireAlpha = Math.max(0, 1.0 - t / 90.0);
        const coreFireGrad = ctx.createRadialGradient(centerX, capCenterY, 0, centerX, capCenterY, capRadiusX * 0.65);
        coreFireGrad.addColorStop(0.0, `rgba(255, 245, 200, ${fireAlpha * 0.95})`);
        coreFireGrad.addColorStop(0.35, `rgba(249, 115, 22, ${fireAlpha * 0.85})`);
        coreFireGrad.addColorStop(0.75, `rgba(185, 28, 28, ${fireAlpha * 0.5})`);
        coreFireGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = coreFireGrad;
        ctx.beginPath();
        ctx.ellipse(centerX, capCenterY, capRadiusX * 0.7, capRadiusY * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Outer Toroidal Smoke Anvil
      const capGrad = ctx.createRadialGradient(centerX, capCenterY - capRadiusY * 0.2, capRadiusX * 0.2, centerX, capCenterY, capRadiusX);
      capGrad.addColorStop(0.0, `rgba(140, 145, 155, ${0.9 * cloudAlpha})`);
      capGrad.addColorStop(0.5, `rgba(90, 95, 105, ${0.92 * cloudAlpha})`);
      capGrad.addColorStop(0.85, `rgba(50, 55, 65, ${0.95 * cloudAlpha})`);
      capGrad.addColorStop(1.0, `rgba(30, 32, 38, ${0.85 * cloudAlpha})`);

      ctx.fillStyle = capGrad;
      ctx.beginPath();
      // Anvil profile: flattened top, rounded billowing lobes
      ctx.ellipse(centerX, capCenterY, capRadiusX, capRadiusY, 0, 0, Math.PI * 2);
      ctx.fill();

      // Billowing lateral edge lobes (Toroidal Roll)
      const leftLobeX = centerX - capRadiusX * 0.65;
      const rightLobeX = centerX + capRadiusX * 0.65;
      const lobeRadius = capRadiusY * 0.75;

      ctx.fillStyle = `rgba(70, 75, 85, ${0.8 * cloudAlpha})`;
      ctx.beginPath();
      ctx.arc(leftLobeX, capCenterY + capRadiusY * 0.1, lobeRadius, 0, Math.PI * 2);
      ctx.arc(rightLobeX, capCenterY + capRadiusY * 0.1, lobeRadius, 0, Math.PI * 2);
      ctx.fill();

      // Top flattening anvil shelf
      ctx.fillStyle = `rgba(180, 185, 195, ${0.5 * cloudAlpha})`;
      ctx.beginPath();
      ctx.ellipse(centerX, topY + 5, capRadiusX * 0.95, capRadiusY * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 8. Dynamic Swirling Smoke & Ember Particles
    if (particlesRef.current.length < 180 && t > 0.5) {
      for (let p = 0; p < 4; p++) {
        const isEmber = Math.random() < 0.25 && t < 60;
        particlesRef.current.push({
          x: centerX + (Math.random() - 0.5) * stemWidthPx * 0.8,
          y: groundY - Math.random() * 20,
          vx: (Math.random() - 0.5) * 1.5,
          vy: - (1.5 + Math.random() * 3.5),
          size: isEmber ? 1.5 + Math.random() * 2 : 4 + Math.random() * 8,
          opacity: 0.9,
          color: isEmber ? '#ffedd5' : '#475569',
          life: 0,
          maxLife: 60 + Math.random() * 80,
          isEmber
        });
      }
    }

    // Update & draw particles
    const aliveParticles: Particle[] = [];
    particlesRef.current.forEach((part) => {
      part.life++;
      part.x += part.vx;
      part.y += part.vy;
      part.opacity = Math.max(0, 1 - part.life / part.maxLife);

      // Convective updraft toward cap, then roll outward
      if (part.y < baseY && part.y > topY) {
        part.vx += part.x < centerX ? -0.05 : 0.05; // Toroidal outward roll
      }

      ctx.fillStyle = part.isEmber
        ? `rgba(254, 215, 170, ${part.opacity})`
        : `rgba(71, 85, 105, ${part.opacity * 0.5})`;
      ctx.beginPath();
      ctx.arc(part.x, part.y, part.size, 0, Math.PI * 2);
      ctx.fill();

      if (part.life < part.maxLife && part.y > topY - 30) {
        aliveParticles.push(part);
      }
    });
    particlesRef.current = aliveParticles;

    // 9. Dimension Annotation Arrows & Callouts
    if (t >= 2.0) {
      // Top Height Arrow
      const arrowX = centerX + capWidthPx / 2 + 35;
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(arrowX, groundY);
      ctx.lineTo(arrowX, topY);
      ctx.stroke();

      // Top arrowhead
      ctx.fillStyle = '#00e5ff';
      ctx.beginPath();
      ctx.moveTo(arrowX - 4, topY + 8);
      ctx.lineTo(arrowX + 4, topY + 8);
      ctx.lineTo(arrowX, topY);
      ctx.closePath();
      ctx.fill();

      // Dimension Label
      ctx.font = 'bold 11px JetBrains Mono, monospace';
      ctx.fillText(`Cloud Top: ${currentTopKm.toFixed(1)} km`, arrowX + 8, (groundY + topY) / 2);
      ctx.font = '10px Inter, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillText(`Cap Width: ${currentCapWidthKm.toFixed(1)} km`, arrowX + 8, (groundY + topY) / 2 + 14);
    }

    // 10. Blinding Flash Overlay
    if (flashIntensity > 0.01) {
      ctx.fillStyle = `rgba(255, 255, 255, ${flashIntensity})`;
      ctx.fillRect(0, 0, width, height);
    }
  }, [simTimeSeconds, cloudPhysics, flashIntensity, burstMode, burstAltitudeM]);

  // --- CANVAS 2: OUTRIDER-STYLE GEOSPATIAL BLAST DAMAGE MAP ---
  useEffect(() => {
    const canvas = mapCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    const {
      rZone1_FireballKm,
      rZone2_Heavy20psiKm,
      rZone3_Mod5psiKm,
      rZone4_Thermal3rdKm
    } = cloudPhysics;

    // Viewport scale: fit 1.35x of outermost zone
    const maxRadarKm = Math.max(rZone4_Thermal3rdKm * 1.35, 5.0);
    const kmToMapPx = (km: number) => (km / maxRadarKm) * (Math.min(width, height) * 0.45);

    // 1. Dark Map Background & Grid
    ctx.fillStyle = '#070b12';
    ctx.fillRect(0, 0, width, height);

    // Concentric Range Rings & Compass Grids
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.lineWidth = 1;
    const gridSteps = 4;
    for (let g = 1; g <= gridSteps; g++) {
      const rKm = (maxRadarKm / gridSteps) * g;
      const rPx = kmToMapPx(rKm);
      ctx.beginPath();
      ctx.arc(centerX, centerY, rPx, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
      ctx.font = '9px JetBrains Mono, monospace';
      ctx.fillText(`${rKm.toFixed(1)} km`, centerX + 4, centerY - rPx + 11);
    }

    // Crosshairs
    ctx.beginPath();
    ctx.moveTo(centerX, 15);
    ctx.lineTo(centerX, height - 15);
    ctx.moveTo(15, centerY);
    ctx.lineTo(width - 15, centerY);
    ctx.stroke();

    // 2. OUTRIDER 4-TIER GLOWING CONCENTRIC DAMAGE ZONES
    // Zone 4: Thermal Radiation (3rd Degree Burns) - Cyan / Violet / Soft Amber
    const rZ4Px = kmToMapPx(rZone4_Thermal3rdKm);
    const gradZ4 = ctx.createRadialGradient(centerX, centerY, kmToMapPx(rZone3_Mod5psiKm), centerX, centerY, rZ4Px);
    gradZ4.addColorStop(0.0, 'rgba(245, 158, 11, 0.12)');
    gradZ4.addColorStop(1.0, 'rgba(245, 158, 11, 0.28)');
    ctx.fillStyle = gradZ4;
    ctx.beginPath();
    ctx.arc(centerX, centerY, rZ4Px, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Zone 3: Moderate Blast (5 psi) - Amber Orange
    const rZ3Px = kmToMapPx(rZone3_Mod5psiKm);
    const gradZ3 = ctx.createRadialGradient(centerX, centerY, kmToMapPx(rZone2_Heavy20psiKm), centerX, centerY, rZ3Px);
    gradZ3.addColorStop(0.0, 'rgba(249, 115, 22, 0.22)');
    gradZ3.addColorStop(1.0, 'rgba(249, 115, 22, 0.42)');
    ctx.fillStyle = gradZ3;
    ctx.beginPath();
    ctx.arc(centerX, centerY, rZ3Px, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Zone 2: Heavy Blast & Prompt Radiation (20 psi) - Crimson Red
    const rZ2Px = kmToMapPx(rZone2_Heavy20psiKm);
    const gradZ2 = ctx.createRadialGradient(centerX, centerY, kmToMapPx(rZone1_FireballKm), centerX, centerY, rZ2Px);
    gradZ2.addColorStop(0.0, 'rgba(239, 68, 68, 0.35)');
    gradZ2.addColorStop(1.0, 'rgba(239, 68, 68, 0.55)');
    ctx.fillStyle = gradZ2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, rZ2Px, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Zone 1: Fireball Core - Incandescent Gold / Bright Orange
    const rZ1Px = kmToMapPx(rZone1_FireballKm);
    const gradZ1 = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, rZ1Px);
    gradZ1.addColorStop(0.0, 'rgba(255, 255, 255, 0.98)');
    gradZ1.addColorStop(0.4, 'rgba(254, 240, 138, 0.95)');
    gradZ1.addColorStop(0.8, 'rgba(245, 158, 11, 0.9)');
    gradZ1.addColorStop(1.0, 'rgba(220, 38, 38, 0.85)');
    ctx.fillStyle = gradZ1;
    ctx.beginPath();
    ctx.arc(centerX, centerY, rZ1Px, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 3. Real-Time Propagating Shockwave Wavefront Circle
    // Speed of sound c0 ~ 0.343 km/s
    const shockDistKm = simTimeSeconds * 0.343;
    if (shockDistKm <= maxRadarKm) {
      const shockWavePx = kmToMapPx(shockDistKm);
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.85)';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(centerX, centerY, shockWavePx, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0; // reset
    }

    // 4. Ground Zero Marker Pin
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
    ctx.fill();

    // City & Coordinates Label Overlay
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.fillText(`📍 ${currentCity.name}, ${currentCity.country}`, 20, 30);
    ctx.fillStyle = 'rgba(148, 163, 184, 0.8)';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillText(`${currentCity.lat.toFixed(4)}° N, ${Math.abs(currentCity.lon).toFixed(4)}° W | Urban Density: ${currentCity.popDensityPerKm2.toLocaleString()} / km²`, 20, 46);
  }, [simTimeSeconds, cloudPhysics, currentCity]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Top Interactive Toolbar & Presets Bar */}
      <div className="panel" style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem' }}>🌋</span>
            <div>
              <strong style={{ fontSize: '0.95rem', color: '#fff' }}>Outrider Detonation &amp; Mushroom Cloud Simulator</strong>
              <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
                Atmospheric cloud profile, toroidal vortex ascent, supersonic Wilson ring, and 4-tier damage footprints
              </div>
            </div>
          </div>

          {/* Quick Yield Presets & Burst Mode Toggles */}
          {onYieldChange && (
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Quick Yield:</span>
              {[
                { label: '15 kT', y: 15 },
                { label: '100 kT', y: 100 },
                { label: '300 kT', y: 300 },
                { label: '1.2 MT', y: 1200 },
                { label: '15 MT', y: 15000 },
                { label: '50 MT', y: 50000 }
              ].map((opt) => (
                <button
                  key={opt.y}
                  type="button"
                  className="btn"
                  onClick={() => {
                    onYieldChange(opt.y);
                    triggerDetonation();
                  }}
                  style={{
                    padding: '3px 8px',
                    fontSize: '0.72rem',
                    background: Math.abs(yieldKt - opt.y) < 0.1 ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255,255,255,0.05)',
                    color: Math.abs(yieldKt - opt.y) < 0.1 ? '#f87171' : '#94a3b8',
                    border: Math.abs(yieldKt - opt.y) < 0.1 ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '4px'
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {onBurstModeChange && (
            <button
              type="button"
              className="btn"
              onClick={() => {
                onBurstModeChange(burstMode === 'air' ? 'surface' : 'air');
                triggerDetonation();
              }}
              style={{
                padding: '3px 10px',
                fontSize: '0.72rem',
                background: burstMode === 'air' ? 'rgba(0, 229, 255, 0.2)' : 'rgba(249, 115, 22, 0.2)',
                color: burstMode === 'air' ? '#00e5ff' : '#f97316',
                border: `1px solid ${burstMode === 'air' ? '#00e5ff' : '#f97316'}`,
                borderRadius: '4px'
              }}
            >
              {burstMode === 'air' ? '☁️ Air Burst' : '🌋 Surface Burst'}
            </button>
          )}
        </div>

        {/* View Mode Switcher */}
        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.4)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', padding: '2px' }}>
          <button
            type="button"
            className="btn"
            onClick={() => setViewMode('profile')}
            style={{
              padding: '6px 14px',
              fontSize: '0.78rem',
              fontWeight: viewMode === 'profile' ? 700 : 500,
              background: viewMode === 'profile' ? 'rgba(0, 229, 255, 0.2)' : 'transparent',
              color: viewMode === 'profile' ? '#00e5ff' : 'var(--color-text-muted)',
              border: 'none',
              borderRadius: '4px'
            }}
          >
            ☁️ Cloud Profile (Elevation)
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => setViewMode('map')}
            style={{
              padding: '6px 14px',
              fontSize: '0.78rem',
              fontWeight: viewMode === 'map' ? 700 : 500,
              background: viewMode === 'map' ? 'rgba(249, 115, 22, 0.2)' : 'transparent',
              color: viewMode === 'map' ? '#f97316' : 'var(--color-text-muted)',
              border: 'none',
              borderRadius: '4px'
            }}
          >
            🗺️ Blast Footprint (Outrider Map)
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => setViewMode('split')}
            style={{
              padding: '6px 14px',
              fontSize: '0.78rem',
              fontWeight: viewMode === 'split' ? 700 : 500,
              background: viewMode === 'split' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
              color: viewMode === 'split' ? '#10b981' : 'var(--color-text-muted)',
              border: 'none',
              borderRadius: '4px'
            }}
          >
            🔲 Dual View
          </button>
        </div>
      </div>

      {/* Main Visual Display Stage */}
      <div style={{ display: 'grid', gridTemplateColumns: viewMode === 'split' ? '1fr 1fr' : '1fr', gap: '14px' }}>
        {/* VIEW 1: Atmospheric Mushroom Cloud Profile Canvas */}
        {(viewMode === 'profile' || viewMode === 'split') && (
          <div className="panel" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 6px' }}>
              <span style={{ fontSize: '0.8rem', color: '#38bdf8', fontWeight: 600 }}>
                Atmospheric Elevation Cross-Section (0–{Math.max(35, Math.ceil((cloudPhysics.hTopKm * 1.25) / 10) * 10)} km)
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                T½ Rise: {cloudPhysics.tRiseHalf}s | Stabilize: {(cloudPhysics.tStabilize / 60).toFixed(1)}m
              </span>
            </div>
            <div style={{ position: 'relative', width: '100%', height: '420px', borderRadius: '8px', overflow: 'hidden' }}>
              <canvas
                ref={profileCanvasRef}
                width={700}
                height={420}
                style={{ width: '100%', height: '100%', display: 'block', background: '#020307' }}
              />
            </div>
          </div>
        )}

        {/* VIEW 2: Outrider-Style Blast Footprint Radar Map Canvas */}
        {(viewMode === 'map' || viewMode === 'split') && (
          <div className="panel" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 6px', flexWrap: 'wrap', gap: '6px' }}>
              <span style={{ fontSize: '0.8rem', color: '#f97316', fontWeight: 600 }}>
                Outrider 4-Tier Detonation Damage Footprint &amp; Casualties
              </span>
              <select
                className="form-control"
                value={selectedCityId}
                onChange={(e) => setSelectedCityId(e.target.value)}
                style={{ fontSize: '0.76rem', padding: '3px 8px', maxWidth: '210px' }}
              >
                {CITY_PRESETS.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name} ({city.country})
                  </option>
                ))}
              </select>
            </div>
            <div style={{ position: 'relative', width: '100%', height: '420px', borderRadius: '8px', overflow: 'hidden' }}>
              <canvas
                ref={mapCanvasRef}
                width={700}
                height={420}
                style={{ width: '100%', height: '100%', display: 'block', background: '#070b12' }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Detonation Control Room & Timeline Scrubber Bar */}
      <div className="panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          {/* Big Detonate Action Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={triggerDetonation}
              style={{
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                borderColor: '#ef4444',
                color: '#fff',
                fontSize: '0.9rem',
                fontWeight: 700,
                padding: '8px 20px',
                boxShadow: '0 0 15px rgba(239, 68, 68, 0.4)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>🔴 DETONATE WEAPON</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsPlaying(!isPlaying)}
              style={{ padding: '8px 14px', fontSize: '0.82rem' }}
            >
              {isPlaying ? '⏸ Pause' : '▶ Play'}
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setSimTimeSeconds(0.0)}
              style={{ padding: '8px 14px', fontSize: '0.82rem' }}
            >
              🔄 Reset
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={toggleMute}
              style={{ padding: '8px 14px', fontSize: '0.82rem' }}
              title={isAudioMuted ? 'Unmute Sound Effects' : 'Mute Sound Effects'}
            >
              {isAudioMuted ? '🔇 Audio Off' : '🔊 Sound FX Active'}
            </button>
          </div>

          {/* Time & Speed Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontVariantNumeric: 'tabular-nums', fontFamily: 'JetBrains Mono, monospace', fontSize: '1.1rem', color: '#00e5ff', fontWeight: 'bold' }}>
              T+ {simTimeSeconds.toFixed(1)}s <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>({(simTimeSeconds / 60).toFixed(2)} min)</span>
            </div>

            <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.3)', borderRadius: '5px', padding: '2px' }}>
              {[0.5, 1.0, 2.0, 5.0].map((spd) => (
                <button
                  key={spd}
                  type="button"
                  className="btn"
                  onClick={() => setPlaySpeed(spd)}
                  style={{
                    padding: '3px 8px',
                    fontSize: '0.72rem',
                    background: playSpeed === spd ? 'rgba(0, 229, 255, 0.25)' : 'transparent',
                    color: playSpeed === spd ? '#00e5ff' : 'var(--color-text-muted)',
                    border: 'none',
                    borderRadius: '3px'
                  }}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Timeline Scrubber Slider */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
            <span>0.0s (Detonation Flash)</span>
            <span>15s (Initial Fireball Roll)</span>
            <span>1 min (Toroidal Cap Anvil)</span>
            <span>5 min (Stabilized Cloud)</span>
            <span>10 min (Final Cloud Dimensions)</span>
          </div>
          <input
            type="range"
            min="0"
            max="600"
            step="0.5"
            value={simTimeSeconds}
            onChange={(e) => setSimTimeSeconds(parseFloat(e.target.value))}
            style={{ width: '100%', cursor: 'pointer', accentColor: '#00e5ff' }}
          />
        </div>
      </div>

      {/* Outrider 4-Tier Interactive Damage Breakdown & Physical Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
        {/* Tier 1: Fireball */}
        <div style={{ background: 'rgba(254, 240, 138, 0.06)', border: '1px solid #fef08a', borderRadius: '8px', padding: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ color: '#fef08a', fontSize: '0.86rem' }}>1. FIREBALL CORE</strong>
            <span className="badge" style={{ background: 'rgba(254, 240, 138, 0.2)', color: '#fef08a' }}>Vaporization</span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fef08a', marginTop: '6px' }}>
            {cloudPhysics.rFireballM} m <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>radius</span>
          </div>
          <div style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Diameter: {(cloudPhysics.rFireballKm * 2).toFixed(2)} km | Area: {casualties.areaFireball} km²
          </div>
          <p style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', marginTop: '8px', lineHeight: 1.4 }}>
            Temperatures reach tens of millions of degrees at ground zero. All structures, soil, and human bodies are instantaneously vaporized.
          </p>
        </div>

        {/* Tier 2: Heavy Blast (20 psi) & Radiation */}
        <div style={{ background: 'rgba(239, 68, 68, 0.06)', border: '1px solid #ef4444', borderRadius: '8px', padding: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ color: '#ef4444', fontSize: '0.86rem' }}>2. HEAVY BLAST (20 PSI)</strong>
            <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}>100% Fatal</span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ef4444', marginTop: '6px' }}>
            {cloudPhysics.rZone2_Heavy20psiKm.toFixed(2)} km <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>radius</span>
          </div>
          <div style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Area: {casualties.area20psi} km² | Wind: &gt;500 mph
          </div>
          <p style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', marginTop: '8px', lineHeight: 1.4 }}>
            Heavy reinforced concrete buildings are pulverized. Prompt ionizing radiation exceeds 500 rem (5 Gy), guaranteeing 100% human mortality.
          </p>
        </div>

        {/* Tier 3: Moderate Blast (5 psi) */}
        <div style={{ background: 'rgba(249, 115, 22, 0.06)', border: '1px solid #f97316', borderRadius: '8px', padding: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ color: '#f97316', fontSize: '0.86rem' }}>3. MODERATE BLAST (5 PSI)</strong>
            <span className="badge" style={{ background: 'rgba(249, 115, 22, 0.2)', color: '#f97316' }}>Widespread</span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f97316', marginTop: '6px' }}>
            {cloudPhysics.rZone3_Mod5psiKm.toFixed(2)} km <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>radius</span>
          </div>
          <div style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Area: {casualties.area5psi} km² | Wind: 160 mph
          </div>
          <p style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', marginTop: '8px', lineHeight: 1.4 }}>
            Most residential and commercial structures collapse completely. Extreme debris-induced fatalities and widespread injuries.
          </p>
        </div>

        {/* Tier 4: Thermal Radiation (3rd Degree Burns) */}
        <div style={{ background: 'rgba(245, 158, 11, 0.06)', border: '1px solid #f59e0b', borderRadius: '8px', padding: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ color: '#f59e0b', fontSize: '0.86rem' }}>4. THERMAL (3RD BURNS)</strong>
            <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b' }}>Incendiary</span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f59e0b', marginTop: '6px' }}>
            {cloudPhysics.rZone4_Thermal3rdKm.toFixed(2)} km <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>radius</span>
          </div>
          <div style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Area: {casualties.areaThermal} km² | Fluence: 10 cal/cm²
          </div>
          <p style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', marginTop: '8px', lineHeight: 1.4 }}>
            Full-thickness 3rd degree burns to all exposed skin. Flammable timber, curtains, and plastics ignite, forming city-scale firestorms.
          </p>
        </div>
      </div>

      {/* Human Casualties & Impact Summary (Outrider Style) */}
      <div className="panel" style={{ padding: '16px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <h4 style={{ margin: '0 0 10px 0', color: '#fff', fontSize: '0.92rem' }}>
          Casualty Projections for {currentCity.name} ({yieldKt >= 1000 ? `${(yieldKt / 1000).toFixed(2)} MT` : `${yieldKt} kT`} {burstMode} burst)
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '6px', borderLeft: '3px solid #ef4444' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>ESTIMATED FATALITIES</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#f87171' }}>
              {casualties.totalFatalities.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Instant / prompt deaths</div>
          </div>

          <div style={{ background: 'rgba(249, 115, 22, 0.1)', padding: '12px', borderRadius: '6px', borderLeft: '3px solid #f97316' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>ESTIMATED INJURIES</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#fb923c' }}>
              {casualties.totalInjuries.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Severe trauma &amp; burns</div>
          </div>

          <div style={{ background: 'rgba(0, 229, 255, 0.1)', padding: '12px', borderRadius: '6px', borderLeft: '3px solid #00e5ff' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>TOTAL IMPACT AREA</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#38bdf8' }}>
              {casualties.totalImpactAreaKm2.toLocaleString()} km²
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>~{casualties.totalImpactAreaSqMi.toLocaleString()} sq miles</div>
          </div>

          <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '6px', borderLeft: '3px solid #10b981' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>CLOUD TOP ALTITUDE</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#34d399' }}>
              {cloudPhysics.hTopKm.toFixed(1)} km
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{(cloudPhysics.hTopKm * 3280.84).toLocaleString()} ft ASL</div>
          </div>
        </div>
      </div>
    </div>
  );
};
