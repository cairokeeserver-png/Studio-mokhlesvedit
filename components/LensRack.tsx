
import React, { useRef, useEffect } from 'react';
import { LensType, LensSettings } from '../types';
import { LENS_CONFIGS } from '../constants';
import { TactileSlider } from './TactileSlider';

interface LensRackProps {
  activeLens: LensType;
  lensSettings: LensSettings;
  onPresetChange: (lens: LensType) => void;
  onSettingsChange: (settings: LensSettings) => void;
}

export const LensRack: React.FC<LensRackProps> = ({ activeLens, lensSettings, onPresetChange, onSettingsChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height / 2;
    const distortion = lensSettings.distortion;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);

    // Function to apply lens distortion
    // Formula: rd = r * (1 + k * r^2)
    const warp = (px: number, py: number) => {
      const dx = (px - cx) / cx;
      const dy = (py - cy) / cy;
      const rSq = dx * dx + dy * dy;
      const f = 1 + distortion * rSq;
      return {
        x: cx + dx * f * cx,
        y: cy + dy * f * cy
      };
    };

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;

    // Draw Grid Lines
    const step = 20;
    const segments = 20;

    // Horizontal Lines
    for (let y = 0; y <= height; y += step) {
      ctx.beginPath();
      for (let x = 0; x <= width; x += width / segments) {
        const p = warp(x, y);
        if (x === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }

    // Vertical Lines
    for (let x = 0; x <= width; x += step) {
      ctx.beginPath();
      for (let y = 0; y <= height; y += height / segments) {
        const p = warp(x, y);
        if (y === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }

    // Center Crosshair
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy);
    ctx.lineTo(cx + 10, cy);
    ctx.moveTo(cx, cy - 10);
    ctx.lineTo(cx, cy + 10);
    ctx.stroke();

    // Draw Bokeh Shapes
    const drawBokeh = (x: number, y: number, size: number, shape: string) => {
      const p = warp(x, y);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.beginPath();
      if (shape === 'circle') {
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      } else if (shape === 'hexagon') {
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3;
          const px = p.x + size * Math.cos(angle);
          const py = p.y + size * Math.sin(angle);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
      } else if (shape === 'octagon') {
        for (let i = 0; i < 8; i++) {
          const angle = (i * Math.PI) / 4;
          const px = p.x + size * Math.cos(angle);
          const py = p.y + size * Math.sin(angle);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
      } else if (shape === 'star') {
        for (let i = 0; i < 10; i++) {
          const angle = (i * Math.PI) / 5;
          const r = i % 2 === 0 ? size : size / 2;
          const px = p.x + r * Math.cos(angle);
          const py = p.y + r * Math.sin(angle);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
      } else if (shape === 'heart') {
        ctx.moveTo(p.x, p.y + size / 4);
        ctx.bezierCurveTo(p.x, p.y, p.x - size / 2, p.y, p.x - size / 2, p.y + size / 4);
        ctx.bezierCurveTo(p.x - size / 2, p.y + size / 2, p.x, p.y + size * 0.75, p.x, p.y + size);
        ctx.bezierCurveTo(p.x, p.y + size * 0.75, p.x + size / 2, p.y + size / 2, p.x + size / 2, p.y + size / 4);
        ctx.bezierCurveTo(p.x + size / 2, p.y, p.x, p.y, p.x, p.y + size / 4);
      }
      ctx.fill();
    };

    // Draw some bokeh particles
    const bokehSize = 22 / lensSettings.aperture * 2; // Size based on aperture
    drawBokeh(cx - 50, cy - 30, bokehSize, lensSettings.bokehShape);
    drawBokeh(cx + 60, cy + 20, bokehSize * 0.8, lensSettings.bokehShape);
    drawBokeh(cx - 30, cy + 40, bokehSize * 1.2, lensSettings.bokehShape);
    drawBokeh(cx + 40, cy - 40, bokehSize * 0.9, lensSettings.bokehShape);

    // Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.strokeRect(0, 0, width, height);

  }, [lensSettings.distortion, lensSettings.aperture, lensSettings.bokehShape]);

  return (
    <div className="flex flex-col gap-10">
      {/* Optic Bench Preview */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative group">
          <canvas 
            ref={canvasRef} 
            width={300} 
            height={180} 
            className="rounded-3xl border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] bg-black"
          />
          <div className="absolute top-4 left-4 flex flex-col gap-1">
            <span className="text-[7px] uppercase tracking-[0.4em] text-white/30 font-bold">Optic Bench Preview</span>
            <span className="text-[8px] uppercase tracking-widest text-white/60 font-mono">
              Distortion: {lensSettings.distortion > 0 ? 'Barrel' : lensSettings.distortion < 0 ? 'Pincushion' : 'Rectilinear'}
            </span>
          </div>
          <div className="absolute inset-0 rounded-3xl pointer-events-none shadow-[inset_0_0_30px_rgba(0,0,0,0.8)]"></div>
        </div>
      </div>

      {/* Manual Controls */}
      <div className="flex flex-col gap-4 px-4">
        <div className="flex gap-4">
          <div className="flex-1 flex flex-col gap-2">
            <span className="text-[8px] uppercase tracking-widest text-white/30 px-2">Focal Length (mm)</span>
            <TactileSlider 
              min="10" max="200" step="1" 
              value={lensSettings.focalLength} 
              onChange={e => onSettingsChange({ ...lensSettings, focalLength: parseFloat(e.target.value) })}
            />
            <span className="text-[8px] font-mono text-right text-white/60">{lensSettings.focalLength}mm</span>
          </div>
          <div className="flex-1 flex flex-col gap-2">
            <span className="text-[8px] uppercase tracking-widest text-white/30 px-2">Aperture (f/)</span>
            <TactileSlider 
              min="1.2" max="22" step="0.1" 
              value={lensSettings.aperture} 
              onChange={e => onSettingsChange({ ...lensSettings, aperture: parseFloat(e.target.value) })}
            />
            <span className="text-[8px] font-mono text-right text-white/60">f/{lensSettings.aperture}</span>
          </div>
          <div className="flex-1 flex flex-col gap-2">
            <span className="text-[8px] uppercase tracking-widest text-white/30 px-2">Distortion</span>
            <TactileSlider 
              min="-0.5" max="0.5" step="0.01" 
              value={lensSettings.distortion} 
              onChange={e => onSettingsChange({ ...lensSettings, distortion: parseFloat(e.target.value) })}
            />
            <span className="text-[8px] font-mono text-right text-white/60">{lensSettings.distortion.toFixed(2)}</span>
          </div>
        </div>
        
        <div className="flex flex-col gap-2">
          <span className="text-[8px] uppercase tracking-widest text-white/30 px-2">Bokeh Shape</span>
          <div className="grid grid-cols-5 gap-2">
            {(['circle', 'hexagon', 'octagon', 'star', 'heart'] as const).map(shape => (
              <button
                key={shape}
                onClick={() => onSettingsChange({ ...lensSettings, bokehShape: shape })}
                className={`py-2 rounded-xl text-[8px] uppercase tracking-widest border transition-all ${lensSettings.bokehShape === shape ? 'bg-white text-black border-white font-bold' : 'bg-white/5 border-white/10 text-white/40 hover:text-white'}`}
              >
                {shape}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Lens Selection Grid */}
      <div className="grid grid-cols-3 gap-8">
        {(Object.keys(LENS_CONFIGS) as LensType[]).map((lens) => (
          <button
            key={lens}
            onClick={() => onPresetChange(lens)}
            className={`
              relative p-8 rounded-[40px] border-2 transition-all duration-700 text-left flex flex-col gap-4
              ${activeLens === lens 
                ? 'border-white bg-white/5 scale-105 shadow-2xl' 
                : 'border-white/5 bg-black/40 hover:border-white/20 hover:bg-white/[0.02]'}
            `}
          >
            <div className="flex items-center justify-between">
              <span className="text-[12px] uppercase tracking-[0.4em] font-bold text-white">
                {LENS_CONFIGS[lens].name}
              </span>
              <div className={`w-3 h-3 rounded-full ${activeLens === lens ? 'bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]' : 'bg-white/10'}`} />
            </div>
            <p className="text-[10px] text-white/40 leading-relaxed uppercase tracking-widest">
              {LENS_CONFIGS[lens].description}
            </p>
            <div className="mt-4 flex gap-4 text-[9px] font-mono text-white/20 uppercase tracking-tighter">
              <span>BOKEH: {LENS_CONFIGS[lens].bokeh}</span>
              <span>DISTORT: {LENS_CONFIGS[lens].distortion}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
