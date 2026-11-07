
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, signInWithGoogle, logout } from './lib/firebase';
import { StudioState, LightState, LensType, WardrobeItem, BasicEdits } from './types';
import { LightSphere } from './components/LightSphere';
import { LensRack } from './components/LensRack';
import { Wardrobe3D } from './components/Wardrobe3D';
import { TactileSlider } from './components/TactileSlider';
import { UserGuide } from './components/UserGuide';
import { LiveAssistant } from './components/LiveAssistant';
import { processStudioImage, generateStudioImage, analyzeStudioImage, speakStudioFeedback, segmentBackground, reconstructLens, relightImage, analyzeFabric } from './services/geminiService';
import { FILTERS, LENS_CONFIGS } from './constants';

const INITIAL_ADJUSTMENTS: BasicEdits = {
  exposure: 0, contrast: 0, saturation: 0, vibrance: 0, tint: 0, activeFilter: null
};

const INITIAL_STATE: StudioState = {
  image: null,
  processedImage: null,
  isProcessing: false,
  activeLens: '50mm',
  lensSettings: {
    model: '50mm',
    focalLength: 50,
    aperture: 1.8,
    distortion: 0,
    bokehShape: 'circle'
  },
  light: { x: 0.7, y: -0.7, z: 1.0, intensity: 0.7, temperature: 6000, color: '#ffffff' },
  adjustments: INITIAL_ADJUSTMENTS,
  wardrobe: null,
  nudgeValue: 0,
  aiDescription: '',
  background: {
    type: 'original',
    prompt: '',
    intensity: 1.0,
    blending: 1.0,
    colorMatch: 1.0,
    lighting: 'natural',
    weather: 'clear',
    candidates: []
  },
  relighting: {
    prompt: '',
    penumbraControl: 50,
    specularRoughness: 0.3
  },
  activePose: 'Neutral',
  physics: {
    elasticity: 0.2,
    windStrength: 0.1,
    windDirection: 45,
    windResistance: 0.5,
    friction: 0.3,
    bendingStiffness: 0.5
  },
  materials: {
    sheen: 0.2,
    roughness: 0.5,
    metallic: 0.1,
    subsurface: 0.3,
    tension: 0.5,
    wrinkleDepth: 0.5,
    warpTension: 0.5,
    weftTension: 0.5,
    wrinkleFrequency: 1.0,
    wrinkleAmplitude: 5.0,
    sssEpidermal: 1.0,
    sssDermal: 3.0,
    sssBone: 0.2,
    shadingModel: 'PBR',
    ior: 1.45,
    dispersion: 0.1,
    thinFilmThickness: 250,
    wearAmount: 0.0,
    tpi: 400,
    warpWeftRatio: 1.0,
    noiseOctaves: 5,
    lacunarity: 2.0,
    hurstExponent: 0.7,
    specularHighlightDB: -12,
    baseColorHex: '#ffffff',
    dirtAmount: 0.0,
    dirtColorHex: '#4a3b2c',
    sssColorHex: '#ffcccc',
    denier: 150,
    layers: []
  },
  sculpting: {
    jawline: 0,
    cheekbones: 0,
    chin: 0,
    nose: 0,
    eyes: 0,
    bodyMass: 0,
    musculature: 0,
    skinTexture: 0
  },
  styleTransfer: {
    activeStyle: null,
    intensity: 0.8
  },
  activeMask: null,
  masking: {
    featheringRadius: 1.0,
    falloffCurve: 'gaussian'
  }
};

const WARDROBE_TEMPLATES: WardrobeItem[] = [
  { 
    id: 't-1', name: 'Flapper Dress', 
    image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&q=80', 
    type: 'custom', meshType: 'shirt', 
    description: 'Flapper dress that shimmers with thousands of sequins.' 
  },
  { 
    id: 't-2', name: 'Disco Attire', 
    image: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=600&q=80', 
    type: 'custom', meshType: 'shirt', 
    description: 'Disco attire that explodes with geometric patterns and reflective light.' 
  },
  { 
    id: 't-3', name: 'Futuristic Fabric', 
    image: 'https://images.unsplash.com/photo-1520975661595-6453be3f7070?w=600&q=80', 
    type: 'custom', meshType: 'jacket', 
    description: 'Futuristic fabrics that adapt to your every move with holographic displays.' 
  },
  { 
    id: 't-4', name: 'Bohemian Embroidery', 
    image: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=600&q=80', 
    type: 'custom', meshType: 'shirt', 
    description: 'Bohemian embroidery rich with traditional motifs.' 
  },
  { 
    id: 't-5', name: 'Tailored Suit', 
    image: 'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=600&q=80', 
    type: 'custom', meshType: 'jacket', 
    description: 'Flawlessly tailored suit crafted from the finest Italian wool.' 
  },
  { 
    id: 't-6', name: 'Vintage Leather', 
    image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&q=80', 
    type: 'custom', meshType: 'jacket', 
    description: 'A rugged vintage leather jacket with distressed textures and heavy brass hardware.' 
  },
  { 
    id: 't-7', name: 'Silk Evening Gown', 
    image: 'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=600&q=80', 
    type: 'custom', meshType: 'shirt', 
    description: 'An elegant silk evening gown that drapes beautifully and catches the light with a soft sheen.' 
  },
  { 
    id: 't-8', name: 'Streetwear Hoodie', 
    image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600&q=80', 
    type: 'custom', meshType: 'shirt', 
    description: 'An oversized streetwear hoodie made from heavy cotton with bold graphic prints.' 
  },
  { 
    id: 't-9', name: 'Cyberpunk Trench', 
    image: 'https://images.unsplash.com/photo-1544441893-675973e31985?w=600&q=80', 
    type: 'custom', meshType: 'jacket', 
    description: 'A high-tech cyberpunk trench coat featuring neon accents and water-resistant synthetic fibers.' 
  }
];

