
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { LightState } from '../types';
import { TactileSlider } from './TactileSlider';

interface LightSphereProps {
  light: LightState;
  onChange: (light: LightState) => void;
  onCommit?: (light: LightState) => void;
}

export const LightSphere: React.FC<LightSphereProps> = ({ light, onChange, onCommit }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDraggingOrb, setIsDraggingOrb] = useState(false);
  
  type MaterialType = 'matte' | 'glossy' | 'metallic' | 'transparent';
  const MATERIAL_TYPES: MaterialType[] = ['matte', 'glossy', 'metallic', 'transparent'];
  const [material, setMaterial] = useState<MaterialType>('matte');
  const [texture, setTexture] = useState<'none' | 'wood' | 'metal' | 'marble' | 'earth'>('none');
  const [rotation, setRotation] = useState(0);
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    let animationFrame: number;
    const animate = () => {
        setRotation(prev => (prev + 0.01) % (Math.PI * 2));
        setPulse(Math.sin(Date.now() / 1000) * 0.1 + 1);
        animationFrame = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  const cycleTexture = () => {
    const textures: ('none' | 'wood' | 'metal' | 'marble' | 'earth')[] = ['none', 'wood', 'metal', 'marble', 'earth'];
    const nextIdx = (textures.indexOf(texture) + 1) % textures.length;
    setTexture(textures[nextIdx]);
  };

  const cycleMaterial = () => {
    const nextIdx = (MATERIAL_TYPES.indexOf(material) + 1) % MATERIAL_TYPES.length;
    setMaterial(MATERIAL_TYPES[nextIdx]);
  };

  const sphereRadius = 100;
  const padding = 50;
  const size = (sphereRadius + padding) * 2;

  const getKelvinColor = (k: number, alpha: number = 1) => {
    let r, g, b;
    if (k <= 6600) {
      r = 255;
      g = 99.47 * Math.log(k / 100) - 161.11;
      b = k <= 1900 ? 0 : 138.51 * Math.log(k / 100 - 10) - 305.04;
    } else {
      r = 329.69 * Math.pow(k / 100 - 60, -0.13);
      g = 288.12 * Math.pow(k / 100 - 60, -0.07);
      b = 255;
    }
    const clamp = (v: number) => Math.max(0, Math.min(255, v));
    return `rgba(${clamp(r)}, ${clamp(g)}, ${clamp(b)}, ${alpha})`;
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, size, size);
    const cx = size / 2;
    const cy = size / 2;

    // Apply rotation animation
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    ctx.translate(-cx, -cy);

    // Dynamic Floor shadow
    ctx.save();
    const shadowOffsetX = -light.x * 60;
    const shadowOffsetY = -light.y * 20; 
    const shadowScaleX = 1 + Math.abs(light.x) * 0.6;
    const shadowScaleY = 1 + Math.max(0, light.y) * 0.5;
    
    ctx.beginPath();
    ctx.ellipse(cx + shadowOffsetX, cy + sphereRadius - 5 + Math.max(-10, shadowOffsetY), (sphereRadius - 15) * shadowScaleX, 8 * shadowScaleY, 0, 0, Math.PI * 2);
    const shadowAlpha = material === 'transparent' ? 0.15 : 0.4;
    ctx.fillStyle = `rgba(0,0,0,${shadowAlpha * Math.min(1.5, light.intensity)})`;
    ctx.fill();
    ctx.restore();

    // Environment shell
    ctx.beginPath();
    ctx.arc(cx, cy, sphereRadius, 0, Math.PI * 2);
    const env = ctx.createRadialGradient(cx - 50, cy - 50, 0, cx, cy, sphereRadius);
    env.addColorStop(0, 'rgba(40, 42, 55, 0.3)');
    env.addColorStop(0.8, 'rgba(10, 10, 15, 0.95)');
    env.addColorStop(1, 'rgba(0, 0, 0, 1)');
    ctx.fillStyle = env;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // --- 3D Sphere with Material ---
    ctx.save();
    ctx.translate(cx, cy);
    
    const lx = light.x * 48;
    const ly = light.y * 48;
    const lz = light.z;
    const intensity = light.intensity * pulse; // Apply pulse
    const tempK = light.temperature;

    const spherePath = new Path2D();
    spherePath.arc(0, 0, 60, 0, Math.PI * 2); 
    
    // Base core
    if (material !== 'transparent') {
        ctx.fillStyle = '#1a1a1a'; 
        ctx.fill(spherePath);
    }
    ctx.clip(spherePath);

    // Apply procedural texture
    if (texture !== 'none') {
        const patternCanvas = document.createElement('canvas');
        patternCanvas.width = 120;
        patternCanvas.height = 120;
        const pCtx = patternCanvas.getContext('2d')!;
        
        // Simple procedural patterns
        if (texture === 'wood') {
            pCtx.fillStyle = '#8B4513';
            pCtx.fillRect(0,0,120,120);
            pCtx.strokeStyle = '#A0522D';
            for(let i=0; i<120; i+=10) {
                pCtx.beginPath();
                pCtx.ellipse(60, 60, i, i*0.5, 0, 0, Math.PI*2);
                pCtx.stroke();
            }
        } else if (texture === 'metal') {
            pCtx.fillStyle = '#C0C0C0';
            pCtx.fillRect(0,0,120,120);
            for(let i=0; i<500; i++) {
                pCtx.fillStyle = `rgba(255,255,255,${Math.random()*0.3})`;
                pCtx.fillRect(Math.random()*120, Math.random()*120, 1, 1);
            }
        } else if (texture === 'marble') {
            pCtx.fillStyle = '#f0f0f0';
            pCtx.fillRect(0,0,120,120);
            pCtx.strokeStyle = '#d0d0d0';
            pCtx.lineWidth = 2;
            for(let i=0; i<5; i++) {
                pCtx.beginPath();
                pCtx.moveTo(Math.random()*120, 0);
                pCtx.bezierCurveTo(Math.random()*120, 60, Math.random()*120, 60, Math.random()*120, 120);
                pCtx.stroke();
            }
        } else if (texture === 'earth') {
            pCtx.fillStyle = '#228B22'; // Green/Land
            pCtx.fillRect(0,0,120,120);
            pCtx.fillStyle = '#4169E1'; // Blue/Water
            pCtx.beginPath();
            pCtx.arc(60, 60, 40, 0, Math.PI*2);
            pCtx.fill();
        }

        const pattern = ctx.createPattern(patternCanvas, 'repeat');
        ctx.fillStyle = pattern!;
        ctx.fill(spherePath);
    }

    // Diffuse pass
    const diffRadius = 140 - (lz * 40);
    const diffGrad = ctx.createRadialGradient(lx, ly, 0, lx, ly, diffRadius);
    const kColor = getKelvinColor(tempK, 0.85 * intensity);
    
    // Apply light color
    const lightFill = ctx.createRadialGradient(sphereRadius, sphereRadius, 20, sphereRadius, sphereRadius, 100);
    // Simple way to tint by hex: convert to RGBA
    const r = parseInt(light.color.slice(1, 3), 16);
    const g = parseInt(light.color.slice(3, 5), 16);
    const b = parseInt(light.color.slice(5, 7), 16);
    const tintedKColor = `rgba(${r}, ${g}, ${b}, ${0.85*intensity})`;

    diffGrad.addColorStop(0, tintedKColor);
    
    if (material === 'matte') {
        diffGrad.addColorStop(0.7, getKelvinColor(tempK, 0.1 * intensity));
        diffGrad.addColorStop(1, 'rgba(10, 10, 10, 0.9)');
    } else if (material === 'glossy') {
        diffGrad.addColorStop(0.5, getKelvinColor(tempK, 0.2 * intensity));
        diffGrad.addColorStop(1, 'rgba(5, 5, 5, 0.95)');
    } else if (material === 'metallic') {
        diffGrad.addColorStop(0.4, getKelvinColor(tempK, 0.3 * intensity));
        diffGrad.addColorStop(0.8, 'rgba(20, 25, 30, 0.8)');
        diffGrad.addColorStop(1, 'rgba(0, 0, 0, 1)');
    } else if (material === 'transparent') {
        diffGrad.addColorStop(0.3, getKelvinColor(tempK, 0.4 * intensity));
        diffGrad.addColorStop(0.8, 'rgba(255, 255, 255, 0.05)');
        diffGrad.addColorStop(1, 'rgba(0,0,0,0)');
    }

    ctx.globalCompositeOperation = material === 'transparent' ? 'source-over' : 'screen';
    if (material === 'transparent') {
       ctx.fillStyle = 'rgba(20, 30, 40, 0.2)'; // base glass color
       ctx.fill(spherePath);
       ctx.globalCompositeOperation = 'screen';
    }
    
    ctx.fillStyle = diffGrad;
    ctx.fill(spherePath);
    ctx.globalCompositeOperation = 'source-over';

    // Specular Pass
    if (material === 'glossy' || material === 'metallic' || material === 'transparent') {
        const specRoughness = material === 'metallic' ? 0.3 : (material === 'transparent' ? 0.1 : 0.15);
        const specPower = (material === 'metallic' ? 1.5 : (material === 'transparent' ? 1.8 : 1.2)) * intensity;
        
        ctx.globalCompositeOperation = 'screen';
        const sharpSpec = ctx.createRadialGradient(lx * 1.1, ly * 1.1, 0, lx * 1.1, ly * 1.1, 20 * specRoughness);
        sharpSpec.addColorStop(0, `rgba(255, 255, 255, ${specPower})`);
        sharpSpec.addColorStop(0.5, getKelvinColor(tempK, 0.2 * specPower));
        sharpSpec.addColorStop(1, 'transparent');
        ctx.fillStyle = sharpSpec;
        ctx.fill(spherePath);
        ctx.globalCompositeOperation = 'source-over';
    }

    // Rim light / Fresnel
    if (material === 'metallic' || material === 'transparent') {
        const rimX = light.x * 50;
        const rimY = light.y * 50;
        const rimGrad = ctx.createRadialGradient(rimX, rimY, 40, rimX, rimY, 65);
        rimGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        const rimAlpha = material === 'transparent' ? 0.6 : 0.4;
        rimGrad.addColorStop(1, getKelvinColor(tempK, rimAlpha * intensity));
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = rimGrad;
        ctx.fill(spherePath);
        ctx.globalCompositeOperation = 'source-over';
    }
    
    ctx.restore();

    // 4. Gaffer Light Orb
    const orbDist = sphereRadius + 15 + (1 - lz) * 35;
    const orbX = cx + light.x * orbDist;
    const orbY = cy + light.y * orbDist;
    const orbScale = 1.3 - (lz * 0.4);

    const glow = ctx.createRadialGradient(orbX, orbY, 0, orbX, orbY, 20 * orbScale);
    glow.addColorStop(0, '#fff');
    glow.addColorStop(0.3, getKelvinColor(tempK, 0.9));
    glow.addColorStop(1, 'transparent');
    
    ctx.beginPath();
    ctx.arc(orbX, orbY, 20 * orbScale, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();

    // Interaction Ring
    ctx.beginPath();
    ctx.arc(cx, cy, orbDist, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,255,255,${0.03 + (1 - lz) * 0.1})`;
    ctx.lineWidth = 0.5;
    ctx.stroke();

    ctx.restore(); // Restore rotation translation

  }, [light, size, sphereRadius, material, texture, rotation, pulse]);

  useEffect(() => { draw(); }, [draw]);

  const handlePointer = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) - size / 2) / (sphereRadius + 30);
    const y = ((e.clientY - rect.top) - size / 2) / (sphereRadius + 30);
    
    const dist = Math.sqrt(x*x + y*y);
    const nx = x / (dist || 1);
    const ny = y / (dist || 1);
    
    onChange({ ...light, x: nx, y: ny });
    setIsDraggingOrb(true);
  };

  return (
    <div className="flex flex-col items-center select-none w-80">
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          className="cursor-crosshair touch-none"
          onPointerDown={(e) => {
            handlePointer(e);
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (isDraggingOrb) handlePointer(e);
          }}
          onPointerUp={() => {
            if (isDraggingOrb) {
              setIsDraggingOrb(false);
              onCommit?.(light);
            }
          }}
        />
        <div className="absolute top-2 right-2 flex gap-2">
          <button 
            onClick={cycleMaterial}
            className="px-3 py-1 bg-black/40 hover:bg-black/60 border border-white/10 rounded-full text-[10px] uppercase tracking-widest text-white/80 transition-colors backdrop-blur-md"
          >
            {material}
          </button>
          <button 
            onClick={cycleTexture}
            className="px-3 py-1 bg-black/40 hover:bg-black/60 border border-white/10 rounded-full text-[10px] uppercase tracking-widest text-white/80 transition-colors backdrop-blur-md"
          >
            {texture}
          </button>
          <input 
            type="color"
            value={light.color}
            onChange={(e) => onChange({...light, color: e.target.value})}
            className="w-8 h-8 rounded-full cursor-pointer bg-transparent border-0"
          />
        </div>
      </div>

      <div className="w-full mt-8 space-y-6 px-4">
        <Control label="Power" value={Math.round(light.intensity * 100)} unit="%" 
          min={0} max={1} step={0.01} current={light.intensity}
          onChange={v => onChange({...light, intensity: v})} 
          onCommit={() => onCommit?.(light)} />

        <Control label="Temp" value={light.temperature} unit="K" 
          min={2000} max={10000} step={50} current={light.temperature}
          onChange={v => onChange({...light, temperature: v})} 
          onCommit={() => onCommit?.(light)}
          gradient="bg-gradient-to-r from-orange-400 via-white to-blue-400" />

        <Control label="Distance" value={light.z.toFixed(2)} unit="Z" 
          min={0.1} max={2.0} step={0.01} current={light.z}
          onChange={v => onChange({...light, z: v})} 
          onCommit={() => onCommit?.(light)} />
      </div>
    </div>
  );
};

const Control = ({ label, value, unit, min, max, step, current, onChange, onCommit, gradient }: any) => (
  <div className="flex flex-col gap-2">
    <div className="flex justify-between text-[8px] uppercase tracking-[0.4em] text-white/30 font-bold">
      <span>{label}</span>
      <span className="text-white/60 font-mono">{value}{unit}</span>
    </div>
    <div className={`relative h-[2px] w-full rounded-full ${gradient || 'bg-white/10'}`}>
      <TactileSlider 
        min={min} max={max} step={step} 
        value={current} 
        onChange={e => onChange(parseFloat(e.target.value))}
        onMouseUp={onCommit}
        onTouchEnd={onCommit}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
      />
      <div 
        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg border border-black/20"
        style={{ left: `calc(${((current - min) / (max - min)) * 100}% - 6px)` }}
      />
    </div>
  </div>
);
