import React, { useState, useEffect, useRef } from 'react';

export const DetectorHardwareModule: React.FC = () => {
  const [connectionMode, setConnectionMode] = useState<'audio' | 'serial' | 'simulation'>('simulation');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [cps, setCps] = useState<number>(0);
  const [cpm, setCpm] = useState<number>(24);
  const [totalCounts, setTotalCounts] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [deadTime_us, setDeadTime_us] = useState<number>(50); // microseconds
  const [calibrationFactor_cpm_per_uSv, setCalibrationFactor_cpm_per_uSv] = useState<number>(120); // Pancake GM ~120 cpm per uSv/h
  const [backgroundCpm, setBackgroundCpm] = useState<number>(25);
  const [thresholdLevel, setThresholdLevel] = useState<number>(0.25);
  const [audioClicksEnabled, setAudioClicksEnabled] = useState<boolean>(true);
  const [simPreset, setSimPreset] = useState<'background' | 'check_source' | 'high_field'>('background');

  // Oscilloscope canvas ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Web Audio Context refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Web Serial Port ref
  const serialPortRef = useRef<any>(null);
  const serialReaderRef = useRef<any>(null);

  // Pulse timestamps for rolling rate calculation
  const pulseTimestampsRef = useRef<number[]>([]);

  // Web Audio Synth for clicks
  const clickAudioCtxRef = useRef<AudioContext | null>(null);

  const playClick = () => {
    if (!audioClicksEnabled) return;
    try {
      if (!clickAudioCtxRef.current) {
        clickAudioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = clickAudioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.008);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.008);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.01);
    } catch {
      // Audio autoplay restrictions
    }
  };

  // Register a pulse
  const recordPulse = () => {
    const now = performance.now();
    pulseTimestampsRef.current.push(now);
    setTotalCounts(prev => prev + 1);
    playClick();
  };

  // Rolling CPS / CPM calculator interval
  useEffect(() => {
    const interval = setInterval(() => {
      const now = performance.now();
      const oneSecAgo = now - 1000;
      const sixtySecAgo = now - 60000;

      // Filter pulses
      pulseTimestampsRef.current = pulseTimestampsRef.current.filter(t => t > sixtySecAgo);
      const recent1s = pulseTimestampsRef.current.filter(t => t > oneSecAgo).length;
      const recent60s = pulseTimestampsRef.current.length;

      setCps(recent1s);
      setCpm(recent60s);

      if (isConnected) {
        setElapsedSeconds(prev => prev + 1);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isConnected]);

  // Simulation mode generator
  useEffect(() => {
    if (connectionMode !== 'simulation' || !isConnected) return;

    let targetCpm = 25;
    if (simPreset === 'check_source') targetCpm = 1450;
    if (simPreset === 'high_field') targetCpm = 18500;

    const intervalMs = 60000 / targetCpm;

    const simTimer = setInterval(() => {
      // Poisson jitter
      if (Math.random() < 0.85) {
        recordPulse();
      }
    }, intervalMs);

    return () => clearInterval(simTimer);
  }, [connectionMode, isConnected, simPreset]);

  // Connect Audio Ingestion
  const startAudioIngestion = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      micStreamRef.current = stream;

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyserRef.current = analyser;
      source.connect(analyser);

      setIsConnected(true);
      drawOscilloscope();
    } catch (err) {
      alert(`Microphone Audio Access Error: ${err}`);
      setIsConnected(false);
    }
  };

  // Stop Audio Ingestion
  const stopAudioIngestion = () => {
    if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    setIsConnected(false);
  };

  // Connect Web Serial Port
  const startSerialConnection = async () => {
    if (!('serial' in navigator)) {
      alert('Web Serial API is not supported in this browser. Please use Chrome, Edge, or Opera.');
      return;
    }
    try {
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate: 115200 });
      serialPortRef.current = port;
      setIsConnected(true);

      const reader = port.readable.getReader();
      serialReaderRef.current = reader;

      const readLoop = async () => {
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            if (value && value.length > 0) {
              // Register incoming pulse or byte packet
              recordPulse();
            }
          }
        } catch {
          // Reader closed
        }
      };
      readLoop();
    } catch (err) {
      alert(`Serial Port Connection Error: ${err}`);
      setIsConnected(false);
    }
  };

  // Stop Web Serial Connection
  const stopSerialConnection = async () => {
    try {
      if (serialReaderRef.current) await serialReaderRef.current.cancel();
      if (serialPortRef.current) await serialPortRef.current.close();
    } catch {
      // Ignore cleanup error
    }
    setIsConnected(false);
  };

  // Oscilloscope loop
  const drawOscilloscope = () => {
    const analyser = analyserRef.current;
    const canvas = canvasRef.current;
    if (!analyser || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animFrameIdRef.current = requestAnimationFrame(render);
      analyser.getByteTimeDomainData(dataArray);

      const width = canvas.width;
      const height = canvas.height;

      ctx.fillStyle = '#050a12';
      ctx.fillRect(0, 0, width, height);

      // Draw threshold lines
      const threshY_top = height / 2 - thresholdLevel * (height / 2);
      const threshY_bot = height / 2 + thresholdLevel * (height / 2);

      ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, threshY_top);
      ctx.lineTo(width, threshY_top);
      ctx.moveTo(0, threshY_bot);
      ctx.lineTo(width, threshY_bot);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw waveform
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#00e5ff';
      ctx.beginPath();

      const sliceWidth = width / bufferLength;
      let x = 0;
      let pulseDetected = false;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0; // 0 to 2, centered at 1
        const y = (v * height) / 2;

        if (Math.abs(v - 1.0) > thresholdLevel) {
          pulseDetected = true;
        }

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }

      ctx.stroke();

      if (pulseDetected) {
        recordPulse();
      }
    };
    render();
  };

  const handleToggleConnection = () => {
    if (isConnected) {
      if (connectionMode === 'audio') stopAudioIngestion();
      if (connectionMode === 'serial') stopSerialConnection();
      if (connectionMode === 'simulation') setIsConnected(false);
    } else {
      if (connectionMode === 'audio') startAudioIngestion();
      if (connectionMode === 'serial') startSerialConnection();
      if (connectionMode === 'simulation') setIsConnected(true);
    }
  };

  // Dead time correction (Non-paralyzable model): n = m / (1 - m * tau)
  const measuredCps = cpm / 60.0;
  const tau_sec = deadTime_us * 1e-6;
  const deadTimeLossFraction = measuredCps * tau_sec;
  const trueCps = deadTimeLossFraction < 0.95 ? measuredCps / (1.0 - deadTimeLossFraction) : measuredCps * 20;
  const trueCpm = trueCps * 60.0;

  // Dose rate conversion
  const doseRate_uSv_h = trueCpm / Math.max(1, calibrationFactor_cpm_per_uSv);
  const doseRate_mR_h = doseRate_uSv_h / 10.0; // 1 mR/h ~ 10 uSv/h

  // Counting statistics: sigma = sqrt(N)
  const netCounts = Math.max(0, totalCounts - (backgroundCpm / 60.0) * elapsedSeconds);
  const countingError_pct = totalCounts > 0 ? (Math.sqrt(totalCounts) / totalCounts) * 100 : 0;

  // Currie Critical Level Lc = 2.33 * sqrt(B)
  const expectedBgCounts = (backgroundCpm / 60.0) * Math.max(1, elapsedSeconds);
  const currieLc = 2.33 * Math.sqrt(expectedBgCounts);
  const isAboveCurrie = netCounts > currieLc;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(0, 229, 255, 0.15), rgba(5, 10, 18, 0.95))',
        border: '1px solid rgba(0, 229, 255, 0.3)',
        borderRadius: '10px',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '1.8rem' }}>📡</span>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.35rem', color: 'var(--color-primary)' }}>
              Live Detector Hardware Ingestion & Pulse Counter
            </h2>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
              Direct USB Web Serial API, Audio Jack GM Discriminator & Real-Time Poisson Metrology Engine
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setAudioClicksEnabled(!audioClicksEnabled)}
            style={{
              padding: '6px 12px',
              fontSize: '0.75rem',
              background: audioClicksEnabled ? 'rgba(0, 229, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${audioClicksEnabled ? 'var(--color-primary)' : 'rgba(65, 90, 119, 0.3)'}`,
              color: audioClicksEnabled ? 'var(--color-primary)' : 'var(--color-text-muted)',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            {audioClicksEnabled ? '🔊 Audio Clicks ON' : '🔇 Audio Muted'}
          </button>
          <span style={{
            fontSize: '0.72rem',
            padding: '4px 10px',
            borderRadius: '6px',
            background: isConnected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            color: isConnected ? '#10b981' : '#ef4444',
            border: `1px solid ${isConnected ? '#10b981' : '#ef4444'}`,
            fontFamily: 'var(--font-mono)',
            fontWeight: 700
          }}>
            {isConnected ? '● HARDWARE LINKED' : '○ DISCONNECTED'}
          </span>
        </div>
      </div>

      {/* Connection & Port Setup */}
      <div className="panel" style={{ padding: '16px', borderRadius: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => { if (!isConnected) setConnectionMode('simulation'); }}
              disabled={isConnected}
              style={{
                padding: '6px 14px',
                fontSize: '0.78rem',
                fontWeight: 700,
                background: connectionMode === 'simulation' ? 'rgba(0, 229, 255, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                border: `1px solid ${connectionMode === 'simulation' ? 'var(--color-primary)' : 'rgba(65, 90, 119, 0.3)'}`,
                color: connectionMode === 'simulation' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                borderRadius: '6px',
                cursor: isConnected ? 'not-allowed' : 'pointer'
              }}
            >
              🎲 Synthetic Poisson Generator
            </button>

            <button
              onClick={() => { if (!isConnected) setConnectionMode('audio'); }}
              disabled={isConnected}
              style={{
                padding: '6px 14px',
                fontSize: '0.78rem',
                fontWeight: 700,
                background: connectionMode === 'audio' ? 'rgba(0, 229, 255, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                border: `1px solid ${connectionMode === 'audio' ? 'var(--color-primary)' : 'rgba(65, 90, 119, 0.3)'}`,
                color: connectionMode === 'audio' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                borderRadius: '6px',
                cursor: isConnected ? 'not-allowed' : 'pointer'
              }}
            >
              🎤 Audio Jack Discriminator (Line-In)
            </button>

            <button
              onClick={() => { if (!isConnected) setConnectionMode('serial'); }}
              disabled={isConnected}
              style={{
                padding: '6px 14px',
                fontSize: '0.78rem',
                fontWeight: 700,
                background: connectionMode === 'serial' ? 'rgba(0, 229, 255, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                border: `1px solid ${connectionMode === 'serial' ? 'var(--color-primary)' : 'rgba(65, 90, 119, 0.3)'}`,
                color: connectionMode === 'serial' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                borderRadius: '6px',
                cursor: isConnected ? 'not-allowed' : 'pointer'
              }}
            >
              🔌 USB Web Serial API (GMC/Radiacode)
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {connectionMode === 'simulation' && (
              <select
                className="form-control"
                value={simPreset}
                onChange={(e) => setSimPreset(e.target.value as any)}
                style={{ padding: '6px 10px', fontSize: '0.78rem', background: '#000', color: '#fff', border: '1px solid var(--color-border)', borderRadius: '6px' }}
              >
                <option value="background">Background Radiation (~25 CPM)</option>
                <option value="check_source">Cs-137 Check Source (~1,450 CPM)</option>
                <option value="high_field">Elevated Contamination (~18,500 CPM)</option>
              </select>
            )}

            <button
              onClick={handleToggleConnection}
              style={{
                padding: '8px 18px',
                fontSize: '0.80rem',
                fontWeight: 800,
                background: isConnected ? 'linear-gradient(135deg, #ef4444, #b91c1c)' : 'linear-gradient(135deg, #10b981, #059669)',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                boxShadow: isConnected ? '0 0 10px rgba(239, 68, 68, 0.3)' : '0 0 10px rgba(16, 185, 129, 0.3)'
              }}
            >
              {isConnected ? '⏹ DISCONNECT HARDWARE' : '▶ CONNECT & STREAM'}
            </button>
          </div>
        </div>
      </div>

      {/* Live Survey Metrology Deck */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        <div className="panel" style={{ padding: '16px', borderRadius: '8px', borderLeft: '4px solid var(--color-primary)' }}>
          <div style={{ fontSize: '0.70rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
            COUNT RATE (CPS)
          </div>
          <div style={{ fontSize: '2.0rem', fontWeight: 800, color: 'var(--color-primary)', lineHeight: 1.2 }}>
            {cps.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
            Instantaneous 1-second window
          </div>
        </div>

        <div className="panel" style={{ padding: '16px', borderRadius: '8px', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '0.70rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
            ROLLING RATE (CPM)
          </div>
          <div style={{ fontSize: '2.0rem', fontWeight: 800, color: '#10b981', lineHeight: 1.2 }}>
            {cpm.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
            Dead-time corrected: <strong style={{ color: '#fff' }}>{Math.round(trueCpm).toLocaleString()} CPM</strong>
          </div>
        </div>

        <div className="panel" style={{ padding: '16px', borderRadius: '8px', borderLeft: '4px solid #ff9f1c' }}>
          <div style={{ fontSize: '0.70rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
            EQUIVALENT DOSE RATE
          </div>
          <div style={{ fontSize: '2.0rem', fontWeight: 800, color: '#ff9f1c', lineHeight: 1.2 }}>
            {doseRate_uSv_h.toFixed(3)} <span style={{ fontSize: '1.0rem' }}>µSv/h</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
            {(doseRate_mR_h * 1000).toFixed(2)} µR/h ({doseRate_mR_h.toFixed(4)} mR/h)
          </div>
        </div>

        <div className="panel" style={{ padding: '16px', borderRadius: '8px', borderLeft: '4px solid #a78bfa' }}>
          <div style={{ fontSize: '0.70rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
            CUMULATIVE COUNTS (N)
          </div>
          <div style={{ fontSize: '2.0rem', fontWeight: 800, color: '#a78bfa', lineHeight: 1.2 }}>
            {totalCounts.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
            Time: {elapsedSeconds}s | σ = ±{countingError_pct.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Oscilloscope Canvas / Audio Pulse Visualizer */}
      {connectionMode === 'audio' && (
        <div className="panel" style={{ padding: '16px', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.80rem', fontWeight: 700, color: '#00e5ff', textTransform: 'uppercase' }}>
              Real-Time Oscilloscope Waveform & Pulse Trigger
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                Trigger Threshold: {(thresholdLevel * 100).toFixed(0)}%
              </span>
              <input
                type="range"
                min="0.05"
                max="0.80"
                step="0.01"
                value={thresholdLevel}
                onChange={(e) => setThresholdLevel(parseFloat(e.target.value))}
                style={{ width: '120px' }}
              />
            </div>
          </div>
          <canvas
            ref={canvasRef}
            width={700}
            height={160}
            style={{ width: '100%', height: 'auto', background: '#050a12', borderRadius: '6px', border: '1px solid rgba(65, 90, 119, 0.3)' }}
          />
        </div>
      )}

      {/* Metrology Parameters & Currie MDA Detection Evaluation */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        <div className="panel" style={{ padding: '16px', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', marginBottom: '12px' }}>
            Detector Dead-Time & Calibration Parameters
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>GM Dead-Time (τ, µs)</label>
              <input
                type="number"
                className="form-control"
                value={deadTime_us}
                onChange={(e) => setDeadTime_us(parseFloat(e.target.value) || 0)}
                style={{ width: '100%', padding: '6px', background: '#000', color: '#fff', border: '1px solid var(--color-border)', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Efficiency (CPM per µSv/h)</label>
              <input
                type="number"
                className="form-control"
                value={calibrationFactor_cpm_per_uSv}
                onChange={(e) => setCalibrationFactor_cpm_per_uSv(parseFloat(e.target.value) || 1)}
                style={{ width: '100%', padding: '6px', background: '#000', color: '#fff', border: '1px solid var(--color-border)', borderRadius: '4px' }}
              />
            </div>
          </div>
          <div style={{ marginTop: '10px', fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
            Non-paralyzable dead-time loss correction: <strong>{(deadTimeLossFraction * 100).toFixed(2)}%</strong> of pulses corrected.
          </div>
        </div>

        <div className="panel" style={{ padding: '16px', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', marginBottom: '12px' }}>
            Currie Detection Limit & Critical Decision Level (L_c)
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Status above Background:</span>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: '4px',
              background: isAboveCurrie ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
              color: isAboveCurrie ? '#ef4444' : '#10b981'
            }}>
              {isAboveCurrie ? 'ACTIVATION DETECTED (> Lc)' : 'BACKGROUND EQUIVALENT (≤ Lc)'}
            </span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span>Baseline Background Rate:</span>
              <input
                type="number"
                value={backgroundCpm}
                onChange={(e) => setBackgroundCpm(parseFloat(e.target.value) || 0)}
                style={{ width: '70px', padding: '2px 6px', background: '#000', color: '#fff', border: '1px solid var(--color-border)', borderRadius: '4px', fontSize: '0.72rem' }}
              />
            </div>
            <div>Currie Critical Level (L_c = 2.33·σ_b): <strong>{currieLc.toFixed(1)} counts</strong></div>
            <div>Net Sample Counts (S = N - B): <strong>{netCounts.toFixed(1)} counts</strong></div>
            <div>Statistical Significance: <strong>{netCounts > 0 ? (netCounts / Math.max(1, Math.sqrt(totalCounts))).toFixed(2) : 0} σ</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetectorHardwareModule;