const App: React.FC = () => {
  const [user, loading] = useAuthState(auth);
  const [state, setState] = useState<StudioState>(INITIAL_STATE);
  const [history, setHistory] = useState<StudioState[]>([]);
  const [redoStack, setRedoStack] = useState<StudioState[]>([]);
  const [lightHistory, setLightHistory] = useState<LightState[]>([]);
  const [lightRedoStack, setLightRedoStack] = useState<LightState[]>([]);
  const [activePanel, setActivePanel] = useState<'lighting' | 'lens' | 'wardrobe' | 'nudge' | 'adjust' | 'ai' | 'analysis' | 'relight' | null>(null);
  const [directiveMode, setDirectiveMode] = useState<'backdrop' | 'generate' | 'style'>('backdrop');
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [genPrompt, setGenPrompt] = useState('');
  const [bgPrompt, setBgPrompt] = useState('');
  const [genAR, setGenAR] = useState('1:1');
  const [genSize, setGenSize] = useState<"1K"|"2K"|"4K">('1K');
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCameraPermission, setShowCameraPermission] = useState(true);
  const [showUserGuide, setShowUserGuide] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const wardrobeInputRef = useRef<HTMLInputElement>(null);

  const saveHistory = useCallback((newState: StudioState) => {
    setHistory(prev => [...prev, state]);
    setRedoStack([]);
  }, [state]);

  const undo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setRedoStack(prev => [state, ...prev]);
    setHistory(prev => prev.slice(0, -1));
    setState(previous);
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[0];
    setHistory(prev => [...prev, state]);
    setRedoStack(prev => prev.slice(1));
    setState(next);
  };

  const undoLight = () => {
    if (lightHistory.length === 0) return;
    const previous = lightHistory[lightHistory.length - 1];
    setLightRedoStack(prev => [state.light, ...prev]);
    setLightHistory(prev => prev.slice(0, -1));
    setState(prev => ({ ...prev, light: previous }));
  };

  const redoLight = () => {
    if (lightRedoStack.length === 0) return;
    const next = lightRedoStack[0];
    setLightHistory(prev => [...prev, state.light]);
    setLightRedoStack(prev => prev.slice(1));
    setState(prev => ({ ...prev, light: next }));
  };

  const handleProcess = useCallback(async (isAuto: boolean = false) => {
    if (!state.image) return;
    setState(prev => ({ ...prev, isProcessing: true }));
    setError(null);
    try {
      await processStudioImage(state, (data) => {
        const newState = { ...state, processedImage: data.processedImage, isProcessing: false };
        saveHistory(newState);
        setState(newState);
        speakStudioFeedback("Editorial render complete.");
      }, isAuto);
    } catch (err: any) {
      setState(prev => ({ ...prev, isProcessing: false }));
      setError(err.message || "Processing failed.");
    }
  }, [state, saveHistory]);

  const handleSegmentBackground = useCallback(async () => {
    if (!state.image) return;
    setState(prev => ({ ...prev, isProcessing: true }));
    setError(null);
    try {
      const results = await segmentBackground(
        state.processedImage || state.image, 
        bgPrompt, 
        state.background.blending, 
        state.background.colorMatch
      );
      if (results && results.length > 0) {
        const newState = { 
          ...state, 
          isProcessing: false, 
          background: { ...state.background, prompt: bgPrompt, candidates: results } 
        };
        setState(newState);
        speakStudioFeedback("Background variations generated. Please select one.");
      } else {
        setState(prev => ({ ...prev, isProcessing: false }));
        setError("Failed to generate background variations.");
      }
    } catch (err: any) {
      setState(prev => ({ ...prev, isProcessing: false }));
      setError(err.message || "Segmentation failed.");
    }
  }, [state, bgPrompt]);

  const handleApplyLens = useCallback(async () => {
    if (!state.image) return;
    setState(prev => ({ ...prev, isProcessing: true }));
    setError(null);
    try {
      const result = await reconstructLens(state.processedImage || state.image, {
        model: state.activeLens,
        ...state.lensSettings
      });
      if (result) {
        const newState = { ...state, processedImage: result, isProcessing: false };
        saveHistory(newState);
        setState(newState);
        speakStudioFeedback(`${state.activeLens} optic reconstruction complete.`);
      } else {
        setState(prev => ({ ...prev, isProcessing: false }));
      }
    } catch (err: any) {
      setState(prev => ({ ...prev, isProcessing: false }));
      setError(err.message || "Lens reconstruction failed.");
    }
  }, [state, saveHistory]);

  const handleLensPresetChange = useCallback((lens: LensType) => {
    const config = LENS_CONFIGS[lens];
    setState(prev => ({
      ...prev,
      activeLens: lens,
      lensSettings: {
        model: lens,
        focalLength: config.focalLength,
        aperture: config.aperture,
        distortion: config.distortion
      }
    }));
  }, []);

  const handleLensSettingsChange = useCallback((settings: any) => {
    setState(prev => ({ ...prev, lensSettings: settings }));
  }, []);

  const handleRelight = useCallback(async () => {
    if (!state.image || !state.relighting.prompt) return;
    setState(prev => ({ ...prev, isProcessing: true }));
    setError(null);
    try {
      const result = await relightImage(
        state.processedImage || state.image, 
        state.relighting.prompt,
        state.relighting.penumbraControl,
        state.relighting.specularRoughness
      );
      if (result) {
        const newState = { ...state, processedImage: result, isProcessing: false };
        saveHistory(newState);
        setState(newState);
        speakStudioFeedback("Semantic relighting applied.");
      } else {
        setState(prev => ({ ...prev, isProcessing: false }));
      }
    } catch (err: any) {
      setState(prev => ({ ...prev, isProcessing: false }));
      setError(err.message || "Relighting failed.");
    }
  }, [state, saveHistory]);

  const handleGoogleDriveUpload = useCallback(() => {
    const url = prompt("Enter a Google Drive direct image URL (simulated for demo):");
    if (url) {
      const item: WardrobeItem = { id: `d-${Date.now()}`, name: 'Drive Asset', image: url, type: 'custom', meshType: 'shirt' };
      setState(prev => ({ ...prev, wardrobe: item }));
      speakStudioFeedback("Asset linked from Google Drive.");
    }
  }, []);

  const handleAnalyzeFabric = useCallback(async () => {
    if (!state.wardrobe) return;
    setState(prev => ({ ...prev, isProcessing: true }));
    setError(null);
    try {
      const result = await analyzeFabric(state.wardrobe.image, state.wardrobe.description || state.wardrobe.name);
      if (result) {
        setState(prev => ({
          ...prev,
          isProcessing: false,
          materials: result.materials,
          physics: { ...prev.physics, ...result.physics }
        }));
        speakStudioFeedback("Fabric analysis complete. Material properties updated.");
      } else {
        setState(prev => ({ ...prev, isProcessing: false }));
      }
    } catch (err: any) {
      setState(prev => ({ ...prev, isProcessing: false }));
      setError(err.message || "Fabric analysis failed.");
    }
  }, [state.wardrobe]);

  return (
    <div className="h-screen w-screen bg-[#050505] flex flex-col items-center justify-center overflow-hidden">
      {showCameraPermission && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-8">
          <div className="bg-[#0d0d0d] border border-white/10 rounded-[40px] w-full max-w-md p-8 flex flex-col gap-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-2">
                <i className="fa-solid fa-camera text-2xl text-white/60"></i>
              </div>
              <h2 className="text-lg uppercase tracking-[0.2em] text-white font-bold">Camera Access Required</h2>
              <p className="text-xs text-white/60 leading-relaxed">
                Wardrobe Studio requires access to your device's camera to enable core features such as virtual try-on and augmented reality scene integration. 
                This allows us to seamlessly blend virtual garments and environments with your real-world feed.
              </p>
              <p className="text-[10px] text-white/40 leading-relaxed">
                By granting permission, you agree to our processing of camera data in accordance with GDPR and our privacy policy.
              </p>
              <a href="#" className="text-[10px] text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors">Review Privacy Policy</a>
            </div>
            <div className="flex gap-4 mt-4">
              <button 
                onClick={() => setShowCameraPermission(false)} 
                className="flex-1 py-3 rounded-full bg-white/5 border border-white/10 text-[10px] uppercase tracking-widest text-white/60 hover:text-white transition-all"
              >
                Deny
              </button>
              <button 
                onClick={() => setShowCameraPermission(false)} 
                className="flex-1 py-3 rounded-full bg-white text-black text-[10px] uppercase tracking-widest font-bold hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Grant Access
              </button>
            </div>
          </div>
        </div>
      )}

      {showUserGuide && <UserGuide onClose={() => setShowUserGuide(false)} />}
      
      {isLiveActive && <LiveAssistant onClose={() => setIsLiveActive(false)} />}

      <div className="absolute inset-0 border-[40px] border-black pointer-events-none z-40 opacity-40"></div>

      <div className="fixed top-12 left-0 right-0 flex justify-center items-center gap-6 z-50">
        {error && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-red-500/90 text-white px-6 py-3 rounded-full text-[10px] font-bold tracking-widest z-[60] animate-in slide-in-from-top-4 flex items-center gap-3 shadow-xl backdrop-blur-md border border-white/10">
            <i className="fa-solid fa-triangle-exclamation"></i>
            {error}
            <button onClick={() => setError(null)} className="ml-2 hover:text-white/60 transition-colors"><i className="fa-solid fa-xmark"></i></button>
          </div>
        )}
        
        <div className="absolute left-12 top-0 flex items-center gap-4">
          <button 
            onClick={() => setIsLiveActive(!isLiveActive)}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isLiveActive ? 'bg-blue-500 text-white' : 'bg-white/5 text-white/40 border border-white/10 hover:text-white hover:bg-white/10'}`}
          >
            <i className="fa-solid fa-sparkles text-xs"></i>
          </button>
          {!user ? (
            <button onClick={signInWithGoogle} className="px-6 py-2 rounded-full border border-white/10 bg-white/5 text-[10px] uppercase tracking-[0.2em] text-white/50 hover:text-white hover:bg-white/10 transition-all flex items-center gap-3">
              <i className="fa-brands fa-google"></i> Sign In
            </button>
          ) : (
            <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-full px-4 py-1">
              <img src={user.photoURL || ''} alt="User" className="w-6 h-6 rounded-full" />
              <div className="flex flex-col">
                <span className="text-[8px] uppercase tracking-widest text-white/40">Studio Member</span>
                <span className="text-[10px] text-white/80">{user.displayName}</span>
              </div>
              <button onClick={logout} className="ml-2 w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-red-500/20 transition-all">
                <i className="fa-solid fa-power-off text-[8px]"></i>
              </button>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button onClick={undo} disabled={history.length === 0} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white disabled:opacity-20 transition-all">
            <i className="fa-solid fa-undo text-xs"></i>
          </button>
          <button onClick={redo} disabled={redoStack.length === 0} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white disabled:opacity-20 transition-all">
            <i className="fa-solid fa-redo text-xs"></i>
          </button>
        </div>
        <button onClick={() => handleProcess(true)} disabled={!state.image || state.isProcessing} className="px-6 py-2 rounded-full bg-white/10 border border-white/10 text-[10px] uppercase tracking-[0.4em] text-white/60 hover:text-white transition-all">Auto Grade</button>
        <button onClick={() => setShowUserGuide(true)} className="px-6 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] uppercase tracking-[0.4em] text-white/60 hover:text-white transition-all">
          <i className="fa-solid fa-book mr-2"></i> Guide
        </button>
      </div>

      <main className="relative w-full h-full flex items-center justify-center p-24">
        {!state.image ? (
          <div className="flex flex-col gap-8 w-full max-w-xl">
            <div onClick={() => fileInputRef.current?.click()} className="group flex flex-col items-center justify-center w-full aspect-[4/5] bg-[#0d0d0d] border border-white/5 rounded-[60px] cursor-pointer hover:bg-white/[0.02] transition-all">
              <i className="fa-solid fa-camera text-3xl text-white/10 group-hover:text-white/40 mb-8"></i>
              <p className="text-[10px] text-white/20 uppercase tracking-[0.6em]">Import Base Plate</p>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (ev) => setState({ ...state, image: ev.target?.result as string });
                  reader.readAsDataURL(file);
                }
              }} />
            </div>
            <button onClick={() => { setActivePanel('ai'); setDirectiveMode('generate'); }} className="py-6 rounded-[40px] border border-white/10 bg-white/5 text-[10px] uppercase tracking-[0.5em] text-white/40 hover:text-white transition-all">Generate Environment</button>
          </div>
        ) : (
          <div className="relative group max-h-[75vh] aspect-[3/4] overflow-hidden rounded-[30px] shadow-[0_40px_100px_rgba(0,0,0,0.6)]">
            <img src={state.processedImage || state.image} className="w-full h-full object-cover" alt="Editor Preview" />
            {state.isProcessing && (
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
                <i className="fa-solid fa-circle-notch animate-spin text-white/40 text-2xl"></i>
              </div>
            )}
          </div>
        )}

        {activePanel === 'lighting' && (
          <div className="absolute bottom-40 right-20 bg-[#0d0d0d] p-12 rounded-[50px] border border-white/10 shadow-2xl z-50 animate-in slide-in-from-right-10">
            <div className="flex justify-between items-center mb-6 px-4">
               <h3 className="text-[10px] uppercase tracking-[0.5em] text-white/40">Gaffer Module</h3>
               <div className="flex gap-3">
                 <button onClick={() => setActivePanel('relight')} className="text-[8px] uppercase tracking-widest text-white/40 hover:text-white transition-colors border border-white/10 rounded-full px-3 py-1">
                   AI Relight
                 </button>
                 <button onClick={undoLight} disabled={lightHistory.length === 0} className="text-white/30 hover:text-white disabled:opacity-10 transition-colors">
                   <i className="fa-solid fa-rotate-left text-xs"></i>
                 </button>
                 <button onClick={redoLight} disabled={lightRedoStack.length === 0} className="text-white/30 hover:text-white disabled:opacity-10 transition-colors">
                   <i className="fa-solid fa-rotate-right text-xs"></i>
                 </button>
               </div>
            </div>
            <LightSphere light={state.light} onChange={(l) => setState({...state, light: l})} onCommit={(l) => {
              setLightHistory(prev => [...prev, state.light]);
              setLightRedoStack([]);
              saveHistory({...state, light: l});
            }} />
          </div>
        )}

        {activePanel === 'relight' && (
          <div className="absolute bottom-40 right-20 bg-[#0d0d0d] p-12 rounded-[50px] border border-white/10 shadow-2xl z-50 animate-in slide-in-from-right-10 w-80 max-h-[60vh] overflow-y-auto scrollbar-none">
            <div className="flex justify-between items-center mb-6 px-4">
               <h3 className="text-[10px] uppercase tracking-[0.5em] text-white/40">Semantic Relight</h3>
               <button onClick={() => setActivePanel('lighting')} className="text-white/30 hover:text-white transition-colors">
                 <i className="fa-solid fa-arrow-left text-xs"></i>
               </button>
            </div>
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-3">
                <span className="text-[8px] uppercase tracking-widest text-white/30 px-2">Preset Scenarios</span>
                <div className="grid grid-cols-2 gap-2">
                  {['Studio Softbox', 'Outdoor Golden Hour', 'Cyberpunk Neon', 'Dramatic Rim', 'Moonlight', 'Rembrandt'].map(scenario => (
                    <button 
                      key={scenario}
                      onClick={() => setState(prev => ({ ...prev, relighting: { ...prev.relighting, prompt: scenario } }))}
                      className={`py-2 rounded-xl border transition-all text-[8px] uppercase tracking-widest ${state.relighting.prompt === scenario ? 'bg-white text-black border-white' : 'bg-white/5 border-white/10 text-white/40 hover:text-white'}`}
                    >
                      {scenario}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <span className="text-[8px] uppercase tracking-widest text-white/30 px-2">Custom Prompt</span>
                <textarea 
                  value={state.relighting.prompt} 
                  onChange={e => setState(prev => ({ ...prev, relighting: { ...prev.relighting, prompt: e.target.value } }))}
                  placeholder="Describe lighting (e.g., 'Soft pink light from left')..." 
                  className="bg-white/5 border border-white/10 rounded-3xl p-4 text-[10px] text-white min-h-[80px] outline-none focus:border-white/20 transition-all" 
                />
              </div>

              <div className="flex flex-col gap-4 mt-2">
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between">
                    <span className="text-[8px] uppercase tracking-widest text-white/30">Penumbra Control (PCSS)</span>
                    <span className="text-[8px] font-mono text-white/60">{state.relighting.penumbraControl}%</span>
                  </div>
                  <TactileSlider 
                    min="0" max="100" step="1" 
                    value={state.relighting.penumbraControl} 
                    onChange={e => setState(prev => ({ ...prev, relighting: { ...prev.relighting, penumbraControl: parseInt(e.target.value) } }))}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between">
                    <span className="text-[8px] uppercase tracking-widest text-white/30">Specular (GGX BRDF)</span>
                    <span className="text-[8px] font-mono text-white/60">{state.relighting.specularRoughness.toFixed(2)}</span>
                  </div>
                  <TactileSlider 
                    min="0.2" max="0.5" step="0.01" 
                    value={state.relighting.specularRoughness} 
                    onChange={e => setState(prev => ({ ...prev, relighting: { ...prev.relighting, specularRoughness: parseFloat(e.target.value) } }))}
                  />
                </div>
              </div>

              <button 
                onClick={handleRelight}
                disabled={!state.relighting.prompt || state.isProcessing}
                className="w-full py-4 rounded-full bg-white text-black text-[9px] uppercase tracking-[0.3em] font-bold hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-20 mt-2"
              >
                Apply Relighting
              </button>
            </div>
          </div>
        )}

        {activePanel === 'lens' && (
          <div className="absolute bottom-40 right-20 bg-[#0d0d0d] p-12 rounded-[50px] border border-white/10 shadow-2xl z-50 animate-in slide-in-from-right-10 max-h-[60vh] overflow-y-auto scrollbar-none w-[500px]">
            <div className="flex justify-between items-center mb-8 px-4">
              <h3 className="text-[10px] uppercase tracking-[0.5em] text-white/40">Optic Reconstruction</h3>
              <button 
                onClick={handleApplyLens}
                disabled={state.isProcessing}
                className="px-6 py-2 rounded-full bg-white text-black text-[9px] uppercase tracking-[0.2em] font-bold hover:scale-[1.05] active:scale-[0.95] transition-all disabled:opacity-20"
              >
                Apply Lens
              </button>
            </div>
            <LensRack 
              activeLens={state.activeLens} 
              lensSettings={state.lensSettings}
              onPresetChange={handleLensPresetChange}
              onSettingsChange={handleLensSettingsChange}
            />
          </div>
        )}

        {activePanel === 'ai' && (
          <div className="absolute bottom-40 left-1/2 -translate-x-1/2 w-full max-w-xl bg-[#0d0d0d] p-12 rounded-[50px] border border-white/10 shadow-2xl z-50 flex flex-col gap-8 animate-in zoom-in-95">
            <div className="flex justify-center gap-4 mb-2">
              <button 
                onClick={() => setDirectiveMode('backdrop')}
                className={`px-4 py-2 rounded-full text-[9px] uppercase tracking-widest transition-all ${directiveMode === 'backdrop' ? 'bg-white text-black font-bold' : 'text-white/40 hover:text-white'}`}
              >
                Backdrop Synthesis
              </button>
              <button 
                onClick={() => setDirectiveMode('generate')}
                className={`px-4 py-2 rounded-full text-[9px] uppercase tracking-widest transition-all ${directiveMode === 'generate' ? 'bg-white text-black font-bold' : 'text-white/40 hover:text-white'}`}
              >
                Scene Generation
              </button>
              <button 
                onClick={() => setDirectiveMode('style')}
                className={`px-4 py-2 rounded-full text-[9px] uppercase tracking-widest transition-all ${directiveMode === 'style' ? 'bg-white text-black font-bold' : 'text-white/40 hover:text-white'}`}
              >
                Style Transfer
              </button>
            </div>

            {directiveMode === 'backdrop' ? (
              <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex flex-col gap-3">
                  <span className="text-[8px] uppercase tracking-widest text-white/30 px-2">Creative Style</span>
                  <div className="grid grid-cols-4 gap-2">
                    {['Minimalist', 'Cyberpunk', 'Ethereal', 'Industrial', 'Nature', 'Abstract', 'Noir', 'Vibrant'].map(style => (
                      <button 
                        key={style}
                        onClick={() => setBgPrompt(prev => prev ? `${prev}, ${style} style` : `${style} style`)}
                        className="py-2 rounded-xl bg-white/5 border border-white/10 text-[8px] uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/10 transition-all"
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <span className="text-[8px] uppercase tracking-widest text-white/30 px-2">Environment Prompt</span>
                  <textarea 
                    value={bgPrompt} 
                    onChange={e => setBgPrompt(e.target.value)} 
                    placeholder="Describe the custom background environment..." 
                    className="bg-white/5 border border-white/10 rounded-3xl p-6 text-[11px] text-white min-h-[80px] outline-none focus:border-white/20 transition-all" 
                  />
                </div>

                <div className="flex gap-4">
                  <div className="flex-1 flex flex-col gap-2">
                    <span className="text-[8px] uppercase tracking-widest text-white/30 px-2">Dynamic Lighting</span>
                    <select
                      value={state.background.lighting}
                      onChange={e => setState(prev => ({ ...prev, background: { ...prev.background, lighting: e.target.value } }))}
                      className="bg-white/5 border border-white/10 rounded-xl p-3 text-[10px] text-white outline-none focus:border-white/20 transition-all appearance-none"
                    >
                      <option value="natural">Natural</option>
                      <option value="golden_hour">Golden Hour</option>
                      <option value="neon">Neon</option>
                      <option value="cinematic">Cinematic</option>
                      <option value="studio">Studio</option>
                    </select>
                  </div>
                  <div className="flex-1 flex flex-col gap-2">
                    <span className="text-[8px] uppercase tracking-widest text-white/30 px-2">Weather Effects</span>
                    <select
                      value={state.background.weather}
                      onChange={e => setState(prev => ({ ...prev, background: { ...prev.background, weather: e.target.value } }))}
                      className="bg-white/5 border border-white/10 rounded-xl p-3 text-[10px] text-white outline-none focus:border-white/20 transition-all appearance-none"
                    >
                      <option value="clear">Clear</option>
                      <option value="rain">Rain</option>
                      <option value="snow">Snow</option>
                      <option value="fog">Fog</option>
                      <option value="overcast">Overcast</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-1 flex flex-col gap-2">
                    <span className="text-[8px] uppercase tracking-widest text-white/30 px-2">Blending Intensity</span>
                    <TactileSlider 
                      min="0" max="1" step="0.05" 
                      value={state.background.blending} 
                      onChange={e => setState(prev => ({ ...prev, background: { ...prev.background, blending: parseFloat(e.target.value) } }))}
                    />
                  </div>
                  <div className="flex-1 flex flex-col gap-2">
                    <span className="text-[8px] uppercase tracking-widest text-white/30 px-2">Color Match</span>
                    <TactileSlider 
                      min="0" max="1" step="0.05" 
                      value={state.background.colorMatch} 
                      onChange={e => setState(prev => ({ ...prev, background: { ...prev.background, colorMatch: parseFloat(e.target.value) } }))}
                    />
                  </div>
                </div>

                <button 
                  onClick={handleSegmentBackground}
                  disabled={!bgPrompt || state.isProcessing}
                  className="w-full py-5 rounded-full bg-white text-black text-[10px] uppercase tracking-[0.3em] font-bold hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-20"
                >
                  Generate Custom Backdrop
                </button>

                {state.background.candidates && state.background.candidates.length > 0 && (
                  <div className="mt-4 flex flex-col gap-3 animate-in fade-in">
                    <span className="text-[8px] uppercase tracking-widest text-white/30 px-2">Select Variation</span>
                    <div className="grid grid-cols-3 gap-2">
                      {state.background.candidates.map((candidate, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            const newState = {
                              ...state,
                              processedImage: candidate,
                              background: { ...state.background, candidates: undefined }
                            };
                            saveHistory(newState);
                            setState(newState);
                            speakStudioFeedback("Background variation applied.");
                          }}
                          className="relative aspect-square rounded-xl overflow-hidden border border-white/10 hover:border-white/50 transition-all"
                        >
                          <img src={candidate} alt={`Variation ${idx + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          <div className="absolute inset-0 bg-black/20 hover:bg-transparent transition-all"></div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : directiveMode === 'generate' ? (
              <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex flex-col gap-3">
                  <span className="text-[8px] uppercase tracking-widest text-white/30 px-2">Scene Description</span>
                  <textarea 
                    value={genPrompt} 
                    onChange={e => setGenPrompt(e.target.value)} 
                    placeholder="Describe atmosphere (e.g., 'Cinematic back-lit model in a marble hall')..." 
                    className="bg-white/5 border border-white/10 rounded-3xl p-6 text-[11px] text-white min-h-[100px] outline-none focus:border-white/20 transition-all" 
                  />
                </div>
                
                <div className="flex flex-col gap-3">
                  <span className="text-[8px] uppercase tracking-widest text-white/30 px-2">Aspect Ratio</span>
                  <div className="grid grid-cols-4 gap-2">
                    {["1:1", "2:3", "3:2", "3:4", "4:3", "9:16", "16:9", "21:9"].map(ar => (
                      <button 
                        key={ar} 
                        onClick={() => setGenAR(ar)} 
                        className={`py-3 rounded-xl text-[9px] border transition-all ${genAR === ar ? 'bg-white text-black border-white font-bold' : 'bg-white/5 border-white/10 text-white/40 hover:text-white'}`}
                      >
                        {ar}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <span className="text-[8px] uppercase tracking-widest text-white/30 px-2">Resolution/Quality</span>
                  <div className="grid grid-cols-3 gap-2">
                    {(["1K", "2K", "4K"] as ("1K" | "2K" | "4K")[]).map(size => (
                      <button 
                        key={size} 
                        onClick={() => setGenSize(size)} 
                        className={`py-3 rounded-xl text-[9px] border transition-all ${genSize === size ? 'bg-white text-black border-white font-bold' : 'bg-white/5 border-white/10 text-white/40 hover:text-white'}`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={async () => {
                    setState(p => ({...p, isProcessing: true}));
                    setError(null);
                    try {
                      // Note: we can pass state.image to make it an edit instead of pure generation
                      const isEdit = !!state.image && confirm("Keep current image structure as reference?");
                      const img = await generateStudioImage(genPrompt, genAR, genSize, isEdit, state.image);
                      if (img) {
                        setState(p => ({...p, image: img, processedImage: null, isProcessing: false}));
                        speakStudioFeedback("New scene generated.");
                      } else {
                        setState(p => ({...p, isProcessing: false}));
                      }
                    } catch (err: any) {
                      setState(p => ({...p, isProcessing: false}));
                      setError(err.message || "Generation failed.");
                    }
                  }} 
                  disabled={!genPrompt || state.isProcessing}
                  className="w-full py-5 rounded-full bg-white text-black text-[10px] uppercase tracking-[0.3em] font-bold hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-20"
                >
                  Generate or Edit Scene
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex flex-col gap-3">
                  <span className="text-[8px] uppercase tracking-widest text-white/30 px-2">Artistic Style</span>
                  <div className="grid grid-cols-3 gap-2">
                    {['Van Gogh', 'Monet', 'Cyberpunk', 'Watercolor', 'Anime', 'Oil Painting', 'Sketch', 'Pop Art', 'Surrealism', 'None'].map(style => (
                      <button 
                        key={style}
                        onClick={() => setState(prev => ({ ...prev, styleTransfer: { ...prev.styleTransfer, activeStyle: style === 'None' ? null : style } }))}
                        className={`py-3 rounded-xl text-[9px] uppercase tracking-widest border transition-all ${state.styleTransfer.activeStyle === style || (style === 'None' && !state.styleTransfer.activeStyle) ? 'bg-white text-black border-white font-bold' : 'bg-white/5 border-white/10 text-white/40 hover:text-white'}`}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex justify-between px-2">
                    <span className="text-[8px] uppercase tracking-widest text-white/30">Style Intensity</span>
                    <span className="text-[8px] font-mono text-white/60">{Math.round(state.styleTransfer.intensity * 100)}%</span>
                  </div>
                  <TactileSlider 
                    min="0" max="1" step="0.05" 
                    value={state.styleTransfer.intensity} 
                    onChange={e => setState(prev => ({ ...prev, styleTransfer: { ...prev.styleTransfer, intensity: parseFloat(e.target.value) } }))}
                  />
                </div>

                <button 
                  onClick={handleProcess}
                  disabled={!state.styleTransfer.activeStyle || state.isProcessing}
                  className="w-full py-5 rounded-full bg-white text-black text-[10px] uppercase tracking-[0.3em] font-bold hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-20"
                >
                  Apply Style Transfer
                </button>
              </div>
            )}
          </div>
        )}

        {activePanel === 'adjust' && (
          <div className="absolute bottom-40 right-20 bg-[#0d0d0d] p-12 rounded-[50px] border border-white/10 shadow-2xl z-50 animate-in slide-in-from-right-10 w-80 max-h-[60vh] overflow-y-auto scrollbar-none">
            <h3 className="text-[10px] uppercase tracking-[0.5em] text-white/40 mb-6">Global Grading</h3>
            <div className="flex flex-col gap-4">
              {Object.entries(state.adjustments).map(([key, value]) => {
                if (key === 'activeFilter') return null;
                return (
                  <div key={key} className="flex flex-col gap-2">
                    <div className="flex justify-between">
                      <span className="text-[8px] uppercase tracking-widest text-white/30">{key}</span>
                      <span className="text-[8px] font-mono text-white/60">{value}</span>
                    </div>
                    <TactileSlider 
                      min={key === 'exposure' ? -2 : -100} max={key === 'exposure' ? 2 : 100} step={key === 'exposure' ? 0.1 : 1}
                      value={value as number} 
                      onChange={e => setState(prev => ({ ...prev, adjustments: { ...prev.adjustments, [key]: parseFloat(e.target.value) } }))}
                    />
                  </div>
                );
              })}
            </div>
            
            <div className="mt-8 pt-8 border-t border-white/10">
              <h3 className="text-[10px] uppercase tracking-[0.5em] text-white/40 mb-6">AI Sculpting</h3>
              <div className="flex flex-col gap-4">
                {Object.entries(state.sculpting).map(([key, value]) => (
                  <div key={key} className="flex flex-col gap-2">
                    <div className="flex justify-between">
                      <span className="text-[8px] uppercase tracking-widest text-white/30">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <span className="text-[8px] font-mono text-white/60">{(value as number) > 0 ? '+' : ''}{Math.round((value as number) * 100)}%</span>
                    </div>
                    <TactileSlider 
                      min="-1" max="1" step="0.05" 
                      value={value as number} 
                      onChange={e => setState(prev => ({ ...prev, sculpting: { ...prev.sculpting, [key]: parseFloat(e.target.value) } }))}
                    />
                  </div>
                ))}
              </div>
              <button 
                onClick={() => handleProcess()}
                disabled={state.isProcessing}
                className="w-full mt-6 py-4 rounded-full bg-white text-black text-[9px] uppercase tracking-[0.3em] font-bold hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-20"
              >
                Apply Sculpting
              </button>
            </div>
          </div>
        )}

        {activePanel === 'wardrobe' && (
          <div className="absolute bottom-40 left-1/2 -translate-x-1/2 w-full max-w-[85vw] bg-[#0d0d0d] p-12 rounded-[60px] border border-white/10 shadow-2xl z-50 flex flex-col gap-10 animate-in zoom-in-95">
            <div className="flex justify-between items-center px-4">
              <h3 className="text-[12px] uppercase tracking-[0.6em] text-white font-bold">Template Collective</h3>
              <div className="flex gap-4">
                <button onClick={handleGoogleDriveUpload} className="px-6 py-3 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] uppercase tracking-widest text-blue-400 hover:bg-blue-500/20 transition-all">
                  <i className="fa-brands fa-google-drive mr-2"></i> Drive
                </button>
                <button onClick={() => wardrobeInputRef.current?.click()} className="px-6 py-3 rounded-full bg-white/5 border border-white/10 text-[10px] uppercase tracking-widest text-white/60 hover:text-white transition-all">Local</button>
                <input type="file" ref={wardrobeInputRef} className="hidden" onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    const r = new FileReader();
                    r.onload = (ev) => setState({...state, wardrobe: { id: 'c', name: 'Custom', image: ev.target?.result as string, type: 'custom', meshType: 'shirt' }});
                    r.readAsDataURL(f);
                  }
                }} />
              </div>
            </div>
            <div className="flex gap-12 items-start h-[450px]">
              <div className="grid grid-cols-5 gap-6 flex-grow overflow-y-auto pr-4 scrollbar-none">
                {WARDROBE_TEMPLATES.map(item => (
                  <button key={item.id} onClick={() => setState({...state, wardrobe: item})} className={`relative rounded-[40px] overflow-hidden aspect-[4/5] transition-all duration-500 ${state.wardrobe?.id === item.id ? 'ring-2 ring-white scale-105' : 'opacity-40 hover:opacity-100'}`}>
                    <img src={item.image} className="w-full h-full object-cover" alt="" />
                  </button>
                ))}
              </div>
              {state.wardrobe && (
                <div className="w-80 flex flex-col gap-6">
                  <Wardrobe3D 
                    item={state.wardrobe} 
                    pose={state.activePose}
                    physics={state.physics}
                    materials={state.materials}
                    onUpdate={(updated) => setState(prev => ({ ...prev, wardrobe: updated }))}
                    onPoseChange={(pose) => setState(prev => ({ ...prev, activePose: pose }))}
                    onPhysicsChange={(physics) => setState(prev => ({ ...prev, physics }))}
                    onMaterialsChange={(materials) => setState(prev => ({ ...prev, materials }))}
                  />
                  <div className="flex gap-2">
                    <button 
                      onClick={handleAnalyzeFabric} 
                      disabled={state.isProcessing}
                      className="flex-1 py-4 rounded-full bg-white/10 border border-white/10 text-white text-[10px] uppercase tracking-widest font-bold hover:bg-white/20 transition-all disabled:opacity-20"
                    >
                      <i className="fa-solid fa-microscope mr-2"></i> Analyze
                    </button>
                    <button onClick={() => handleProcess()} className="flex-[2] py-4 rounded-full bg-white text-black text-[10px] uppercase tracking-widest font-bold">Apply Look</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activePanel === 'analysis' && (
          <div className="absolute right-12 top-1/2 -translate-y-1/2 w-80 bg-black/40 backdrop-blur-2xl p-8 rounded-[40px] border border-white/10 shadow-2xl animate-in fade-in slide-in-from-right-8 z-40">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xs uppercase tracking-[0.4em] text-white/40 font-bold">Image Inspection</h3>
              <button onClick={() => setActivePanel(null)} className="text-white/40 hover:text-white transition-colors"><i className="fa-solid fa-xmark"></i></button>
            </div>
            
            <div className="flex flex-col gap-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {(() => {
                if (!analysisResult) return <div className="text-white/50 text-xs text-center py-8">No analysis available.</div>;
                try {
                  const data = JSON.parse(analysisResult);
                  return (
                    <>
                      <div className="flex flex-col gap-3">
                        <h4 className="text-[9px] uppercase tracking-widest text-white/60 font-bold border-b border-white/10 pb-2"><i className="fa-solid fa-lightbulb mr-2"></i>Lighting</h4>
                        <div className="bg-white/5 rounded-2xl p-4 flex flex-col gap-2">
                          <div className="flex justify-between items-center"><span className="text-[8px] uppercase tracking-widest text-white/40">Temperature</span><span className="text-[10px] text-white font-mono">{data.lighting?.temperature || 'N/A'}</span></div>
                          <div className="flex justify-between items-center"><span className="text-[8px] uppercase tracking-widest text-white/40">Intensity</span><span className="text-[10px] text-white font-mono">{data.lighting?.intensity || 'N/A'}</span></div>
                          <p className="text-[10px] text-white/70 leading-relaxed mt-1">{data.lighting?.description}</p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3">
                        <h4 className="text-[9px] uppercase tracking-widest text-white/60 font-bold border-b border-white/10 pb-2"><i className="fa-solid fa-crop-simple mr-2"></i>Composition</h4>
                        <div className="bg-white/5 rounded-2xl p-4 flex flex-col gap-2">
                          <div className="flex flex-col gap-1"><span className="text-[8px] uppercase tracking-widest text-white/40">Rule of Thirds</span><span className="text-[10px] text-white leading-relaxed">{data.composition?.ruleOfThirds || 'N/A'}</span></div>
                          <div className="flex flex-col gap-1 mt-2"><span className="text-[8px] uppercase tracking-widest text-white/40">Leading Lines</span><span className="text-[10px] text-white leading-relaxed">{data.composition?.leadingLines || 'N/A'}</span></div>
                          <p className="text-[10px] text-white/70 leading-relaxed mt-2 pt-2 border-t border-white/5">{data.composition?.description}</p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3">
                        <h4 className="text-[9px] uppercase tracking-widest text-white/60 font-bold border-b border-white/10 pb-2"><i className="fa-solid fa-layer-group mr-2"></i>Materials</h4>
                        <div className="bg-white/5 rounded-2xl p-4 flex flex-col gap-2">
                          <div className="flex flex-col gap-1"><span className="text-[8px] uppercase tracking-widest text-white/40">Reflectivity</span><span className="text-[10px] text-white leading-relaxed">{data.materials?.reflectivity || 'N/A'}</span></div>
                          <div className="flex flex-col gap-1 mt-2"><span className="text-[8px] uppercase tracking-widest text-white/40">Roughness</span><span className="text-[10px] text-white leading-relaxed">{data.materials?.roughness || 'N/A'}</span></div>
                          <p className="text-[10px] text-white/70 leading-relaxed mt-2 pt-2 border-t border-white/5">{data.materials?.description}</p>
                        </div>
                      </div>
                    </>
                  );
                } catch (e) {
                  return <div className="text-[11px] text-white/70 leading-relaxed whitespace-pre-wrap">{analysisResult}</div>;
                }
              })()}
            </div>
          </div>
        )}
      </main>

      <footer className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50">
        <div className="bg-white/[0.03] backdrop-blur-3xl px-12 py-5 rounded-full border border-white/5 flex items-center gap-12 shadow-2xl">
          <ToolbarIcon icon="fa-lightbulb" label="Gaffer" active={activePanel === 'lighting'} onClick={() => setActivePanel(activePanel === 'lighting' ? null : 'lighting')} />
          <ToolbarIcon icon="fa-camera" label="Optics" active={activePanel === 'lens'} onClick={() => setActivePanel(activePanel === 'lens' ? null : 'lens')} />
          <ToolbarIcon icon="fa-wand-magic-sparkles" label="Directive" active={activePanel === 'ai'} onClick={() => setActivePanel(activePanel === 'ai' ? null : 'ai')} />
          <button onClick={() => handleProcess()} disabled={!state.image} className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center transition-all hover:scale-110 disabled:opacity-20"><i className="fa-solid fa-camera-retro text-xl"></i></button>
          <ToolbarIcon icon="fa-sliders" label="Adjust" active={activePanel === 'adjust'} onClick={() => setActivePanel(activePanel === 'adjust' ? null : 'adjust')} />
          <ToolbarIcon icon="fa-hanger" label="Closet" active={activePanel === 'wardrobe'} onClick={() => setActivePanel(activePanel === 'wardrobe' ? null : 'wardrobe')} />
          <ToolbarIcon icon="fa-magnifying-glass-chart" label="Inspect" active={activePanel === 'analysis'} onClick={() => {
            if (activePanel === 'analysis') setActivePanel(null);
            else {
              setState(p => ({...p, isProcessing: true}));
              setError(null);
              analyzeStudioImage(state.processedImage || state.image || "").then(r => {
                setAnalysisResult(r);
                setState(p => ({...p, isProcessing: false}));
                setActivePanel('analysis');
              }).catch((err: any) => {
                setState(p => ({...p, isProcessing: false}));
                setError(err.message || "Analysis failed.");
              });
            }
          }} />
        </div>
      </footer>
    </div>
  );
};

const ToolbarIcon = ({ icon, label, active, onClick }: { icon: string, label: string, active: boolean, onClick: () => void }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1.5 transition-all ${active ? 'text-white scale-110' : 'text-white/20 hover:text-white/60'}`}>
    <i className={`fa-solid ${icon} text-lg`}></i>
    <span className="text-[7px] uppercase tracking-[0.3em] font-bold">{label}</span>
  </button>
);

export default App;
