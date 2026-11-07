
import React from 'react';

export const LENS_CONFIGS = {
  '35mm': {
    name: '35mm Street',
    description: 'Wide, intimate, documentary feel.',
    bokeh: 0.2,
    distortion: 0.1,
    focalLength: 35,
    aperture: 2.8
  },
  '50mm': {
    name: '50mm Human Eye',
    description: 'The neutral standard.',
    bokeh: 0.4,
    distortion: 0,
    focalLength: 50,
    aperture: 1.8
  },
  '85mm': {
    name: '85mm Portrait King',
    description: 'Compressed background, flattering facial features.',
    bokeh: 0.8,
    distortion: -0.05,
    focalLength: 85,
    aperture: 1.4
  },
  'Anamorphic': {
    name: 'Anamorphic Cinema',
    description: 'Cinematic wide aspect ratio with oval bokeh and horizontal flares.',
    bokeh: 0.6,
    distortion: 0.15,
    focalLength: 40,
    aperture: 2.0
  },
  'Super8': {
    name: 'Super 8 Vintage',
    description: 'Grainy, warm, nostalgic film look with soft edges.',
    bokeh: 0.3,
    distortion: 0.05,
    focalLength: 15,
    aperture: 4.0
  },
  'Petzval': {
    name: 'Petzval Swirly',
    description: 'Extreme swirly bokeh and sharp center focus.',
    bokeh: 0.9,
    distortion: 0.2,
    focalLength: 58,
    aperture: 2.2
  },
  'Macro': {
    name: 'Macro Detail',
    description: 'Ultra-shallow depth of field for extreme close-ups.',
    bokeh: 0.95,
    distortion: 0,
    focalLength: 100,
    aperture: 2.8
  }
};

export const FILTERS = [
  { id: 'noir', name: 'Noir', description: 'High contrast black & white.' },
  { id: 'cyanotype', name: 'Vintage', description: 'Faded blues and warm highlights.' },
  { id: 'cyber', name: 'Cyber', description: 'Neon pink and blue split toning.' },
  { id: 'cinematic', name: 'Film', description: 'Teal and orange cinematic look.' }
];

export const COLORS = {
  accent: '#ffffff',
  bg: '#0a0a0a',
  surface: '#1a1a1a',
  border: '#333333',
  warm: '#ff9500',
  cool: '#007aff'
};
