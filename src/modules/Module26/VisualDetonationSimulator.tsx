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

export type OutriderEffectType = 'fireball' | 'radiation' | 'shockwave' | 'thermal';

interface SmokeLobe {
  relX: number; // -1 to 1 across cap width
  relY: number; // -1 to 1 across cap height
  baseRadius: number; // relative size
  phase: number;
  speed: number;
  vortexRadius: number;
  layer: 'back' | 'core' | 'front';
}

// Procedural audio synthesizer for nuclear detonation boom and rumbling shockwave
class DetonationSoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

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
      const duration = Math.min(9.0, 2.5 + Math.log10(Math.max(1, yieldKt)) * 1.4);

      // 1. Initial Shock Wavefront Crack
      const crackOsc = this.ctx.createOscillator();
      const crackGain = this.ctx.createGain();
      crackOsc.type = 'sawtooth';
      crackOsc.frequency.setValueAtTime(160, now);
      crackOsc.frequency.exponentialRampToValueAtTime(30, now + 0.35);
      crackGain.gain.setValueAtTime(0.6, now);
      crackGain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
      crackOsc.connect(crackGain);
      crackGain.connect(this.ctx.destination);
      crackOsc.start(now);
      crackOsc.stop(now + 0.5);

      // 2. Heavy Sub-Bass Core Rumble (15 Hz to 45 Hz)
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(60, now);
      subOsc.frequency.exponentialRampToValueAtTime(24, now + 1.8);
      subOsc.frequency.exponentialRampToValueAtTime(15, now + duration);

      subGain.gain.setValueAtTime(0.75, now + 0.05);
      subGain.gain.exponentialRampToValueAtTime(0.95, now + 0.4);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      subOsc.connect(subGain);
      subGain.connect(this.ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + duration);

      // 3. Brown-Noise Convective Atmospheric Rumbling
      const bufferSize = this.ctx.sampleRate * duration;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = output[i];
        output[i] *= 3.8;
      }

      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;

      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'lowpass';
      noiseFilter.frequency.setValueAtTime(140, now);
      noiseFilter.frequency.exponentialRampToValueAtTime(35, now + duration);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.01, now);
      noiseGain.gain.linearRampToValueAtTime(0.85, now + 0.3);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);

      noiseSource.start(now);
      noiseSource.stop(now + duration);
    } catch {
      // Audio suppression handled
    }
  }
}

const soundEngine = new DetonationSoundEngine();

// Cache for loaded CartoDB Dark Matter map tiles
const tileImageCache = new Map<string, HTMLImageElement>();

