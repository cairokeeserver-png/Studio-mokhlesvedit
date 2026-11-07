
import React, { useRef, useEffect, useState } from 'react';
import { WardrobeItem, PoseType, PhysicsSettings, MaterialSettings } from '../types';
import { TactileSlider } from './TactileSlider';

interface LocalLightState {
  x: number;
  y: number;
  intensity: number;
}

interface FabricPreset {
  name: string;
  sheen: number;
  roughness: number;
  metallic: number;
  subsurface: number;
  tension: number;
  wrinkleDepth: number;
  description: string;
}

interface PhysicsPreset {
  name: string;
  elasticity: number;
  windStrength: number;
  windResistance: number;
  friction: number;
  bendingStiffness: number;
}

const FABRIC_PRESETS: FabricPreset[] = [
  { name: 'Leather', sheen: 0.4, roughness: 0.3, metallic: 0.0, subsurface: 0.1, tension: 0.8, wrinkleDepth: 0.3, description: 'Premium top-grain leather with a subtle semi-gloss finish.' },
  { name: 'Silk', sheen: 0.8, roughness: 0.1, metallic: 0.0, subsurface: 0.6, tension: 0.2, wrinkleDepth: 0.8, description: 'Ultra-smooth mulberry silk with a high-luster sheen.' },
  { name: 'Cotton', sheen: 0.1, roughness: 0.7, metallic: 0.0, subsurface: 0.2, tension: 0.5, wrinkleDepth: 0.4, description: 'Soft brushed cotton with a matte, breathable texture.' },
  { name: 'Wool', sheen: 0.05, roughness: 0.9, metallic: 0.0, subsurface: 0.0, tension: 0.6, wrinkleDepth: 0.2, description: 'Heavyweight boiled wool with a dense, textured surface.' },
  { name: 'Metallic', sheen: 0.6, roughness: 0.2, metallic: 0.8, subsurface: 0.0, tension: 0.9, wrinkleDepth: 0.7, description: 'Industrial metallic foil with high reflectivity and tech-spec finish.' },
  { name: 'Denim', sheen: 0.2, roughness: 0.8, metallic: 0.0, subsurface: 0.0, tension: 0.5, wrinkleDepth: 0.3, description: 'Sturdy cotton warp-faced textile in which the weft passes under two or more warp threads.' },
  { name: 'Rayon', sheen: 0.3, roughness: 0.5, metallic: 0.0, subsurface: 0.1, tension: 0.6, wrinkleDepth: 0.2, description: 'Manufactured regenerated cellulose fiber with a smooth and comfortable texture.' },
];

const PHYSICS_PRESETS: PhysicsPreset[] = [
  { name: 'Heavy', elasticity: 0.1, windStrength: 0.05, windResistance: 0.8, friction: 0.6, bendingStiffness: 0.8 },
  { name: 'Light', elasticity: 0.4, windStrength: 0.3, windResistance: 0.3, friction: 0.2, bendingStiffness: 0.2 },
  { name: 'Flowing', elasticity: 0.7, windStrength: 0.5, windResistance: 0.1, friction: 0.1, bendingStiffness: 0.05 },
  { name: 'Stiff', elasticity: 0.05, windStrength: 0.02, windResistance: 0.95, friction: 0.8, bendingStiffness: 0.95 },
];

interface Wardrobe3DProps {
  item: WardrobeItem;
  pose: PoseType;
  physics: PhysicsSettings;
  materials: MaterialSettings;
  onUpdate?: (item: WardrobeItem) => void;
  onPoseChange?: (pose: PoseType) => void;
  onPhysicsChange?: (physics: PhysicsSettings) => void;
  onMaterialsChange?: (materials: MaterialSettings) => void;
}

