
export type LensType = '35mm' | '50mm' | '85mm' | 'Petzval' | 'Anamorphic' | 'Super8' | 'Macro';

export type PoseType = 'Neutral' | 'Dynamic' | 'Catwalk' | 'Seated';

export interface LightState {
  x: number; // -1 to 1
  y: number; // -1 to 1
  z: number; // 0.1 (Close/Soft) to 2.0 (Far/Hard)
  intensity: number; // 0 to 1
  temperature: number; // Kelvin: 2000 to 10000
  color: string; // Hex color
}

export interface BasicEdits {
  exposure: number;
  contrast: number;
  saturation: number;
  vibrance: number;
  tint: number;
  activeFilter: string | null;
}

export interface PhysicsSettings {
  elasticity: number; // 0 to 1
  windStrength: number; // 0 to 1
  windDirection: number; // 0 to 360
  windResistance: number; // 0 to 1
  friction: number;
  bendingStiffness: number;
}

export interface WardrobeItem {
  id: string;
  name: string;
  image: string;
  type: 'top' | 'bottom' | 'outerwear' | 'custom';
  description?: string;
  meshType?: 'jacket' | 'shirt' | 'hoodie';
}

export type BokehShape = 'circle' | 'hexagon' | 'octagon' | 'star' | 'heart';

export interface LensSettings {
  model: LensType;
  focalLength: number; // mm
  aperture: number; // f-stop
  distortion: number; // -1 to 1
  bokehShape: BokehShape;
}

export interface MaterialLayer {
  id: string;
  name: string;
  baseColorHex: string;
  sheen: number;
  roughness: number;
  metallic: number;
  opacity: number;
  blendMode: 'mix' | 'add' | 'multiply' | 'overlay';
}

export interface MaterialSettings {
  sheen: number;
  roughness: number;
  metallic: number;
  subsurface: number;
  tension: number;
  wrinkleDepth: number;
  warpTension: number;
  weftTension: number;
  wrinkleFrequency: number;
  wrinkleAmplitude: number;
  sssEpidermal: number;
  sssDermal: number;
  sssBone: number;
  shadingModel: 'PBR' | 'Gooch' | 'Toon';
  ior: number;
  dispersion: number;
  thinFilmThickness: number;
  wearAmount: number;
  tpi: number;
  warpWeftRatio: number;
  noiseOctaves: number;
  lacunarity: number;
  hurstExponent: number;
  specularHighlightDB: number;
  baseColorHex: string;
  dirtAmount: number;
  dirtColorHex: string;
  sssColorHex: string;
  denier: number;
  layers?: MaterialLayer[];
}

export interface SculptingSettings {
  jawline: number;
  cheekbones: number;
  chin: number;
  nose: number;
  eyes: number;
  bodyMass: number;
  musculature: number;
  skinTexture: number;
}

export interface StyleTransferSettings {
  activeStyle: string | null;
  intensity: number;
}

export interface RelightingSettings {
  prompt: string;
  penumbraControl: number;
  specularRoughness: number;
}

export interface MaskingSettings {
  featheringRadius: number;
  falloffCurve: 'linear' | 'gaussian' | 'sigmoid';
}

export interface StudioState {
  image: string | null;
  processedImage: string | null;
  isProcessing: boolean;
  activeLens: LensType;
  lensSettings: LensSettings;
  light: LightState;
  adjustments: BasicEdits;
  wardrobe: WardrobeItem | null;
  nudgeValue: number;
  aiDescription: string;
  background: {
    type: 'original' | 'generated';
    prompt: string;
    intensity: number;
    blending: number;
    colorMatch: number;
    lighting: string;
    weather: string;
    candidates?: string[];
  };
  relighting: RelightingSettings;
  activePose: PoseType;
  physics: PhysicsSettings;
  materials: MaterialSettings;
  sculpting: SculptingSettings;
  styleTransfer: StyleTransferSettings;
  activeMask: string | null;
  masking: MaskingSettings;
}