export const VisualDetonationSimulator: React.FC<VisualDetonationProps> = ({
  yieldKt,
  burstMode,
  burstAltitudeM,
  onYieldChange,
  onBurstModeChange
}) => {
  // Simulator View Mode: 'profile' (Mushroom Cloud Elevation), 'map' (Outrider Blast Zones), 'split' (Dual)
  const [viewMode, setViewMode] = useState<'profile' | 'map' | 'split'>('profile');

  // Selected Effect for Outrider Card Inspection
  const [selectedEffect, setSelectedEffect] = useState<OutriderEffectType | null>(null);

  // Unit of Measurement: Imperial (miles/ft) vs Metric (km/m)
  const [unitMode, setUnitMode] = useState<'imperial' | 'metric'>('imperial');

  // Simulation Clock & Animation State
  const [simTimeSeconds, setSimTimeSeconds] = useState<number>(0.0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playSpeed, setPlaySpeed] = useState<number>(1.0);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [flashIntensity, setFlashIntensity] = useState<number>(0.0);
  const [shakeIntensity, setShakeIntensity] = useState<number>(0.0);

  // Selected City Preset for Casualties & Map Center
  const [selectedCityId, setSelectedCityId] = useState<string>('regina');

  // Canvas References
  const profileCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const mapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);

  // Current City
  const currentCity = useMemo(() => {
    return CITY_PRESETS.find(c => c.id === selectedCityId) || CITY_PRESETS[0];
  }, [selectedCityId]);

  // --- GLASSTONE & DOLAN / DEFENSE NUCLEAR AGENCY MUSHROOM CLOUD PHYSICS ---
  const cloudPhysics = useMemo(() => {
    const y = Math.max(0.001, yieldKt);

    // 1. Fireball Maximum Radius (Glasstone & Dolan Eq. 2.110: R ~ 70 * Y^0.38 m)
    const rFireballM = Math.round(70 * Math.pow(y, 0.38));
    const rFireballKm = rFireballM / 1000.0;
    const rFireballMiles = rFireballKm * 0.621371;

    // 2. Cloud Top Height (H_top in km)
    let hTopKm = 12.0;
    if (y <= 20) {
      hTopKm = 10.0 * Math.pow(y, 0.20);
    } else if (y <= 1000) {
      hTopKm = 12.0 * Math.pow(y / 20.0, 0.23);
    } else {
      hTopKm = 25.0 * Math.pow(y / 1000.0, 0.22);
    }
    const hTopMiles = hTopKm * 0.621371;
    const hTopFeet = hTopKm * 3280.84;

    // 3. Cloud Base Height (H_base in km)
    const hBaseFraction = Math.max(0.48, Math.min(0.68, 0.62 - 0.04 * Math.log10(Math.max(1, y / 20.0))));
    const hBaseKm = hTopKm * hBaseFraction;
    const hBaseMiles = hBaseKm * 0.621371;

    // 4. Cloud Cap Diameter (D_cap in km)
    let dCapKm = 5.5;
    if (y <= 20) {
      dCapKm = 5.5 * Math.pow(y / 15.0, 0.35);
    } else {
      dCapKm = 6.0 * Math.pow(y / 20.0, 0.38);
    }
    const dCapMiles = dCapKm * 0.621371;

    // 5. Cloud Stem Diameter (D_stem in km)
    const dStemKm = Math.max(0.25, dCapKm * 0.20);
    const dStemMiles = dStemKm * 0.621371;

    // 6. Buoyant Ascent Half-Time & Stabilization Time
    const tRiseHalf = Math.max(14, Math.round(28 * Math.pow(y, 0.22))); // seconds to half height
    const tStabilize = Math.max(180, Math.round(240 * Math.pow(y, 0.15))); // ~4-8 minutes

    // 7. Outrider 4-Tier Damage Zones (Exact Kinematic Formulations)
    // Zone 1: Fireball Radius
    const rZone1_FireballKm = rFireballKm;
    const rZone1_FireballMiles = rFireballMiles;

    // Zone 2: Radiation / Heavy Blast (20 psi) Radius
    const rZone2_Heavy20psiKm = Math.max(rFireballKm * 1.15, 0.38 * Math.pow(y, 0.33));
    const rZone2_Heavy20psiMiles = rZone2_Heavy20psiKm * 0.621371;

    // Zone 3: Moderate Blast (5 psi) Radius
    const rZone3_Mod5psiKm = Math.max(rZone2_Heavy20psiKm * 1.8, 0.95 * Math.pow(y, 0.33));
    const rZone3_Mod5psiMiles = rZone3_Mod5psiKm * 0.621371;

    // Zone 4: Thermal Radiation (3rd Degree Burns) Radius
    const rZone4_Thermal3rdKm = Math.max(rZone3_Mod5psiKm * 1.1, 0.82 * Math.pow(y, 0.41));
    const rZone4_Thermal3rdMiles = rZone4_Thermal3rdKm * 0.621371;

    return {
      rFireballKm,
      rFireballM,
      rFireballMiles,
      hTopKm,
      hTopMiles,
      hTopFeet,
      hBaseKm,
      hBaseMiles,
      dCapKm,
      dCapMiles,
      dStemKm,
      dStemMiles,
      tRiseHalf,
      tStabilize,
      rZone1_FireballKm,
      rZone1_FireballMiles,
      rZone2_Heavy20psiKm,
      rZone2_Heavy20psiMiles,
      rZone3_Mod5psiKm,
      rZone3_Mod5psiMiles,
      rZone4_Thermal3rdKm,
      rZone4_Thermal3rdMiles
    };
  }, [yieldKt]);

  // --- OUTRIDER CASUALTY & HUMAN IMPACT CALCULATOR ---
  const casualties = useMemo(() => {
    const density = currentCity.popDensityPerKm2;
    const { rZone1_FireballKm, rZone2_Heavy20psiKm, rZone3_Mod5psiKm, rZone4_Thermal3rdKm } = cloudPhysics;

    const areaFireballKm2 = Math.PI * rZone1_FireballKm * rZone1_FireballKm;
    const area20psiKm2 = Math.PI * rZone2_Heavy20psiKm * rZone2_Heavy20psiKm;
    const area5psiKm2 = Math.PI * rZone3_Mod5psiKm * rZone3_Mod5psiKm;
    const areaThermalKm2 = Math.PI * rZone4_Thermal3rdKm * rZone4_Thermal3rdKm;

    const fatZone2 = area20psiKm2 * density * 0.98;
    const annulus5psi = Math.max(0, area5psiKm2 - area20psiKm2);
    const fatZone3 = annulus5psi * density * 0.50;
    const injZone3 = annulus5psi * density * 0.40;

    const annulusThermal = Math.max(0, areaThermalKm2 - area5psiKm2);
    const fatZone4 = annulusThermal * density * 0.15;
    const injZone4 = annulusThermal * density * 0.55;

    const totalFatalities = Math.round(fatZone2 + fatZone3 + fatZone4);
    const totalInjuries = Math.round(injZone3 + injZone4);
    const totalImpactAreaKm2 = Math.round(areaThermalKm2);
    const totalImpactAreaSqMi = Math.round(areaThermalKm2 * 0.386102);

    return {
      totalFatalities,
      totalInjuries,
      totalImpactAreaKm2,
      totalImpactAreaSqMi,
      areaFireballKm2: areaFireballKm2.toFixed(2),
      areaFireballSqMi: (areaFireballKm2 * 0.386102).toFixed(2),
      area20psiKm2: area20psiKm2.toFixed(2),
      area20psiSqMi: (area20psiKm2 * 0.386102).toFixed(2),
      area5psiKm2: area5psiKm2.toFixed(2),
      area5psiSqMi: (area5psiKm2 * 0.386102).toFixed(2),
      areaThermalKm2: areaThermalKm2.toFixed(2),
      areaThermalSqMi: (areaThermalKm2 * 0.386102).toFixed(2),
      fatalitiesRadiation: Math.round(fatZone2),
      fatalitiesBlast: Math.round(fatZone3),
      injuriesBlast: Math.round(injZone3),
      fatalitiesThermal: Math.round(fatZone4),
      injuriesThermal: Math.round(injZone4)
    };
  }, [cloudPhysics, currentCity]);

  // Pre-generate Volumetric Smoke Lobes for Organic Mushroom Cap
  const smokeLobes = useMemo<SmokeLobe[]>(() => {
    const lobes: SmokeLobe[] = [];
    const count = 75;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const dist = Math.sqrt(Math.random()) * 0.95;
      const relX = Math.cos(angle) * dist;
      // Flatten the top of the anvil
      const relY = Math.sin(angle) * dist * 0.55;
      const baseRadius = 0.18 + Math.random() * 0.16;
      const phase = Math.random() * Math.PI * 2;
      const speed = 0.4 + Math.random() * 0.8;
      const layer = Math.abs(relX) > 0.65 ? 'front' : (relY > 0 ? 'core' : 'back');

      lobes.push({
        relX,
        relY,
        baseRadius,
        phase,
        speed,
        vortexRadius: dist,
        layer
      });
    }
    return lobes;
  }, []);

  // --- TRIGGER DETONATION EVENT ---
  const triggerDetonation = useCallback(() => {
    setSimTimeSeconds(0.0);
    setIsPlaying(true);
    setFlashIntensity(1.0);
    setShakeIntensity(1.0);
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
          return Math.min(600, next);
        });

        // Flash and camera shake decay
        setFlashIntensity((prev) => Math.max(0, prev - deltaSec * 1.6));
        setShakeIntensity((prev) => Math.max(0, prev - deltaSec * 1.2));
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

  // Initial detonation trigger
  useEffect(() => {
    triggerDetonation();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- PRELOAD CARTO-DB DARK MAP TILES FOR SELECTED CITY ---
  useEffect(() => {
    const { rZone4_Thermal3rdKm } = cloudPhysics;
    // Choose appropriate zoom level so the thermal zone fits nicely on canvas
    let zoom = 11;
    if (rZone4_Thermal3rdKm < 2.5) zoom = 13;
    else if (rZone4_Thermal3rdKm < 6.0) zoom = 12;
    else if (rZone4_Thermal3rdKm < 15.0) zoom = 11;
    else if (rZone4_Thermal3rdKm < 35.0) zoom = 10;
    else if (rZone4_Thermal3rdKm < 80.0) zoom = 9;
    else zoom = 8;

    const n = Math.pow(2, zoom);
    const centerTileX = Math.floor(((currentCity.lon + 180.0) / 360.0) * n);
    const latRad = (currentCity.lat * Math.PI) / 180.0;
    const centerTileY = Math.floor(
      ((1.0 - Math.log(Math.tan(latRad) + 1.0 / Math.cos(latRad)) / Math.PI) / 2.0) * n
    );

    // Preload a 5x5 grid of surrounding map tiles
    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        const tx = centerTileX + dx;
        const ty = centerTileY + dy;
        const tileKey = `${zoom}/${tx}/${ty}`;
        if (!tileImageCache.has(tileKey)) {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = `https://basemaps.cartocdn.com/dark_all/${zoom}/${tx}/${ty}.png`;
          img.onload = () => {
            tileImageCache.set(tileKey, img);
          };
          tileImageCache.set(tileKey, img);
        }
      }
    }
  }, [currentCity, cloudPhysics]);

  // --- CANVAS 1: VOLUMETRIC ATMOSPHERIC PROFILE & MUSHROOM CLOUD SIMULATOR ---
  useEffect(() => {
    const canvas = profileCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Viewport altitude range: 0 km to max(40 km, hTopKm * 1.35)
    const maxAltKm = Math.max(35, Math.ceil((cloudPhysics.hTopKm * 1.3) / 10) * 10);
    const groundY = height - 55;

    const kmToY = (altKm: number) => {
      const frac = altKm / maxAltKm;
      return groundY - frac * (groundY - 35);
    };

    const kmToPixelsX = (distKm: number) => {
      const visibleWidthKm = Math.max(cloudPhysics.dCapKm * 3.2, 35);
      return (distKm / visibleWidthKm) * (width * 0.82);
    };

    // Camera Shake Offset during detonation
    let shakeX = 0, shakeY = 0;
    if (shakeIntensity > 0.01) {
      shakeX = (Math.random() - 0.5) * 8 * shakeIntensity;
      shakeY = (Math.random() - 0.5) * 8 * shakeIntensity;
    }

    ctx.save();
    ctx.translate(shakeX, shakeY);

    // 1. Atmospheric Sky Gradient
    const skyGradient = ctx.createLinearGradient(0, 0, 0, groundY);
    skyGradient.addColorStop(0.0, '#020307'); // Deep Space / Mesosphere
    skyGradient.addColorStop(0.35, '#050b18'); // Upper Stratosphere
    skyGradient.addColorStop(0.65, '#0c1a32'); // Stratospheric Ozone
    skyGradient.addColorStop(0.85, '#13284a'); // Tropopause Inversion
    skyGradient.addColorStop(1.0, '#1a3a66'); // Troposphere Twilight
    ctx.fillStyle = skyGradient;
    ctx.fillRect(-20, -20, width + 40, height + 40);

    // 2. High-Altitude Stars
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    for (let s = 0; s < 50; s++) {
      const sx = (s * 79.19) % width;
      const sy = (s * 31.41) % (groundY * 0.4);
      ctx.fillRect(sx, sy, 1.2, 1.2);
    }

    // 3. Atmospheric Boundary Markings
    const tropopauseY = kmToY(12.0);
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.22)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(65, tropopauseY);
    ctx.lineTo(width - 20, tropopauseY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(0, 229, 255, 0.65)';
    ctx.font = '10px Inter, sans-serif';
    ctx.fillText('TROPOPAUSE BOUNDARY (12 km / 39,000 ft)', 75, tropopauseY - 5);

    if (maxAltKm >= 50) {
      const stratopauseY = kmToY(50.0);
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.2)';
      ctx.setLineDash([3, 5]);
      ctx.beginPath();
      ctx.moveTo(65, stratopauseY);
      ctx.lineTo(width - 20, stratopauseY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(245, 158, 11, 0.65)';
      ctx.fillText('STRATOPAUSE (50 km / 164,000 ft)', 75, stratopauseY - 5);
    }

    // 4. Distant Mountain Silhouette Ranges
    ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    for (let mx = 0; mx <= width; mx += 30) {
      const my = groundY - 10 - Math.sin(mx * 0.015) * 8 - Math.cos(mx * 0.04) * 6;
      ctx.lineTo(mx, my);
    }
    ctx.lineTo(width, groundY);
    ctx.closePath();
    ctx.fill();

    // 5. Ground Line & Terrain
    const groundGrad = ctx.createLinearGradient(0, groundY, 0, height);
    groundGrad.addColorStop(0.0, '#0f172a');
    groundGrad.addColorStop(1.0, '#020617');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(-20, groundY, width + 40, height - groundY + 40);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(width, groundY);
    ctx.stroke();

    // 6. Left Altitude Ruler
    ctx.fillStyle = 'rgba(148, 163, 184, 0.75)';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'right';
    const altStep = maxAltKm >= 60 ? 10 : 5;
    for (let alt = 0; alt <= maxAltKm; alt += altStep) {
      const yPos = kmToY(alt);
      const label = unitMode === 'imperial'
        ? `${Math.round(alt * 0.621371)} mi`
        : `${alt} km`;
      ctx.fillText(label, 52, yPos + 3);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.beginPath();
      ctx.moveTo(56, yPos);
      ctx.lineTo(62, yPos);
      ctx.stroke();
    }
    ctx.textAlign = 'left';

    // 7. REALISTIC LANDMARK SILHOUETTES
    // A. Burj Khalifa (828 m)
    const burjY = kmToY(0.83);
    const burjX = 72;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillRect(burjX, burjY + 12, 3, groundY - burjY - 12);
    ctx.fillRect(burjX - 1, burjY + 22, 5, groundY - burjY - 22);
    // Spire
    ctx.fillRect(burjX + 1, burjY, 1, 12);
    ctx.font = '9px Inter, sans-serif';
    ctx.fillText('Burj Khalifa (828m)', burjX + 7, burjY + 12);

    // B. Mt. Everest (8.85 km) with Snowy Ridge Crags
    const everestY = kmToY(8.85);
    const everestX = 110;
    ctx.beginPath();
    ctx.moveTo(everestX - 35, groundY);
    ctx.lineTo(everestX - 8, everestY + 15);
    ctx.lineTo(everestX, everestY);
    ctx.lineTo(everestX + 12, everestY + 22);
    ctx.lineTo(everestX + 40, groundY);
    ctx.closePath();
    ctx.fillStyle = 'rgba(71, 85, 105, 0.45)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.6)';
    ctx.stroke();

    // Snow Cap on Everest
    ctx.beginPath();
    ctx.moveTo(everestX - 12, everestY + 25);
    ctx.lineTo(everestX, everestY);
    ctx.lineTo(everestX + 10, everestY + 20);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = '10px Inter, sans-serif';
    ctx.fillText('▲ Mt. Everest (8.85 km / 29,032 ft)', everestX - 15, everestY - 5);

    // C. Commercial Jetliner (11 km) with Contrail
    const planeY = kmToY(11.0);
    const planeX = 120;
    // Contrail
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(planeX - 50, planeY);
    ctx.lineTo(planeX, planeY);
    ctx.stroke();

    // Airplane Silhouette
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(planeX + 10, planeY); // nose
    ctx.lineTo(planeX + 2, planeY - 1.5);
    ctx.lineTo(planeX - 2, planeY - 6); // wing top
    ctx.lineTo(planeX - 4, planeY - 1.5);
    ctx.lineTo(planeX - 10, planeY - 1);
    ctx.lineTo(planeX - 14, planeY - 4); // tail fin
    ctx.lineTo(planeX - 14, planeY);
    ctx.lineTo(planeX - 4, planeY + 1.5);
    ctx.lineTo(planeX - 2, planeY + 6); // wing bottom
    ctx.lineTo(planeX + 2, planeY + 1.5);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(56, 189, 248, 0.85)';
    ctx.font = '10px Inter, sans-serif';
    ctx.fillText('✈ Airliner Cruising (11 km / 36,000 ft)', planeX + 18, planeY + 3);

    // D. SR-71 Blackbird / U-2 Spyplane (24 km)
    if (maxAltKm >= 30) {
      const spyY = kmToY(24.0);
      const spyX = 160;
      ctx.fillStyle = '#a855f7';
      ctx.beginPath();
      ctx.moveTo(spyX + 8, spyY);
      ctx.lineTo(spyX - 4, spyY - 4);
      ctx.lineTo(spyX - 10, spyY);
      ctx.lineTo(spyX - 4, spyY + 4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(168, 85, 247, 0.8)';
      ctx.fillText('⚡ SR-71 Blackbird (24 km / 80,000 ft)', spyX + 14, spyY + 3);
    }

    // 8. NUCLEAR DETONATION & MUSHROOM CLOUD PHYSICS SIMULATION
    const centerX = width * 0.58;
    const t = simTimeSeconds;
    const { hTopKm, hBaseKm, dCapKm, dStemKm, rFireballKm, tRiseHalf } = cloudPhysics;

    // Fractional heights & dimensions
    const currentGrowth = t / (t + tRiseHalf);
    const currentTopKm = Math.max(rFireballKm * 1.4, hTopKm * currentGrowth);
    const currentBaseKm = Math.max(rFireballKm * 0.5, hBaseKm * Math.pow(currentGrowth, 1.25));
    const currentCapWidthKm = Math.max(rFireballKm * 1.8, dCapKm * Math.pow(currentGrowth, 0.8));
    const currentStemWidthKm = Math.max(rFireballKm * 0.5, dStemKm * Math.pow(currentGrowth, 0.6));

    const topY = kmToY(currentTopKm);
    const baseY = kmToY(currentBaseKm);
    const capWidthPx = kmToPixelsX(currentCapWidthKm);
    const stemWidthPx = kmToPixelsX(currentStemWidthKm);

    // Initial Flash & Fireball Phase (t < 4.0s)
    if (t < 4.0) {
      const fbFrac = Math.min(1.0, t / 1.5);
      const fbRadPx = kmToPixelsX(rFireballKm * fbFrac * 1.25);
      const fbY = burstMode === 'air' ? kmToY(burstAltitudeM / 1000.0) : groundY;

      const fbGrad = ctx.createRadialGradient(centerX, fbY, 0, centerX, fbY, fbRadPx);
      fbGrad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
      fbGrad.addColorStop(0.2, 'rgba(254, 240, 138, 0.98)');
      fbGrad.addColorStop(0.5, 'rgba(249, 115, 22, 0.9)');
      fbGrad.addColorStop(0.85, 'rgba(239, 68, 68, 0.7)');
      fbGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');

      ctx.fillStyle = fbGrad;
      ctx.beginPath();
      ctx.arc(centerX, fbY, fbRadPx, 0, Math.PI * 2);
      ctx.fill();

      // Supersonic Shockwave Ring
      const shockSpeedKmS = 1.3;
      const shockRadiusPx = kmToPixelsX(t * shockSpeedKmS * 4.2);
      ctx.strokeStyle = `rgba(255, 255, 255, ${Math.max(0, 0.85 - t * 0.2)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(centerX, fbY, shockRadiusPx, 0, Math.PI * 2);
      ctx.stroke();

      // Wilson Condensation Disc (Rarefaction Shock Collar)
      if (t > 0.35 && t < 2.8) {
        const wilsonGrad = ctx.createRadialGradient(centerX, fbY, shockRadiusPx * 0.75, centerX, fbY, shockRadiusPx * 0.98);
        wilsonGrad.addColorStop(0.0, 'rgba(224, 242, 254, 0.0)');
        wilsonGrad.addColorStop(0.5, `rgba(224, 242, 254, ${0.45 * (1 - t / 2.8)})`);
        wilsonGrad.addColorStop(1.0, 'rgba(224, 242, 254, 0.0)');
        ctx.fillStyle = wilsonGrad;
        ctx.beginPath();
        ctx.ellipse(centerX, fbY, shockRadiusPx * 0.98, shockRadiusPx * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Volumetric Organic Mushroom Cloud (t >= 0.8s)
    if (t >= 0.8) {
      const cloudAlpha = Math.min(1.0, (t - 0.8) / 1.6);
      const capCenterY = (topY + baseY) / 2;
      const capRadiusY = Math.max(18, (baseY - topY) / 2);
      const capRadiusX = Math.max(28, capWidthPx / 2);

      // A. Suction Debris Stem (from ground upward)
      const stemSegments = 16;
      for (let s = 0; s < stemSegments; s++) {
        const segFrac = s / stemSegments;
        const segY = groundY - segFrac * (groundY - (baseY + 10));
        // Flared base, narrowing mid-throat, expanding into cap base
        const throatCurve = Math.sin(segFrac * Math.PI);
        const segWidth = stemWidthPx * (1.1 - throatCurve * 0.35);
        const wiggle = Math.sin(segFrac * 6 + t * 0.5) * 4;

        const stemPuffGrad = ctx.createRadialGradient(
          centerX + wiggle, segY, 0,
          centerX + wiggle, segY, segWidth * 0.8
        );

        if (burstMode === 'surface') {
          // Pulverized soil and dark charred debris
          stemPuffGrad.addColorStop(0.0, `rgba(80, 50, 35, ${0.85 * cloudAlpha})`);
          stemPuffGrad.addColorStop(0.5, `rgba(55, 38, 28, ${0.88 * cloudAlpha})`);
          stemPuffGrad.addColorStop(1.0, 'rgba(20, 15, 12, 0.0)');
        } else {
          // Condensed water droplets and atmospheric soot
          stemPuffGrad.addColorStop(0.0, `rgba(110, 115, 125, ${0.75 * cloudAlpha})`);
          stemPuffGrad.addColorStop(0.6, `rgba(60, 65, 75, ${0.8 * cloudAlpha})`);
          stemPuffGrad.addColorStop(1.0, 'rgba(25, 28, 35, 0.0)');
        }

        ctx.fillStyle = stemPuffGrad;
        ctx.beginPath();
        ctx.arc(centerX + wiggle, segY, segWidth * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // Internal Thermal Updraft Streak in Stem Throat
      if (t < 90) {
        const thermalAlpha = Math.max(0, 1.0 - t / 75.0);
        const streakGrad = ctx.createLinearGradient(0, groundY, 0, baseY);
        streakGrad.addColorStop(0.0, `rgba(255, 230, 150, ${0.8 * thermalAlpha})`);
        streakGrad.addColorStop(0.5, `rgba(249, 115, 22, ${0.65 * thermalAlpha})`);
        streakGrad.addColorStop(1.0, `rgba(220, 38, 38, ${0.2 * thermalAlpha})`);
        ctx.fillStyle = streakGrad;
        ctx.beginPath();
        ctx.moveTo(centerX - stemWidthPx * 0.25, groundY);
        ctx.lineTo(centerX - stemWidthPx * 0.15, baseY + 10);
        ctx.lineTo(centerX + stemWidthPx * 0.15, baseY + 10);
        ctx.lineTo(centerX + stemWidthPx * 0.25, groundY);
        ctx.closePath();
        ctx.fill();
      }

      // B. Ground Debris Base Surge (for surface bursts)
      if (burstMode === 'surface') {
        const surgeRadiusPx = Math.min(width * 0.35, stemWidthPx * 2.2 * Math.min(2.0, t * 0.2));
        const surgeGrad = ctx.createRadialGradient(centerX, groundY, 0, centerX, groundY, surgeRadiusPx);
        surgeGrad.addColorStop(0.0, `rgba(90, 60, 40, ${0.85 * cloudAlpha})`);
        surgeGrad.addColorStop(0.6, `rgba(65, 42, 30, ${0.65 * cloudAlpha})`);
        surgeGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = surgeGrad;
        ctx.beginPath();
        ctx.ellipse(centerX, groundY, surgeRadiusPx, surgeRadiusPx * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // C. Internal Incandescent Core (Fireball remnants glowing inside torus)
      if (t < 150) {
        const fireAlpha = Math.max(0, 1.0 - t / 110.0);
        const coreFireGrad = ctx.createRadialGradient(
          centerX, capCenterY, 0,
          centerX, capCenterY, capRadiusX * 0.55
        );
        coreFireGrad.addColorStop(0.0, `rgba(255, 255, 220, ${fireAlpha * 0.95})`);
        coreFireGrad.addColorStop(0.3, `rgba(251, 146, 60, ${fireAlpha * 0.9})`);
        coreFireGrad.addColorStop(0.7, `rgba(220, 38, 38, ${fireAlpha * 0.6})`);
        coreFireGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = coreFireGrad;
        ctx.beginPath();
        ctx.ellipse(centerX, capCenterY, capRadiusX * 0.6, capRadiusY * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // D. Volumetric Organic Smoke Lobes (Toroidal Convection Roll)
      smokeLobes.forEach((lobe) => {
        // Toroidal circulation rotation
        const currentPhase = lobe.phase + (t * lobe.speed * 0.35);
        const rollFrac = Math.sin(currentPhase);
        const lobeX = centerX + lobe.relX * capRadiusX + rollFrac * 6;
        const lobeY = capCenterY + lobe.relY * capRadiusY;
        const lobeRadius = lobe.baseRadius * capRadiusX;

        // Spherical 3D Volumetric Lighting Gradient: Light from fiery core below, dark smoke above
        const lobeGrad = ctx.createRadialGradient(
          lobeX, lobeY - lobeRadius * 0.25, lobeRadius * 0.1,
          lobeX, lobeY, lobeRadius
        );

        if (lobe.layer === 'core') {
          // Warmer internal core lobes
          lobeGrad.addColorStop(0.0, `rgba(180, 160, 145, ${0.9 * cloudAlpha})`);
          lobeGrad.addColorStop(0.4, `rgba(120, 95, 80, ${0.92 * cloudAlpha})`);
          lobeGrad.addColorStop(0.85, `rgba(55, 45, 40, ${0.95 * cloudAlpha})`);
          lobeGrad.addColorStop(1.0, 'rgba(25, 20, 20, 0.0)');
        } else {
          // Outer dense cauliflower lobes
          lobeGrad.addColorStop(0.0, `rgba(145, 150, 160, ${0.88 * cloudAlpha})`);
          lobeGrad.addColorStop(0.5, `rgba(80, 85, 95, ${0.92 * cloudAlpha})`);
          lobeGrad.addColorStop(0.9, `rgba(38, 40, 48, ${0.95 * cloudAlpha})`);
          lobeGrad.addColorStop(1.0, 'rgba(15, 18, 24, 0.0)');
        }

        ctx.fillStyle = lobeGrad;
        ctx.beginPath();
        ctx.arc(lobeX, lobeY, lobeRadius, 0, Math.PI * 2);
        ctx.fill();
      });

      // E. Flattened Stratospheric Anvil Cap Shelf
      const shelfGrad = ctx.createLinearGradient(0, topY, 0, topY + capRadiusY * 0.5);
      shelfGrad.addColorStop(0.0, `rgba(175, 180, 190, ${0.65 * cloudAlpha})`);
      shelfGrad.addColorStop(1.0, 'rgba(60, 65, 75, 0.0)');
      ctx.fillStyle = shelfGrad;
      ctx.beginPath();
      ctx.ellipse(centerX, topY + 4, capRadiusX * 0.95, capRadiusY * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 9. Dimension Annotation Arrows & Labels
    if (t >= 2.0) {
      const arrowX = centerX + capWidthPx / 2 + 40;
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(arrowX, groundY);
      ctx.lineTo(arrowX, topY);
      ctx.stroke();

      // Top Arrowhead
      ctx.fillStyle = '#00e5ff';
      ctx.beginPath();
      ctx.moveTo(arrowX - 4, topY + 8);
      ctx.lineTo(arrowX + 4, topY + 8);
      ctx.lineTo(arrowX, topY);
      ctx.closePath();
      ctx.fill();

      // Dimension Readouts
      ctx.font = 'bold 11px JetBrains Mono, monospace';
      const topLabel = unitMode === 'imperial'
        ? `Cloud Top: ${(currentTopKm * 0.621371).toFixed(1)} mi (${Math.round(currentTopKm * 3280.84).toLocaleString()} ft)`
        : `Cloud Top: ${currentTopKm.toFixed(1)} km`;
      ctx.fillText(topLabel, arrowX + 8, (groundY + topY) / 2);

      const capLabel = unitMode === 'imperial'
        ? `Cap Width: ${(currentCapWidthKm * 0.621371).toFixed(1)} mi`
        : `Cap Width: ${currentCapWidthKm.toFixed(1)} km`;
      ctx.font = '10px Inter, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fillText(capLabel, arrowX + 8, (groundY + topY) / 2 + 15);
    }

    // 10. Blinding Flash Overlay
    if (flashIntensity > 0.01) {
      ctx.fillStyle = `rgba(255, 255, 255, ${flashIntensity})`;
      ctx.fillRect(-20, -20, width + 40, height + 40);
    }

    ctx.restore();
  }, [simTimeSeconds, cloudPhysics, flashIntensity, shakeIntensity, burstMode, burstAltitudeM, smokeLobes, unitMode]);

  // --- CANVAS 2: OUTRIDER REAL-CITY DARK MATTER MAP & BLAST RADIUS SIMULATOR ---
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

    // Viewport scale & Mapbox-style tile projection
    let zoom = 11;
    if (rZone4_Thermal3rdKm < 2.5) zoom = 13;
    else if (rZone4_Thermal3rdKm < 6.0) zoom = 12;
    else if (rZone4_Thermal3rdKm < 15.0) zoom = 11;
    else if (rZone4_Thermal3rdKm < 35.0) zoom = 10;
    else if (rZone4_Thermal3rdKm < 80.0) zoom = 9;
    else zoom = 8;

    const n = Math.pow(2, zoom);
    const centerTileX = ((currentCity.lon + 180.0) / 360.0) * n;
    const latRad = (currentCity.lat * Math.PI) / 180.0;
    const centerTileY =
      ((1.0 - Math.log(Math.tan(latRad) + 1.0 / Math.cos(latRad)) / Math.PI) / 2.0) * n;

    // Meters per pixel at this latitude
    const metersPerPixel = (156543.03 * Math.cos(latRad)) / n;
    const kmToMapPx = (km: number) => (km * 1000.0) / metersPerPixel;

    // 1. Dark Base Map Background
    ctx.fillStyle = '#06090e';
    ctx.fillRect(0, 0, width, height);

    // 2. Render CartoDB Dark Matter City Map Tiles (Streets, Rivers, Buildings)
    const tileSize = 256;
    const minTileX = Math.floor(centerTileX - width / (2 * tileSize)) - 1;
    const maxTileX = Math.floor(centerTileX + width / (2 * tileSize)) + 1;
    const minTileY = Math.floor(centerTileY - height / (2 * tileSize)) - 1;
    const maxTileY = Math.floor(centerTileY + height / (2 * tileSize)) + 1;

    let tilesLoaded = 0;
    for (let tx = minTileX; tx <= maxTileX; tx++) {
      for (let ty = minTileY; ty <= maxTileY; ty++) {
        const tileKey = `${zoom}/${tx}/${ty}`;
        const img = tileImageCache.get(tileKey);
        if (img && img.complete && img.naturalWidth > 0) {
          const posX = centerX + (tx - centerTileX) * tileSize;
          const posY = centerY + (ty - centerTileY) * tileSize;
          ctx.drawImage(img, posX, posY, tileSize, tileSize);
          tilesLoaded++;
        }
      }
    }

    // Procedural Dark Vector Radar Overlay if tiles are still fetching
    if (tilesLoaded === 0) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      const maxRadarKm = rZone4_Thermal3rdKm * 1.35;
      for (let g = 1; g <= 4; g++) {
        const rKm = (maxRadarKm / 4) * g;
        const rPx = kmToMapPx(rKm);
        ctx.beginPath();
        ctx.arc(centerX, centerY, rPx, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(centerX, 20);
      ctx.lineTo(centerX, height - 20);
      ctx.moveTo(20, centerY);
      ctx.lineTo(width - 20, centerY);
      ctx.stroke();
    }

    // 3. OUTRIDER 4-TIER GLOWING TRANSLUCENT ENERGY ZONES
    // Zone 4: Heat / Thermal Radiation (3rd Degree Burns) - Amber
    const rZ4Px = kmToMapPx(rZone4_Thermal3rdKm);
    const isZ4Focused = selectedEffect === 'thermal' || selectedEffect === null;
    ctx.save();
    ctx.fillStyle = isZ4Focused ? 'rgba(245, 158, 11, 0.22)' : 'rgba(245, 158, 11, 0.08)';
    ctx.beginPath();
    ctx.arc(centerX, centerY, rZ4Px, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = isZ4Focused ? 2.5 : 1.2;
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = isZ4Focused ? 12 : 4;
    ctx.stroke();
    ctx.restore();

    // Zone 3: Shockwave / Moderate Blast (5 psi) - Electric Cyan / Sky Blue
    const rZ3Px = kmToMapPx(rZone3_Mod5psiKm);
    const isZ3Focused = selectedEffect === 'shockwave' || selectedEffect === null;
    ctx.save();
    ctx.fillStyle = isZ3Focused ? 'rgba(0, 229, 255, 0.25)' : 'rgba(0, 229, 255, 0.08)';
    ctx.beginPath();
    ctx.arc(centerX, centerY, rZ3Px, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = isZ3Focused ? 2.5 : 1.2;
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = isZ3Focused ? 12 : 4;
    ctx.stroke();
    ctx.restore();

    // Zone 2: Prompt Radiation / Heavy Blast (20 psi) - Neon Magenta / Crimson
    const rZ2Px = kmToMapPx(rZone2_Heavy20psiKm);
    const isZ2Focused = selectedEffect === 'radiation' || selectedEffect === null;
    ctx.save();
    ctx.fillStyle = isZ2Focused ? 'rgba(224, 36, 94, 0.38)' : 'rgba(224, 36, 94, 0.12)';
    ctx.beginPath();
    ctx.arc(centerX, centerY, rZ2Px, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#e0245e';
    ctx.lineWidth = isZ2Focused ? 3 : 1.5;
    ctx.shadowColor = '#e0245e';
    ctx.shadowBlur = isZ2Focused ? 14 : 5;
    ctx.stroke();
    ctx.restore();

    // Zone 1: Fireball Core - Incandescent Gold / Bright Orange
    const rZ1Px = kmToMapPx(rZone1_FireballKm);
    const isZ1Focused = selectedEffect === 'fireball' || selectedEffect === null;
    ctx.save();
    const fbGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, rZ1Px);
    fbGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.98)');
    fbGrad.addColorStop(0.4, 'rgba(254, 240, 138, 0.95)');
    fbGrad.addColorStop(0.75, 'rgba(234, 86, 0, 0.92)');
    fbGrad.addColorStop(1.0, 'rgba(220, 38, 38, 0.85)');
    ctx.fillStyle = fbGrad;
    ctx.beginPath();
    ctx.arc(centerX, centerY, rZ1Px, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = isZ1Focused ? 2.5 : 1.2;
    ctx.shadowColor = '#ea5600';
    ctx.shadowBlur = isZ1Focused ? 18 : 6;
    ctx.stroke();
    ctx.restore();

    // 4. Real-Time Propagating Shockwave Wavefront Circle
    const shockDistKm = simTimeSeconds * 0.343;
    const maxViewKm = (width / 2 * metersPerPixel) / 1000.0;
    if (shockDistKm <= maxViewKm) {
      const shockWavePx = kmToMapPx(shockDistKm);
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(centerX, centerY, shockWavePx, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 5. Ground Zero Tactical Pin
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // City & Coordinates Label Overlay
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px Inter, sans-serif';
    ctx.fillText(`📍 ${currentCity.name}, ${currentCity.country}`, 20, 30);
    ctx.fillStyle = 'rgba(148, 163, 184, 0.9)';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillText(
      `${currentCity.lat.toFixed(4)}° N, ${Math.abs(currentCity.lon).toFixed(4)}° W | Pop Density: ${currentCity.popDensityPerKm2.toLocaleString()} / km²`,
      20,
      46
    );
  }, [simTimeSeconds, cloudPhysics, currentCity, selectedEffect]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Top Outrider Header & Quick Control Bar */}
      <div className="panel" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.4rem' }}>🌋</span>
            <div>
              <strong style={{ fontSize: '1.05rem', color: '#fff' }}>Outrider Visual Detonation &amp; Mushroom Cloud Simulator</strong>
              <div style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)' }}>
                Atmospheric cloud profile, volumetric toroidal vortex, Wilson condensation shock collar, and dark-matter city cartography
              </div>
            </div>
          </div>

          {/* Quick Yield Presets & Burst Mode Toggles */}
          {onYieldChange && (
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap', marginLeft: '6px' }}>
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
                    background: Math.abs(yieldKt - opt.y) < 0.1 ? 'rgba(234, 86, 0, 0.3)' : 'rgba(255,255,255,0.05)',
                    color: Math.abs(yieldKt - opt.y) < 0.1 ? '#ea5600' : '#94a3b8',
                    border: Math.abs(yieldKt - opt.y) < 0.1 ? '1px solid #ea5600' : '1px solid rgba(255,255,255,0.1)',
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
                background: burstMode === 'air' ? 'rgba(0, 229, 255, 0.2)' : 'rgba(234, 86, 0, 0.2)',
                color: burstMode === 'air' ? '#00e5ff' : '#ea5600',
                border: `1px solid ${burstMode === 'air' ? '#00e5ff' : '#ea5600'}`,
                borderRadius: '4px'
              }}
            >
              {burstMode === 'air' ? '☁️ Air Burst' : '🌋 Surface Burst'}
            </button>
          )}
        </div>

        {/* View Mode & Unit Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.4)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', padding: '2px' }}>
            <button
              type="button"
              className="btn"
              onClick={() => setUnitMode('imperial')}
              style={{
                padding: '4px 10px',
                fontSize: '0.72rem',
                fontWeight: unitMode === 'imperial' ? 700 : 500,
                background: unitMode === 'imperial' ? 'rgba(255,255,255,0.15)' : 'transparent',
                color: unitMode === 'imperial' ? '#fff' : 'var(--color-text-muted)',
                border: 'none',
                borderRadius: '4px'
              }}
            >
              MILES
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => setUnitMode('metric')}
              style={{
                padding: '4px 10px',
                fontSize: '0.72rem',
                fontWeight: unitMode === 'metric' ? 700 : 500,
                background: unitMode === 'metric' ? 'rgba(255,255,255,0.15)' : 'transparent',
                color: unitMode === 'metric' ? '#fff' : 'var(--color-text-muted)',
                border: 'none',
                borderRadius: '4px'
              }}
            >
              KM
            </button>
          </div>

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
              ☁️ Cloud Profile
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => setViewMode('map')}
              style={{
                padding: '6px 14px',
                fontSize: '0.78rem',
                fontWeight: viewMode === 'map' ? 700 : 500,
                background: viewMode === 'map' ? 'rgba(234, 86, 0, 0.25)' : 'transparent',
                color: viewMode === 'map' ? '#ea5600' : 'var(--color-text-muted)',
                border: 'none',
                borderRadius: '4px'
              }}
            >
              🗺️ Outrider City Map
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
      </div>

      {/* Main Visual Display Stage */}
      <div style={{ display: 'grid', gridTemplateColumns: viewMode === 'split' ? '1fr 1fr' : '1fr', gap: '14px' }}>
        {/* VIEW 1: Volumetric Atmospheric Mushroom Cloud Profile Canvas */}
        {(viewMode === 'profile' || viewMode === 'split') && (
          <div className="panel" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 6px' }}>
              <span style={{ fontSize: '0.82rem', color: '#38bdf8', fontWeight: 600 }}>
                Volumetric Atmospheric Elevation Cross-Section (0–{Math.max(35, Math.ceil((cloudPhysics.hTopKm * 1.3) / 10) * 10)} km)
              </span>
              <span style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
                Scale Markers: Mt. Everest (8.85 km) • Airliner (11 km) • SR-71 (24 km) • Tropopause Inversion (12 km)
              </span>
            </div>
            <div style={{ position: 'relative', width: '100%', height: '480px', borderRadius: '8px', overflow: 'hidden' }}>
              <canvas
                ref={profileCanvasRef}
                width={800}
                height={480}
                style={{ width: '100%', height: '100%', display: 'block', background: '#020307' }}
              />
            </div>
          </div>
        )}

        {/* VIEW 2: Outrider-Style Real City Dark Matter Map Canvas */}
        {(viewMode === 'map' || viewMode === 'split') && (
          <div className="panel" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 6px', flexWrap: 'wrap', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.82rem', color: '#ea5600', fontWeight: 600 }}>
                  Real-City Dark Matter Blast Footprint
                </span>
                {selectedEffect && (
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setSelectedEffect(null)}
                    style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: '3px' }}
                  >
                    ✕ Clear Filter ({selectedEffect.toUpperCase()})
                  </button>
                )}
              </div>
              <select
                className="form-control"
                value={selectedCityId}
                onChange={(e) => setSelectedCityId(e.target.value)}
                style={{ fontSize: '0.78rem', padding: '4px 10px', maxWidth: '240px' }}
              >
                {CITY_PRESETS.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name} ({city.country})
                  </option>
                ))}
              </select>
            </div>
            <div style={{ position: 'relative', width: '100%', height: '480px', borderRadius: '8px', overflow: 'hidden' }}>
              <canvas
                ref={mapCanvasRef}
                width={800}
                height={480}
                style={{ width: '100%', height: '100%', display: 'block', background: '#06090e' }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Detonation Control Room & Timeline Scrubber Bar */}
      <div className="panel" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          {/* Big Detonate Action Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={triggerDetonation}
              style={{
                background: 'linear-gradient(135deg, #ea5600, #c2410c)',
                borderColor: '#ea5600',
                color: '#fff',
                fontSize: '0.92rem',
                fontWeight: 700,
                padding: '8px 22px',
                boxShadow: '0 0 16px rgba(234, 86, 0, 0.45)',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ fontVariantNumeric: 'tabular-nums', fontFamily: 'JetBrains Mono, monospace', fontSize: '1.15rem', color: '#00e5ff', fontWeight: 'bold' }}>
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
            <span>15s (Initial Fireball Rise)</span>
            <span>1 min (Toroidal Cap Anvil)</span>
            <span>5 min (Stabilized Cloud)</span>
            <span>10 min (Final Dimensions)</span>
          </div>
          <input
            type="range"
            min="0"
            max="600"
            step="0.5"
            value={simTimeSeconds}
            onChange={(e) => setSimTimeSeconds(parseFloat(e.target.value))}
            style={{ width: '100%', cursor: 'pointer', accentColor: '#ea5600' }}
          />
        </div>
      </div>

      {/* OUTRIDER 4-TIER INTERACTIVE EFFECT CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '14px' }}>
        {/* Card 1: Fireball */}
        <div
          onClick={() => setSelectedEffect(selectedEffect === 'fireball' ? null : 'fireball')}
          style={{
            background: selectedEffect === 'fireball' ? 'rgba(234, 86, 0, 0.18)' : 'rgba(234, 86, 0, 0.06)',
            border: `1px solid ${selectedEffect === 'fireball' ? '#ea5600' : 'rgba(234, 86, 0, 0.35)'}`,
            borderRadius: '8px',
            padding: '16px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: selectedEffect === 'fireball' ? '0 0 16px rgba(234, 86, 0, 0.35)' : 'none'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ color: '#ea5600', fontSize: '0.88rem', letterSpacing: '0.05em' }}>FIREBALL</strong>
            <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(234, 86, 0, 0.2)', color: '#ea5600', borderRadius: '4px', fontWeight: 600 }}>
              {selectedEffect === 'fireball' ? 'ACTIVE' : 'CLICK TO VIEW'}
            </span>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#fef08a', marginTop: '8px' }}>
            {unitMode === 'imperial'
              ? `${cloudPhysics.rZone1_FireballMiles.toFixed(2)} mi`
              : `${cloudPhysics.rZone1_FireballKm.toFixed(2)} km`}
            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginLeft: '6px' }}>radius</span>
          </div>
          <div style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Area: {unitMode === 'imperial' ? `${casualties.areaFireballSqMi} sq mi` : `${casualties.areaFireballKm2} km²`}
          </div>
          <p style={{ fontSize: '0.74rem', color: '#cbd5e1', marginTop: '10px', lineHeight: 1.45 }}>
            A nuclear fireball begins the moment the weapon detonates. The light and heat are so intense that it can ignite fires several miles away. Anything or anyone inside the fireball is instantly vaporized.
          </p>
        </div>

        {/* Card 2: Radiation */}
        <div
          onClick={() => setSelectedEffect(selectedEffect === 'radiation' ? null : 'radiation')}
          style={{
            background: selectedEffect === 'radiation' ? 'rgba(224, 36, 94, 0.18)' : 'rgba(224, 36, 94, 0.06)',
            border: `1px solid ${selectedEffect === 'radiation' ? '#e0245e' : 'rgba(224, 36, 94, 0.35)'}`,
            borderRadius: '8px',
            padding: '16px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: selectedEffect === 'radiation' ? '0 0 16px rgba(224, 36, 94, 0.35)' : 'none'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ color: '#e0245e', fontSize: '0.88rem', letterSpacing: '0.05em' }}>RADIATION</strong>
            <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(224, 36, 94, 0.2)', color: '#e0245e', borderRadius: '4px', fontWeight: 600 }}>
              {selectedEffect === 'radiation' ? 'ACTIVE' : 'CLICK TO VIEW'}
            </span>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#f472b6', marginTop: '8px' }}>
            {unitMode === 'imperial'
              ? `${cloudPhysics.rZone2_Heavy20psiMiles.toFixed(2)} mi`
              : `${cloudPhysics.rZone2_Heavy20psiKm.toFixed(2)} km`}
            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginLeft: '6px' }}>radius</span>
          </div>
          <div style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Area: {unitMode === 'imperial' ? `${casualties.area20psiSqMi} sq mi` : `${casualties.area20psiKm2} km²`}
          </div>
          <p style={{ fontSize: '0.74rem', color: '#cbd5e1', marginTop: '10px', lineHeight: 1.45 }}>
            Nuclear weapons release lethal prompt ionizing radiation (neutrons and gamma rays). In this zone, radiation is so intense that between 50% and 90% of people will die within hours to a few weeks without ICU intervention.
          </p>
        </div>

        {/* Card 3: Shockwave */}
        <div
          onClick={() => setSelectedEffect(selectedEffect === 'shockwave' ? null : 'shockwave')}
          style={{
            background: selectedEffect === 'shockwave' ? 'rgba(0, 229, 255, 0.18)' : 'rgba(0, 229, 255, 0.06)',
            border: `1px solid ${selectedEffect === 'shockwave' ? '#00e5ff' : 'rgba(0, 229, 255, 0.35)'}`,
            borderRadius: '8px',
            padding: '16px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: selectedEffect === 'shockwave' ? '0 0 16px rgba(0, 229, 255, 0.35)' : 'none'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ color: '#00e5ff', fontSize: '0.88rem', letterSpacing: '0.05em' }}>SHOCKWAVE</strong>
            <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(0, 229, 255, 0.2)', color: '#00e5ff', borderRadius: '4px', fontWeight: 600 }}>
              {selectedEffect === 'shockwave' ? 'ACTIVE' : 'CLICK TO VIEW'}
            </span>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#38bdf8', marginTop: '8px' }}>
            {unitMode === 'imperial'
              ? `${cloudPhysics.rZone3_Mod5psiMiles.toFixed(2)} mi`
              : `${cloudPhysics.rZone3_Mod5psiKm.toFixed(2)} km`}
            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginLeft: '6px' }}>radius</span>
          </div>
          <div style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Area: {unitMode === 'imperial' ? `${casualties.area5psiSqMi} sq mi` : `${casualties.area5psiKm2} km²`}
          </div>
          <p style={{ fontSize: '0.74rem', color: '#cbd5e1', marginTop: '10px', lineHeight: 1.45 }}>
            The nuclear blast creates a wall of compressed air that expands at supersonic speed. Most residential buildings are leveled, commercial structures severely damaged, and winds reach hurricane speeds over 160 mph.
          </p>
        </div>

        {/* Card 4: Heat */}
        <div
          onClick={() => setSelectedEffect(selectedEffect === 'thermal' ? null : 'thermal')}
          style={{
            background: selectedEffect === 'thermal' ? 'rgba(245, 158, 11, 0.18)' : 'rgba(245, 158, 11, 0.06)',
            border: `1px solid ${selectedEffect === 'thermal' ? '#f59e0b' : 'rgba(245, 158, 11, 0.35)'}`,
            borderRadius: '8px',
            padding: '16px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: selectedEffect === 'thermal' ? '0 0 16px rgba(245, 158, 11, 0.35)' : 'none'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ color: '#f59e0b', fontSize: '0.88rem', letterSpacing: '0.05em' }}>HEAT (THERMAL)</strong>
            <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', borderRadius: '4px', fontWeight: 600 }}>
              {selectedEffect === 'thermal' ? 'ACTIVE' : 'CLICK TO VIEW'}
            </span>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#fbbf24', marginTop: '8px' }}>
            {unitMode === 'imperial'
              ? `${cloudPhysics.rZone4_Thermal3rdMiles.toFixed(2)} mi`
              : `${cloudPhysics.rZone4_Thermal3rdKm.toFixed(2)} km`}
            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginLeft: '6px' }}>radius</span>
          </div>
          <div style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Area: {unitMode === 'imperial' ? `${casualties.areaThermalSqMi} sq mi` : `${casualties.areaThermalKm2} km²`}
          </div>
          <p style={{ fontSize: '0.74rem', color: '#cbd5e1', marginTop: '10px', lineHeight: 1.45 }}>
            Thermal radiation causes third-degree flash burns to exposed skin, destroys pain-sensing nerve endings, and ignites dry wood, gas mains, and draperies, creating a catastrophic city-scale firestorm.
          </p>
        </div>
      </div>

      {/* Human Casualties & Impact Summary (Outrider Style) */}
      <div className="panel" style={{ padding: '16px 20px', background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <h4 style={{ margin: 0, color: '#fff', fontSize: '0.95rem' }}>
            Casualty &amp; Damage Projections for {currentCity.name} ({yieldKt >= 1000 ? `${(yieldKt / 1000).toFixed(2)} MT` : `${yieldKt} kT`} {burstMode} burst)
          </h4>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            Urban Population Density: {currentCity.popDensityPerKm2.toLocaleString()} people / km²
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '12px 16px', borderRadius: '6px', borderLeft: '3px solid #ef4444' }}>
            <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>ESTIMATED FATALITIES</div>
            <div style={{ fontSize: '1.65rem', fontWeight: 'bold', color: '#f87171' }}>
              {casualties.totalFatalities.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Instant / acute deaths</div>
          </div>

          <div style={{ background: 'rgba(249, 115, 22, 0.1)', padding: '12px 16px', borderRadius: '6px', borderLeft: '3px solid #f97316' }}>
            <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>ESTIMATED INJURIES</div>
            <div style={{ fontSize: '1.65rem', fontWeight: 'bold', color: '#fb923c' }}>
              {casualties.totalInjuries.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Severe trauma &amp; flash burns</div>
          </div>

          <div style={{ background: 'rgba(0, 229, 255, 0.1)', padding: '12px 16px', borderRadius: '6px', borderLeft: '3px solid #00e5ff' }}>
            <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>TOTAL IMPACT AREA</div>
            <div style={{ fontSize: '1.65rem', fontWeight: 'bold', color: '#38bdf8' }}>
              {unitMode === 'imperial'
                ? `${casualties.totalImpactAreaSqMi.toLocaleString()} sq mi`
                : `${casualties.totalImpactAreaKm2.toLocaleString()} km²`}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Full damage footprint</div>
          </div>

          <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px 16px', borderRadius: '6px', borderLeft: '3px solid #10b981' }}>
            <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>STABILIZED CLOUD TOP</div>
            <div style={{ fontSize: '1.65rem', fontWeight: 'bold', color: '#34d399' }}>
              {unitMode === 'imperial'
                ? `${cloudPhysics.hTopMiles.toFixed(1)} mi`
                : `${cloudPhysics.hTopKm.toFixed(1)} km`}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{Math.round(cloudPhysics.hTopFeet).toLocaleString()} ft ASL</div>
          </div>
        </div>
      </div>
    </div>
  );
};