export const Wardrobe3D: React.FC<Wardrobe3DProps> = ({ item, pose, physics, materials, onUpdate, onPoseChange, onPhysicsChange, onMaterialsChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [lastX, setLastX] = useState(0);
  
  // New States
  const [localLight, setLocalLight] = useState<LocalLightState>({ x: 0.5, y: -0.5, intensity: 0.8 });
  const [activeTab, setActiveTab] = useState<'gaffer' | 'material' | 'layers' | 'physics' | 'pose' | 'paint' | null>(null);
  const [wearMap, setWearMap] = useState<number[]>(new Array(40 * 40).fill(0)); // 40x40 grid for wear
  const [brushSize, setBrushSize] = useState(2);
  const [brushIntensity, setBrushIntensity] = useState(0.5);
  const [draggedLayerIndex, setDraggedLayerIndex] = useState<number | null>(null);
  
  const [warpTension, setWarpTension] = useState(materials.warpTension || 0.5);
  const [wrinkleAmplitude, setWrinkleAmplitude] = useState(materials.wrinkleAmplitude || 5.0);
  const [wrinkleFrequency, setWrinkleFrequency] = useState(materials.wrinkleFrequency || 1.0);

  useEffect(() => {
    if (materials.warpTension !== undefined) setWarpTension(materials.warpTension);
    if (materials.wrinkleAmplitude !== undefined) setWrinkleAmplitude(materials.wrinkleAmplitude);
    if (materials.wrinkleFrequency !== undefined) setWrinkleFrequency(materials.wrinkleFrequency);
  }, [materials.warpTension, materials.wrinkleAmplitude, materials.wrinkleFrequency]);

  const applyPreset = (preset: FabricPreset) => {
    if (onMaterialsChange) {
      onMaterialsChange({
        sheen: preset.sheen,
        roughness: preset.roughness,
        metallic: preset.metallic,
        subsurface: preset.subsurface,
        tension: preset.tension,
        wrinkleDepth: preset.wrinkleDepth
      });
    }
    if (onUpdate) {
      onUpdate({ ...item, description: preset.description });
    }
  };

  const applyPhysicsPreset = (preset: PhysicsPreset) => {
    if (onPhysicsChange) {
      onPhysicsChange({
        ...physics,
        elasticity: preset.elasticity,
        windStrength: preset.windStrength,
        windResistance: preset.windResistance,
        friction: preset.friction,
        bendingStiffness: preset.bendingStiffness
      });
    }
  };

  // Parse description for initial material properties
  useEffect(() => {
    const desc = item.description?.toLowerCase() || '';
    const newMats = { sheen: 0.2, roughness: 0.5, metallic: 0.1, subsurface: 0.3, tension: 0.5, wrinkleDepth: 0.5 };
    
    if (desc.includes('gloss') || desc.includes('silk') || desc.includes('satin')) {
      newMats.sheen = 0.7;
      newMats.roughness = 0.2;
      newMats.subsurface = 0.6;
      newMats.tension = 0.2;
      newMats.wrinkleDepth = 0.8;
    }
    if (desc.includes('velvet') || desc.includes('wool') || desc.includes('linen')) {
      newMats.roughness = 0.8;
      newMats.sheen = 0.1;
      newMats.subsurface = 0.0;
      newMats.tension = 0.6;
      newMats.wrinkleDepth = 0.2;
    }
    if (desc.includes('metallic') || desc.includes('nylon')) {
      newMats.metallic = 0.6;
      newMats.sheen = 0.5;
      newMats.subsurface = 0.0;
      newMats.tension = 0.9;
      newMats.wrinkleDepth = 0.7;
    }
    if (desc.includes('leather')) {
      newMats.sheen = 0.4;
      newMats.roughness = 0.3;
      newMats.subsurface = 0.1;
      newMats.tension = 0.8;
      newMats.wrinkleDepth = 0.3;
    }
    
    if (onMaterialsChange) {
       onMaterialsChange(newMats);
    }
  }, [item.description]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame: number;
    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height / 2;

    const render = (time: number) => {
      ctx.clearRect(0, 0, width, height);
      
      const t = time / 1000;

      if (!isDragging) {
        setRotation(prev => prev + 0.008);
      }

      const project = (x: number, y: number, z: number, nx: number, ny: number, nz: number) => {
        const rad = rotation;
        // Rotate point around Y axis
        const rx = x * Math.cos(rad) - z * Math.sin(rad);
        const rz = x * Math.sin(rad) + z * Math.cos(rad);
        
        // Rotate normal around Y axis
        const rnx = nx * Math.cos(rad) - nz * Math.sin(rad);
        const rnz = nx * Math.sin(rad) + nz * Math.cos(rad);
        
        const scale = 280 / (rz + 350);
        return {
          x: cx + rx * scale,
          y: cy + y * scale,
          z: rz,
          nx: rnx,
          ny: ny,
          nz: rnz
        };
      };

      const drawMesh = () => {
        const rows = 24;
        const cols = 20;
        
        const isHoodie = item.meshType === 'hoodie';
        const isJacket = item.meshType === 'jacket';

        // Physics: Advanced Wind with Turbulence
        const windRad = (physics.windDirection * Math.PI) / 180;
        // Turbulence: mix of frequencies
        const turbulence = (Math.sin(t * 3.5) * 0.4 + Math.sin(t * 8.2) * 0.15 + Math.sin(t * 1.1) * 0.45);
        const effectiveWindStrength = physics.windStrength * (1 + turbulence * 0.3) * (1 - physics.windResistance * 0.7);
        
        const windX = Math.cos(windRad) * effectiveWindStrength * 12;
        const windZ = Math.sin(windRad) * effectiveWindStrength * 12;
        
        // Sway influenced by elasticity (higher elasticity = more "springy" overshoot)
        const springFactor = 1 + physics.elasticity * 0.5;
        const swayAmount = isDragging ? 0 : (Math.sin(t * 1.5 * springFactor) * 3 + effectiveWindStrength * 15);
        const gravityStretch = 1.02 + physics.elasticity * 0.08; 

        // Body Collision System (Multi-part)
        const torsoRadiusX = 35;
        const torsoRadiusZ = 25;
        const shoulderRadius = 15;
        const shoulderOffset = 38; // Distance from center to shoulder
        const shoulderY = -60; // Relative Y position of shoulders

        for (let j = 0; j <= rows; j++) {
          const v = j / rows;
          let y = (v - 0.5) * 180 * gravityStretch;
          
          // Posing Logic
          let offsetX = 0;
          let offsetZ = 0;
          let poseRotation = 0;

          if (pose === 'Dynamic') {
            offsetX = Math.sin(v * Math.PI) * 15;
            poseRotation = v * 0.2;
          } else if (pose === 'Catwalk') {
            offsetX = Math.cos(v * Math.PI * 0.5) * 20;
            y += Math.sin(v * Math.PI) * 10;
          } else if (pose === 'Seated') {
            if (v > 0.5) {
              y = (0.5 - 0.5) * 180 * gravityStretch; 
              offsetZ = (v - 0.5) * 60;
            }
          }

          const horizontalSway = (Math.sin(t * 2 + v * 3) * swayAmount + windX) * v;
          const depthSway = (Math.cos(t * 1.5 + v * 2) * swayAmount * 0.5 + windZ) * v;
          
          // Organic Noise Folds (Multi-octave sine approximation)
          const freq = wrinkleFrequency;
          const amp = wrinkleAmplitude;
          const octaves = materials.noiseOctaves || 3;
          const lacunarity = materials.lacunarity || 2.0;
          const hurst = materials.hurstExponent || 0.7;
          
          // Denier and TPI influence wrinkle stiffness and frequency
          const denierFactor = (materials.denier || 150) / 150; // 1.0 is baseline
          const tpiFactor = (materials.tpi || 400) / 400; // 1.0 is baseline
          
          let foldNoise = 0;
          let currentFreq = freq * tpiFactor;
          let currentAmp = amp / denierFactor;
          
          for (let o = 0; o < octaves; o++) {
            foldNoise += (
              Math.sin(v * 12 * currentFreq + t * 2) * 0.4 + 
              Math.sin(v * 25 * currentFreq - t * 3) * 0.2 + 
              Math.sin(v * 40 * currentFreq + t * 5) * 0.1
            ) * currentAmp;
            currentFreq *= lacunarity;
            currentAmp *= Math.pow(lacunarity, -hurst);
          }
          
          foldNoise *= (1 - physics.windResistance) * physics.windStrength * ((materials.wrinkleDepth || 0.5) * 2);

          let baseRadius = 45 + foldNoise;
          if (v < 0.2) baseRadius = 55 + foldNoise; 
          if (v > 0.4 && v < 0.6) baseRadius = 42 + foldNoise; 
          if (v > 0.8) baseRadius = (isJacket ? 52 : 45) + foldNoise; 

          // Tension Effect: Higher tension reduces radius variance
          const tensionFactor = 1 - (materials.tension || 0.5) * 0.5;
          const warpFactor = warpTension;
          const weftFactor = materials.weftTension || 0.5;
          const ratio = materials.warpWeftRatio || 1.0;
          baseRadius *= (1 + Math.sin(v * Math.PI * 2 * warpFactor * ratio) * physics.elasticity * 0.1 * tensionFactor * weftFactor);

          ctx.beginPath();
          for (let i = 0; i <= cols; i++) {
            const u = i / cols;
            const angle = u * Math.PI * 2 + poseRotation;
            
            let radius = baseRadius;
            let featureOffsetZ = 0;

            // Shoulder/Arm Stubs
            if (v < 0.35) {
                const armWidth = Math.sin(v * Math.PI) * 25;
                if (Math.abs(Math.cos(angle)) > 0.7) {
                    radius += armWidth * 0.8;
                }
            }

            // Hoodie Hood
            if (isHoodie && v < 0.15) {
                if (Math.sin(angle) > 0) {
                    featureOffsetZ = Math.sin(angle) * 25 * (0.2 - v);
                    radius += 10;
                }
            }

            // Jacket Open Front
            let gap = 0;
            if (isJacket && Math.sin(angle) < -0.9) {
                gap = 1;
            }

            let px = Math.cos(angle) * radius + horizontalSway + offsetX;
            let pz = Math.sin(angle) * radius + featureOffsetZ + depthSway + offsetZ;
            
            // --- Multi-Point Collision Detection ---
            const localX = px - offsetX;
            const localZ = pz - offsetZ;
            const localY = y;
            
            // Apply bending stiffness (resists sharp folds)
            const stiffness = physics.bendingStiffness || 0.5;
            const smoothedRadius = baseRadius * (1 - stiffness * 0.2) + radius * (stiffness * 0.2);
            radius = smoothedRadius;

            // 1. Torso Collision
            const torsoDistSq = (localX * localX) / (torsoRadiusX * torsoRadiusX) + (localZ * localZ) / (torsoRadiusZ * torsoRadiusZ);
            if (torsoDistSq < 1) {
              const push = 1.05 / Math.sqrt(torsoDistSq);
              // Apply friction (reduces sliding along the surface)
              const friction = physics.friction || 0.3;
              px = offsetX + localX * push * (1 - friction * 0.1);
              pz = offsetZ + localZ * push * (1 - friction * 0.1);
            }

            // 2. Shoulder Collisions (Left & Right)
            [-1, 1].forEach(side => {
              const sx = side * shoulderOffset;
              const dx = localX - sx;
              const dy = localY - shoulderY;
              const dz = localZ;
              const sDistSq = (dx*dx + dy*dy + dz*dz) / (shoulderRadius * shoulderRadius);
              if (sDistSq < 1) {
                const push = 1.1 / Math.sqrt(sDistSq);
                const friction = physics.friction || 0.3;
                px = offsetX + sx + dx * push * (1 - friction * 0.1);
                pz = offsetZ + dz * push * (1 - friction * 0.1);
              }
            });
            // -------------------------------------

            const nx = Math.cos(angle);
            const ny = 0; 
            const nz = Math.sin(angle);

            const p = project(px, y, pz, nx, ny, nz);

            // Lighting Calculation
            const lx = localLight.x;
            const ly = localLight.y;
            const lz = 1.0; 
            
            const dot = p.nx * lx + p.ny * ly + p.nz * lz;
            const diffuse = Math.max(0.05, dot) * localLight.intensity;
            
            // Specular (Sheen)
            const viewZ = 1.0;
            const halfX = lx;
            const halfY = ly;
            const halfZ = lz + viewZ;
            const hLen = Math.sqrt(halfX*halfX + halfY*halfY + halfZ*halfZ);
            const hx = halfX / hLen;
            const hy = halfY / hLen;
            const hz = halfZ / hLen;
            
            const ndoth = Math.max(0, p.nx * hx + p.ny * hy + p.nz * hz);
            
            // Convert dB to linear scale for specular intensity
            const specularDB = materials.specularHighlightDB || -12;
            const specularLinear = Math.pow(10, specularDB / 20);
            
            // Advanced Subsurface Scattering Approximation (Multi-layer)
            // Epidermal layer (0.8-1.2mm): High frequency scattering, sharp falloff
            const epidermalDepth = materials.sssEpidermal || 1.0;
            const epidermalScattering = Math.pow(Math.max(0, -dot), 1.0 / epidermalDepth) * 0.4;
            
            // Dermal layer (2-5mm): Low frequency scattering, soft bleed
            const dermalDepth = materials.sssDermal || 3.0;
            const dermalScattering = Math.pow(Math.max(0, -dot), 1.0 / dermalDepth) * 0.5;
            
            // Bone layer (PRT approximation): Deep scattering, ambient occlusion influence
            const prtFactor = materials.sssBone || 0.2;
            // Fake ambient occlusion based on vertex folds
            const fakeAO = Math.max(0.2, 1.0 - (Math.abs(foldNoise) / (amp * 2 + 0.01))); 
            const boneScattering = Math.max(0, 1.0 - Math.abs(dot)) * prtFactor * fakeAO * 0.3;

            // Shading Model Selection
            let finalColor = 'rgba(255, 255, 255, 0.1)';
            const baseColor = materials.baseColorHex || '#ffffff';
            let r = parseInt(baseColor.slice(1, 3), 16);
            let g = parseInt(baseColor.slice(3, 5), 16);
            let b = parseInt(baseColor.slice(5, 7), 16);

            let currentSheen = materials.sheen;
            let currentRoughness = materials.roughness;
            let currentMetallic = materials.metallic;

            if (materials.layers && materials.layers.length > 0) {
              const orderedLayers = [...materials.layers].reverse();
              orderedLayers.forEach(layer => {
                const lr = parseInt(layer.baseColorHex.slice(1, 3), 16);
                const lg = parseInt(layer.baseColorHex.slice(3, 5), 16);
                const lb = parseInt(layer.baseColorHex.slice(5, 7), 16);
                const op = layer.opacity;
                
                if (layer.blendMode === 'mix') {
                  r = r * (1 - op) + lr * op;
                  g = g * (1 - op) + lg * op;
                  b = b * (1 - op) + lb * op;
                } else if (layer.blendMode === 'add') {
                  const br = Math.min(255, r + lr);
                  const bg = Math.min(255, g + lg);
                  const bb = Math.min(255, b + lb);
                  r = r * (1 - op) + br * op;
                  g = g * (1 - op) + bg * op;
                  b = b * (1 - op) + bb * op;
                } else if (layer.blendMode === 'multiply') {
                  r = r * (1 - op) + ((r * lr) / 255) * op;
                  g = g * (1 - op) + ((g * lg) / 255) * op;
                  b = b * (1 - op) + ((b * lb) / 255) * op;
                } else if (layer.blendMode === 'overlay') {
                  r = r * (1 - op) + (r < 128 ? (2 * r * lr / 255) : (255 - 2 * (255 - r) * (255 - lr) / 255)) * op;
                  g = g * (1 - op) + (g < 128 ? (2 * g * lg / 255) : (255 - 2 * (255 - g) * (255 - lg) / 255)) * op;
                  b = b * (1 - op) + (b < 128 ? (2 * b * lb / 255) : (255 - 2 * (255 - b) * (255 - lb) / 255)) * op;
                }
                
                currentSheen = currentSheen * (1 - op) + layer.sheen * op;
                currentRoughness = currentRoughness * (1 - op) + layer.roughness * op;
                currentMetallic = currentMetallic * (1 - op) + layer.metallic * op;
              });
            }

            const specular = Math.pow(ndoth, 10 / (currentRoughness + 0.1)) * currentSheen * specularLinear;

            // Dirt Effect
            const dirtAmount = materials.dirtAmount || 0;
            const mapX = Math.floor(u * 39);
            const mapY = Math.floor(v * 39);
            const mapIdx = mapY * 40 + mapX;
            const paintedDirt = wearMap[mapIdx] || 0;
            
            if (dirtAmount > 0 || paintedDirt > 0) {
              const dirtColor = materials.dirtColorHex || '#4a3b2c';
              const dirtR = parseInt(dirtColor.slice(1, 3), 16);
              const dirtG = parseInt(dirtColor.slice(3, 5), 16);
              const dirtB = parseInt(dirtColor.slice(5, 7), 16);
              
              // Procedural dirt placement based on noise and position
              const dirtNoise = Math.sin(v * 20 + i * 5) * Math.cos(v * 10 - i * 3) * 0.5 + 0.5;
              const localDirt = Math.min(1, dirtAmount * dirtNoise + paintedDirt * 0.8);
              
              r = r * (1 - localDirt) + dirtR * localDirt;
              g = g * (1 - localDirt) + dirtG * localDirt;
              b = b * (1 - localDirt) + dirtB * localDirt;
            }

            if (materials.shadingModel === 'Toon') {
              const steps = 3;
              const toonDiffuse = Math.floor(diffuse * steps) / steps;
              const toonSpecular = specular > 0.5 ? 1.0 : 0.0;
              const brightness = toonDiffuse + toonSpecular;
              finalColor = `rgba(${r * brightness}, ${g * brightness}, ${b * brightness}, ${0.1 + (1 - v) * 0.1})`;
            } else if (materials.shadingModel === 'Gooch') {
              const warmColor = [255, 200, 150];
              const coolColor = [50, 50, 150];
              const alpha = 0.2;
              const beta = 0.6;
              const kd = diffuse;
              const goochR = coolColor[0] + kd * alpha * r + (1 - kd) * beta * warmColor[0];
              const goochG = coolColor[1] + kd * alpha * g + (1 - kd) * beta * warmColor[1];
              const goochB = coolColor[2] + kd * alpha * b + (1 - kd) * beta * warmColor[2];
              finalColor = `rgba(${goochR}, ${goochG}, ${goochB}, ${0.1 + (1 - v) * 0.1})`;
            } else {
              // PBR (Default)
              // Thin Film Interference (Iridescence)
              let iridescenceR = 0;
              let iridescenceG = 0;
              let iridescenceB = 0;
              if (materials.thinFilmThickness > 0) {
                const viewAngle = Math.max(0, p.nx * lx + p.ny * ly + p.nz * lz); // Simplified view angle
                const phase = materials.thinFilmThickness * viewAngle * 0.01;
                iridescenceR = Math.sin(phase) * 0.5 + 0.5;
                iridescenceG = Math.sin(phase + 2.0) * 0.5 + 0.5;
                iridescenceB = Math.sin(phase + 4.0) * 0.5 + 0.5;
              }

              // Refraction / Dispersion (Simplified approximation for wireframe)
              let refractionAlpha = 1.0;
              let dispersionOffsetR = 0;
              let dispersionOffsetB = 0;
              if (materials.ior > 1.0) {
                  refractionAlpha = 1.0 - (materials.ior - 1.0) * 0.5;
                  const dispersionAmount = materials.dispersion || 0;
                  dispersionOffsetR = dispersionAmount * 20 * (1 - p.nx);
                  dispersionOffsetB = -dispersionAmount * 20 * (1 - p.nx);
              }
              
              // SSS Color
              const sssColor = materials.sssColorHex || '#ffcccc';
              const sssR = parseInt(sssColor.slice(1, 3), 16);
              const sssG = parseInt(sssColor.slice(3, 5), 16);
              const sssB = parseInt(sssColor.slice(5, 7), 16);
              
              const sssBase = (materials.subsurface || 0) * localLight.intensity;
              const sssAmount = sssBase * (epidermalScattering + dermalScattering + boneScattering);

              const brightness = diffuse + specular;
              const finalR = r * brightness + iridescenceR * 50 * currentMetallic + sssR * sssAmount + dispersionOffsetR;
              const finalG = g * brightness + iridescenceG * 50 * currentMetallic + sssG * sssAmount;
              const finalB = b * brightness + iridescenceB * 50 * currentMetallic + sssB * sssAmount + dispersionOffsetB;
              
              finalColor = `rgba(${finalR}, ${finalG}, ${finalB}, ${(0.1 + (1 - v) * 0.1) * refractionAlpha})`;
            }

            ctx.strokeStyle = finalColor;
            
            if (gap === 0) {
              // Wear Effect: Skip drawing some segments based on wearAmount and TPI
              const tpiFactor = (materials.tpi || 400) / 1000; // Normalize TPI
              
              // Sample wear map based on u, v coordinates
              const mapX = Math.floor(u * 39);
              const mapY = Math.floor(v * 39);
              const mapIdx = mapY * 40 + mapX;
              const paintedWear = wearMap[mapIdx] || 0;
              
              const wearThreshold = (materials.wearAmount * 0.8 + paintedWear * 0.5) * (1 - tpiFactor * 0.5); // Higher TPI = less wear
              const isWorn = Math.random() < wearThreshold;
              
              if (i === 0 || isWorn) {
                ctx.moveTo(p.x, p.y);
              } else {
                ctx.lineTo(p.x, p.y);
              }
            } else {
              ctx.stroke();
              ctx.beginPath();
            }
          }
          
          ctx.lineWidth = 0.8;
          ctx.stroke();

          // Vertical "Ribs"
          if (j % 2 === 0) {
              for (let i = 0; i <= cols; i += 5) {
                const u = i / cols;
                const angle = u * Math.PI * 2;
                let r = baseRadius;
                if (v < 0.35 && Math.abs(Math.cos(angle)) > 0.7) r += Math.sin(v * Math.PI) * 20;
                
                const p1 = project(Math.cos(angle) * r + horizontalSway + offsetX, y, Math.sin(angle) * r + depthSway + offsetZ, 0, 0, 0);
                const p2 = project(Math.cos(angle) * r + horizontalSway + offsetX, y + 8, Math.sin(angle) * r + depthSway + offsetZ, 0, 0, 0);
                
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.strokeStyle = `rgba(255, 255, 255, ${0.05})`;
                ctx.stroke();
              }
          }
        }

        // Feature: Collar/Hood line
        if (item.meshType === 'shirt' || item.meshType === 'jacket') {
            ctx.beginPath();
            for(let a=0; a<Math.PI*2; a+=0.2) {
                const p = project(Math.cos(a)*30 + Math.sin(t*2)*swayAmount*0.1, -95, Math.sin(a)*30, 0, 0, 0);
                if (a===0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
            }
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.stroke();
        }

        // Scanning Line Effect
        const scanPos = (Math.sin(t * 1.2) * 0.5 + 0.5);
        const scanY = cy - 90 + scanPos * 180;
        const scanGradient = ctx.createLinearGradient(cx - 100, scanY, cx + 100, scanY);
        scanGradient.addColorStop(0, 'rgba(255,255,255,0)');
        scanGradient.addColorStop(0.5, `rgba(255,255,255,${0.2 + materials.sheen * 0.3})`);
        scanGradient.addColorStop(1, 'rgba(255,255,255,0)');
        
        ctx.fillStyle = scanGradient;
        ctx.fillRect(cx - 120, scanY, 240, 1);
      };

      drawMesh();
      frame = requestAnimationFrame(render);
    };

    frame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frame);
  }, [rotation, isDragging, item, localLight, materials, pose, physics, warpTension, wrinkleAmplitude, wrinkleFrequency]);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setLastX(e.clientX);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    if (activeTab === 'paint') {
      paintWear(e);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    if (activeTab === 'paint') {
      paintWear(e);
    } else {
      const delta = e.clientX - lastX;
      setRotation(prev => prev + delta * 0.015);
      setLastX(e.clientX);
    }
  };

  const paintWear = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Map canvas coordinates to 40x40 grid
    const gridX = Math.floor((x / canvas.width) * 40);
    const gridY = Math.floor((y / canvas.height) * 40);
    
    if (gridX >= 0 && gridX < 40 && gridY >= 0 && gridY < 40) {
      setWearMap(prev => {
        const newMap = [...prev];
        // Apply brush with size
        for (let i = -brushSize; i <= brushSize; i++) {
          for (let j = -brushSize; j <= brushSize; j++) {
            const px = gridX + i;
            const py = gridY + j;
            if (px >= 0 && px < 40 && py >= 0 && py < 40) {
              const dist = Math.sqrt(i*i + j*j);
              if (dist <= brushSize) {
                const idx = py * 40 + px;
                const intensity = brushIntensity * (1 - dist / brushSize);
                newMap[idx] = Math.min(1, newMap[idx] + intensity);
              }
            }
          }
        }
        return newMap;
      });
    }
  };

  return (
    <div className={`relative group flex flex-col items-center ${activeTab === 'paint' ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'}`}>
      <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/[0.05] to-transparent pointer-events-none"></div>
      
      {/* Main Canvas */}
      <canvas 
        ref={canvasRef} 
        width={320} 
        height={320} 
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={() => setIsDragging(false)}
        className="rounded-[60px] bg-black/60 border border-white/5 shadow-2xl"
      />

      {/* Controls Overlay */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
        <button 
          onClick={() => setActiveTab(activeTab === 'gaffer' ? null : 'gaffer')}
          className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${activeTab === 'gaffer' ? 'bg-white text-black border-white' : 'bg-black/40 text-white/60 border-white/10 hover:border-white/40'}`}
        >
          <i className="fa-solid fa-lightbulb text-[10px]"></i>
        </button>
        <button 
          onClick={() => setActiveTab(activeTab === 'material' ? null : 'material')}
          className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${activeTab === 'material' ? 'bg-white text-black border-white' : 'bg-black/40 text-white/60 border-white/10 hover:border-white/40'}`}
          title="Base Material"
        >
          <i className="fa-solid fa-cube text-[10px]"></i>
        </button>
        <button 
          onClick={() => setActiveTab(activeTab === 'layers' ? null : 'layers')}
          className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${activeTab === 'layers' ? 'bg-white text-black border-white' : 'bg-black/40 text-white/60 border-white/10 hover:border-white/40'}`}
          title="Material Layers"
        >
          <i className="fa-solid fa-layer-group text-[10px]"></i>
        </button>
        <button 
          onClick={() => setActiveTab(activeTab === 'physics' ? null : 'physics')}
          className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${activeTab === 'physics' ? 'bg-white text-black border-white' : 'bg-black/40 text-white/60 border-white/10 hover:border-white/40'}`}
          title="Physics Presets"
        >
          <i className="fa-solid fa-wind text-[10px]"></i>
        </button>
        <button 
          onClick={() => setActiveTab(activeTab === 'pose' ? null : 'pose')}
          className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${activeTab === 'pose' ? 'bg-white text-black border-white' : 'bg-black/40 text-white/60 border-white/10 hover:border-white/40'}`}
        >
          <i className="fa-solid fa-person-rays text-[10px]"></i>
        </button>
        <button 
          onClick={() => setActiveTab(activeTab === 'paint' ? null : 'paint')}
          className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${activeTab === 'paint' ? 'bg-white text-black border-white' : 'bg-black/40 text-white/60 border-white/10 hover:border-white/40'}`}
          title="Paint Wear & Dirt"
        >
          <i className="fa-solid fa-paint-brush text-[10px]"></i>
        </button>
      </div>

      {/* Floating Panels */}
      {activeTab === 'gaffer' && (
        <div className="absolute top-4 left-4 w-32 bg-black/80 backdrop-blur-md p-4 rounded-3xl border border-white/10 flex flex-col gap-3 animate-in fade-in slide-in-from-left-2">
          <h4 className="text-[7px] uppercase tracking-widest text-white/40 font-bold mb-1">Local Gaffer</h4>
          <div className="flex flex-col gap-1">
            <span className="text-[6px] text-white/30 uppercase">Intensity</span>
            <TactileSlider 
              min="0" max="1" step="0.01" 
              value={localLight.intensity} 
              onChange={e => setLocalLight(prev => ({ ...prev, intensity: parseFloat(e.target.value) }))}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[6px] text-white/30 uppercase">Direction X</span>
            <TactileSlider 
              min="-1" max="1" step="0.01" 
              value={localLight.x} 
              onChange={e => setLocalLight(prev => ({ ...prev, x: parseFloat(e.target.value) }))}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[6px] text-white/30 uppercase">Direction Y</span>
            <TactileSlider 
              min="-1" max="1" step="0.01" 
              value={localLight.y} 
              onChange={e => setLocalLight(prev => ({ ...prev, y: parseFloat(e.target.value) }))}
            />
          </div>
        </div>
      )}

      {activeTab === 'material' && (
        <div className="absolute top-4 left-4 w-40 bg-black/80 backdrop-blur-md p-4 rounded-3xl border border-white/10 flex flex-col gap-3 animate-in fade-in slide-in-from-left-2">
          <h4 className="text-[7px] uppercase tracking-widest text-white/40 font-bold mb-1">Surface Physics</h4>
          
          {/* Fabric Presets */}
          <div className="grid grid-cols-2 gap-1 mb-2">
            {FABRIC_PRESETS.map(preset => (
              <button 
                key={preset.name}
                onClick={() => applyPreset(preset)}
                className={`px-2 py-1 rounded-lg text-[6px] uppercase tracking-tighter border transition-all ${item.description === preset.description ? 'bg-white text-black border-white' : 'bg-white/5 text-white/40 border-white/10 hover:border-white/20'}`}
              >
                {preset.name}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[6px] text-white/30 uppercase">Sheen</span>
            <TactileSlider 
              min="0" max="1" step="0.01" 
              value={materials.sheen} 
              onChange={e => onMaterialsChange?.({ ...materials, sheen: parseFloat(e.target.value) })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[6px] text-white/30 uppercase">Roughness</span>
            <TactileSlider 
              min="0" max="1" step="0.01" 
              value={materials.roughness} 
              onChange={e => onMaterialsChange?.({ ...materials, roughness: parseFloat(e.target.value) })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[6px] text-white/30 uppercase">Metallic</span>
            <TactileSlider 
              min="0" max="1" step="0.01" 
              value={materials.metallic} 
              onChange={e => onMaterialsChange?.({ ...materials, metallic: parseFloat(e.target.value) })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[6px] text-white/30 uppercase">Subsurface</span>
            <TactileSlider 
              min="0" max="1" step="0.01" 
              value={materials.subsurface || 0} 
              onChange={e => onMaterialsChange?.({ ...materials, subsurface: parseFloat(e.target.value) })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[6px] text-white/30 uppercase">Tension</span>
            <TactileSlider 
              min="0" max="1" step="0.01" 
              value={materials.tension || 0} 
              onChange={e => onMaterialsChange?.({ ...materials, tension: parseFloat(e.target.value) })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[6px] text-white/30 uppercase">Wrinkle Depth</span>
            <TactileSlider 
              min="0" max="1" step="0.01" 
              value={materials.wrinkleDepth || 0} 
              onChange={e => onMaterialsChange?.({ ...materials, wrinkleDepth: parseFloat(e.target.value) })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[6px] text-white/30 uppercase">Warp Tension</span>
            <TactileSlider 
              min="0.1" max="1" step="0.01" 
              value={warpTension} 
              onChange={e => {
                const val = parseFloat(e.target.value);
                setWarpTension(val);
                onMaterialsChange?.({ ...materials, warpTension: val });
              }}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[6px] text-white/30 uppercase">Weft Tension</span>
            <TactileSlider 
              min="0.1" max="1" step="0.01" 
              value={materials.weftTension || 0.5} 
              onChange={e => onMaterialsChange?.({ ...materials, weftTension: parseFloat(e.target.value) })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[6px] text-white/30 uppercase">Wrinkle Freq</span>
            <TactileSlider 
              min="0.1" max="5" step="0.1" 
              value={wrinkleFrequency} 
              onChange={e => {
                const val = parseFloat(e.target.value);
                setWrinkleFrequency(val);
                onMaterialsChange?.({ ...materials, wrinkleFrequency: val });
              }}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[6px] text-white/30 uppercase">Wrinkle Amp</span>
            <TactileSlider 
              min="0" max="20" step="0.5" 
              value={wrinkleAmplitude} 
              onChange={e => {
                const val = parseFloat(e.target.value);
                setWrinkleAmplitude(val);
                onMaterialsChange?.({ ...materials, wrinkleAmplitude: val });
              }}
            />
          </div>
          
          <div className="border-t border-white/10 mt-2 pt-2 flex flex-col gap-2">
            <h4 className="text-[6px] uppercase tracking-widest text-white/30 font-bold">Subsurface Scattering (SSS)</h4>
            <div className="flex flex-col gap-1">
              <span className="text-[6px] text-white/30 uppercase">SSS Color</span>
              <input 
                type="color" 
                value={materials.sssColorHex || '#ffcccc'}
                onChange={e => onMaterialsChange?.({ ...materials, sssColorHex: e.target.value })}
                className="w-full h-6 rounded bg-transparent border-none cursor-pointer"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[6px] text-white/30 uppercase">Epidermal (0.8-1.2mm)</span>
              <TactileSlider 
                min="0.8" max="1.2" step="0.01" 
                value={materials.sssEpidermal || 1.0} 
                onChange={e => onMaterialsChange?.({ ...materials, sssEpidermal: parseFloat(e.target.value) })}
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[6px] text-white/30 uppercase">Dermal (2-5mm)</span>
              <TactileSlider 
                min="2" max="5" step="0.1" 
                value={materials.sssDermal || 3.0} 
                onChange={e => onMaterialsChange?.({ ...materials, sssDermal: parseFloat(e.target.value) })}
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[6px] text-white/30 uppercase">Bone (PRT)</span>
              <TactileSlider 
                min="0" max="1" step="0.01" 
                value={materials.sssBone || 0.2} 
                onChange={e => onMaterialsChange?.({ ...materials, sssBone: parseFloat(e.target.value) })}
              />
            </div>
          </div>

          <div className="border-t border-white/10 mt-2 pt-2 flex flex-col gap-2">
            <h4 className="text-[6px] uppercase tracking-widest text-white/30 font-bold">Advanced Shading</h4>
            <div className="flex flex-col gap-1">
              <span className="text-[6px] text-white/30 uppercase">Shading Model</span>
              <select 
                value={materials.shadingModel || 'PBR'}
                onChange={e => onMaterialsChange?.({ ...materials, shadingModel: e.target.value as any })}
                className="bg-white/5 border border-white/10 rounded-lg text-[8px] text-white/70 p-1"
              >
                <option value="PBR">PBR (Disney)</option>
                <option value="Gooch">Gooch (NPR)</option>
                <option value="Toon">Toon (NPR)</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[6px] text-white/30 uppercase">Base Color</span>
              <input 
                type="color" 
                value={materials.baseColorHex || '#ffffff'}
                onChange={e => onMaterialsChange?.({ ...materials, baseColorHex: e.target.value })}
                className="w-full h-6 rounded bg-transparent border-none cursor-pointer"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[6px] text-white/30 uppercase">IOR (Refraction)</span>
              <TactileSlider 
                min="1.0" max="2.5" step="0.01" 
                value={materials.ior || 1.45} 
                onChange={e => onMaterialsChange?.({ ...materials, ior: parseFloat(e.target.value) })}
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[6px] text-white/30 uppercase">Dispersion</span>
              <TactileSlider 
                min="0" max="1" step="0.01" 
                value={materials.dispersion || 0.1} 
                onChange={e => onMaterialsChange?.({ ...materials, dispersion: parseFloat(e.target.value) })}
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[6px] text-white/30 uppercase">Thin Film (nm)</span>
              <TactileSlider 
                min="50" max="500" step="1" 
                value={materials.thinFilmThickness || 250} 
                onChange={e => onMaterialsChange?.({ ...materials, thinFilmThickness: parseFloat(e.target.value) })}
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[6px] text-white/30 uppercase">Specular (dB)</span>
              <TactileSlider 
                min="-60" max="12" step="0.1" 
                value={materials.specularHighlightDB || -12} 
                onChange={e => onMaterialsChange?.({ ...materials, specularHighlightDB: parseFloat(e.target.value) })}
              />
            </div>
          </div>

          <div className="border-t border-white/10 mt-2 pt-2 flex flex-col gap-2">
            <h4 className="text-[6px] uppercase tracking-widest text-white/30 font-bold">Fabric Structure</h4>
            <div className="flex flex-col gap-1">
              <span className="text-[6px] text-white/30 uppercase">TPI (Density)</span>
              <TactileSlider 
                min="100" max="1000" step="10" 
                value={materials.tpi || 400} 
                onChange={e => onMaterialsChange?.({ ...materials, tpi: parseFloat(e.target.value) })}
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[6px] text-white/30 uppercase">Denier</span>
              <TactileSlider 
                min="75" max="300" step="5" 
                value={materials.denier || 150} 
                onChange={e => onMaterialsChange?.({ ...materials, denier: parseFloat(e.target.value) })}
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[6px] text-white/30 uppercase">Wear Amount</span>
              <TactileSlider 
                min="0" max="1" step="0.01" 
                value={materials.wearAmount || 0} 
                onChange={e => onMaterialsChange?.({ ...materials, wearAmount: parseFloat(e.target.value) })}
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[6px] text-white/30 uppercase">Dirt Amount</span>
              <TactileSlider 
                min="0" max="1" step="0.01" 
                value={materials.dirtAmount || 0} 
                onChange={e => onMaterialsChange?.({ ...materials, dirtAmount: parseFloat(e.target.value) })}
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[6px] text-white/30 uppercase">Dirt Color</span>
              <input 
                type="color" 
                value={materials.dirtColorHex || '#4a3b2c'}
                onChange={e => onMaterialsChange?.({ ...materials, dirtColorHex: e.target.value })}
                className="w-full h-6 rounded bg-transparent border-none cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'physics' && (
        <div className="absolute top-4 left-4 w-48 bg-black/80 backdrop-blur-md p-4 rounded-3xl border border-white/10 flex flex-col gap-3 animate-in fade-in slide-in-from-left-2 max-h-[80vh] overflow-y-auto scrollbar-none">
          <h4 className="text-[7px] uppercase tracking-widest text-white/40 font-bold mb-1">Physics Presets</h4>
          <div className="grid grid-cols-2 gap-1 mb-1">
            {PHYSICS_PRESETS.map(preset => (
              <button 
                key={preset.name}
                onClick={() => applyPhysicsPreset(preset)}
                className={`px-2 py-1 rounded-lg text-[6px] uppercase tracking-tighter border transition-all ${physics.elasticity === preset.elasticity && physics.windStrength === preset.windStrength ? 'bg-white text-black border-white' : 'bg-white/5 text-white/40 border-white/10 hover:border-white/20'}`}
              >
                {preset.name}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[6px] text-white/30 uppercase">Elasticity</span>
            <TactileSlider 
              min="0" max="1" step="0.01" 
              value={physics.elasticity} 
              onChange={e => onPhysicsChange?.({ ...physics, elasticity: parseFloat(e.target.value) })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[6px] text-white/30 uppercase">Wind</span>
            <TactileSlider 
              min="0" max="1" step="0.01" 
              value={physics.windStrength} 
              onChange={e => onPhysicsChange?.({ ...physics, windStrength: parseFloat(e.target.value) })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[6px] text-white/30 uppercase">Direction</span>
            <TactileSlider 
              min="0" max="360" step="1" 
              value={physics.windDirection} 
              onChange={e => onPhysicsChange?.({ ...physics, windDirection: parseFloat(e.target.value) })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[6px] text-white/30 uppercase">Resistance</span>
            <TactileSlider 
              min="0" max="1" step="0.01" 
              value={physics.windResistance} 
              onChange={e => onPhysicsChange?.({ ...physics, windResistance: parseFloat(e.target.value) })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[6px] text-white/30 uppercase">Friction</span>
            <TactileSlider 
              min="0.1" max="0.8" step="0.01" 
              value={physics.friction || 0.3} 
              onChange={e => onPhysicsChange?.({ ...physics, friction: parseFloat(e.target.value) })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[6px] text-white/30 uppercase">Bending Stiffness</span>
            <TactileSlider 
              min="0.01" max="1.0" step="0.01" 
              value={physics.bendingStiffness || 0.5} 
              onChange={e => onPhysicsChange?.({ ...physics, bendingStiffness: parseFloat(e.target.value) })}
            />
          </div>
        </div>
      )}

      {activeTab === 'layers' && (
        <div className="absolute top-4 left-4 w-48 bg-black/80 backdrop-blur-md p-4 rounded-3xl border border-white/10 flex flex-col gap-3 animate-in fade-in slide-in-from-left-2 max-h-[80vh] overflow-y-auto scrollbar-none">
          <div className="flex justify-between items-center mb-1">
            <h4 className="text-[7px] uppercase tracking-widest text-white/40 font-bold">Material Layers</h4>
            <button 
              onClick={() => {
                const newLayer = {
                  id: `layer-${Date.now()}`,
                  name: `Layer ${(materials.layers?.length || 0) + 1}`,
                  baseColorHex: '#ffffff',
                  sheen: 0.5,
                  roughness: 0.5,
                  metallic: 0.0,
                  opacity: 0.5,
                  blendMode: 'mix' as const
                };
                onMaterialsChange?.({ ...materials, layers: [...(materials.layers || []), newLayer] });
              }}
              className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <i className="fa-solid fa-plus text-[8px] text-white"></i>
            </button>
          </div>
          
          {(!materials.layers || materials.layers.length === 0) && (
            <div className="text-[6px] text-white/30 text-center py-4 border border-dashed border-white/10 rounded-xl">
              No layers added. Click + to add a new material layer.
            </div>
          )}

          {materials.layers?.map((layer, index) => (
            <div 
              key={layer.id} 
              draggable
              onDragStart={(e) => {
                setDraggedLayerIndex(index);
                e.dataTransfer.effectAllowed = 'move';
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (draggedLayerIndex !== null && draggedLayerIndex !== index) {
                  const newLayers = [...(materials.layers || [])];
                  const [removed] = newLayers.splice(draggedLayerIndex, 1);
                  newLayers.splice(index, 0, removed);
                  onMaterialsChange?.({ ...materials, layers: newLayers });
                }
                setDraggedLayerIndex(null);
              }}
              onDragEnd={() => setDraggedLayerIndex(null)}
              className={`bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col gap-2 relative group cursor-move transition-all ${draggedLayerIndex === index ? 'opacity-50 scale-95' : ''}`}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-grip-vertical text-[8px] text-white/20"></i>
                  <input 
                    type="text" 
                    value={layer.name}
                    onChange={e => {
                      const newLayers = [...(materials.layers || [])];
                      newLayers[index] = { ...layer, name: e.target.value };
                      onMaterialsChange?.({ ...materials, layers: newLayers });
                    }}
                    className="bg-transparent border-none text-[8px] text-white font-bold outline-none w-20"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => {
                      if (index > 0) {
                        const newLayers = [...(materials.layers || [])];
                        const temp = newLayers[index - 1];
                        newLayers[index - 1] = newLayers[index];
                        newLayers[index] = temp;
                        onMaterialsChange?.({ ...materials, layers: newLayers });
                      }
                    }}
                    disabled={index === 0}
                    className="text-white/30 hover:text-white transition-colors disabled:opacity-30 disabled:hover:text-white/30"
                  >
                    <i className="fa-solid fa-chevron-up text-[8px]"></i>
                  </button>
                  <button 
                    onClick={() => {
                      if (materials.layers && index < materials.layers.length - 1) {
                        const newLayers = [...(materials.layers || [])];
                        const temp = newLayers[index + 1];
                        newLayers[index + 1] = newLayers[index];
                        newLayers[index] = temp;
                        onMaterialsChange?.({ ...materials, layers: newLayers });
                      }
                    }}
                    disabled={materials.layers && index === materials.layers.length - 1}
                    className="text-white/30 hover:text-white transition-colors disabled:opacity-30 disabled:hover:text-white/30"
                  >
                    <i className="fa-solid fa-chevron-down text-[8px]"></i>
                  </button>
                  <button 
                    onClick={() => {
                      const newLayers = [...(materials.layers || [])];
                      newLayers.splice(index, 1);
                      onMaterialsChange?.({ ...materials, layers: newLayers });
                    }}
                    className="text-red-400/50 hover:text-red-400 transition-colors ml-1"
                  >
                    <i className="fa-solid fa-trash text-[8px]"></i>
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[6px] text-white/30 uppercase">Blend Mode</span>
                <div className="flex gap-1">
                  {['mix', 'add', 'multiply', 'overlay'].map(mode => (
                    <button
                      key={mode}
                      onClick={() => {
                        const newLayers = [...(materials.layers || [])];
                        newLayers[index] = { ...layer, blendMode: mode as any };
                        onMaterialsChange?.({ ...materials, layers: newLayers });
                      }}
                      className={`flex-1 py-1 rounded text-[6px] uppercase tracking-tighter border transition-all ${layer.blendMode === mode ? 'bg-white text-black border-white' : 'bg-black/40 text-white/60 border-white/10 hover:border-white/40'}`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[6px] text-white/30 uppercase">Color</span>
                <input 
                  type="color" 
                  value={layer.baseColorHex}
                  onChange={e => {
                    const newLayers = [...(materials.layers || [])];
                    newLayers[index] = { ...layer, baseColorHex: e.target.value };
                    onMaterialsChange?.({ ...materials, layers: newLayers });
                  }}
                  className="w-full h-4 rounded bg-transparent border-none cursor-pointer"
                />
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[6px] text-white/30 uppercase">Opacity</span>
                <TactileSlider 
                  min="0" max="1" step="0.01" 
                  value={layer.opacity} 
                  onChange={e => {
                    const newLayers = [...(materials.layers || [])];
                    newLayers[index] = { ...layer, opacity: parseFloat(e.target.value) };
                    onMaterialsChange?.({ ...materials, layers: newLayers });
                  }}
                />
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[6px] text-white/30 uppercase">Sheen</span>
                <TactileSlider 
                  min="0" max="1" step="0.01" 
                  value={layer.sheen} 
                  onChange={e => {
                    const newLayers = [...(materials.layers || [])];
                    newLayers[index] = { ...layer, sheen: parseFloat(e.target.value) };
                    onMaterialsChange?.({ ...materials, layers: newLayers });
                  }}
                />
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[6px] text-white/30 uppercase">Roughness</span>
                <TactileSlider 
                  min="0" max="1" step="0.01" 
                  value={layer.roughness} 
                  onChange={e => {
                    const newLayers = [...(materials.layers || [])];
                    newLayers[index] = { ...layer, roughness: parseFloat(e.target.value) };
                    onMaterialsChange?.({ ...materials, layers: newLayers });
                  }}
                />
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[6px] text-white/30 uppercase">Metallic</span>
                <TactileSlider 
                  min="0" max="1" step="0.01" 
                  value={layer.metallic} 
                  onChange={e => {
                    const newLayers = [...(materials.layers || [])];
                    newLayers[index] = { ...layer, metallic: parseFloat(e.target.value) };
                    onMaterialsChange?.({ ...materials, layers: newLayers });
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'pose' && (
        <div className="absolute top-4 left-4 w-32 bg-black/80 backdrop-blur-md p-4 rounded-3xl border border-white/10 flex flex-col gap-3 animate-in fade-in slide-in-from-left-2">
          <h4 className="text-[7px] uppercase tracking-widest text-white/40 font-bold mb-1">Pose Rig</h4>
          <div className="flex flex-col gap-1">
            {(['Neutral', 'Dynamic', 'Catwalk', 'Seated'] as PoseType[]).map(p => (
              <button 
                key={p}
                onClick={() => onPoseChange?.(p)}
                className={`w-full py-2 rounded-xl text-[7px] uppercase tracking-widest border transition-all ${pose === p ? 'bg-white text-black border-white' : 'bg-white/5 text-white/40 border-white/10 hover:text-white'}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'paint' && (
        <div className="absolute top-4 left-4 w-40 bg-black/80 backdrop-blur-md p-4 rounded-3xl border border-white/10 flex flex-col gap-3 animate-in fade-in slide-in-from-left-2">
          <h4 className="text-[7px] uppercase tracking-widest text-white/40 font-bold mb-1">UV Paint Tool</h4>
          <p className="text-[6px] text-white/50 mb-2 leading-relaxed">
            Click and drag on the 3D model to paint wear and dirt patterns directly onto the fabric surface.
          </p>
          <div className="flex flex-col gap-1">
            <span className="text-[6px] text-white/30 uppercase">Brush Size</span>
            <TactileSlider 
              min="1" max="10" step="1" 
              value={brushSize} 
              onChange={e => setBrushSize(parseFloat(e.target.value))}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[6px] text-white/30 uppercase">Brush Intensity</span>
            <TactileSlider 
              min="0.1" max="1.0" step="0.1" 
              value={brushIntensity} 
              onChange={e => setBrushIntensity(parseFloat(e.target.value))}
            />
          </div>
          <button 
            onClick={() => setWearMap(new Array(40 * 40).fill(0))}
            className="mt-2 w-full py-2 rounded-xl text-[7px] uppercase tracking-widest border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all"
          >
            Clear Canvas
          </button>
        </div>
      )}

      <div className="absolute top-6 left-0 right-0 text-center pointer-events-none">
        <span className="text-[7px] uppercase tracking-[0.6em] text-white/30 font-bold">Spectral Mesh Analysis</span>
      </div>
      
      {/* Mesh Data HUD */}
      <div className="absolute bottom-6 left-6 flex flex-col gap-1 pointer-events-none">
        <span className="text-[6px] font-mono text-white/20 uppercase tracking-tighter">Topology: Quad-Slice</span>
        <span className="text-[6px] font-mono text-white/20 uppercase tracking-tighter">Sub-D: Level 2</span>
        <span className="text-[6px] font-mono text-white/40 uppercase tracking-tighter mt-1">
          {materials.sheen > 0.5 ? 'High Specular' : 'Matte Finish'}
        </span>
      </div>

      <div className="absolute bottom-6 right-6 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[6px] uppercase tracking-widest text-white/40">
          Rotate to Inspect Fit
        </div>
      </div>
    </div>
  );
};
