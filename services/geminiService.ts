
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { StudioState, LightState, LensType } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

async function getImageData(url: string): Promise<{ data: string; mimeType: string }> {
  if (url.startsWith('data:')) {
    const [header, data] = url.split(',');
    const mimeType = header.split(':')[1].split(';')[0];
    return { data, mimeType };
  }
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve({ data: base64, mimeType: blob.type });
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function getFabricSheen(name: string, desc: string): string {
  const content = (name + " " + desc).toLowerCase();
  if (content.includes('leather') || content.includes('latex') || content.includes('pvc')) {
    return "SHEEN: High Specular. Material exhibits sharp, oily highlights with a defined light-to-dark gradient. Surface is smooth and reflects the point source directly.";
  } else if (content.includes('silk') || content.includes('satin') || content.includes('velvet')) {
    return "SHEEN: Anisotropic. Light stretches along the folds. Highlights are soft but bright, with significant color shifting at grazing angles.";
  } else if (content.includes('cotton') || content.includes('linen') || content.includes('wool')) {
    return "SHEEN: Matte Diffusion. Light is absorbed and scattered evenly. No distinct specular highlights; only soft gradient transitions in the folds.";
  } else if (content.includes('metallic') || content.includes('foil')) {
    return "SHEEN: High Metallic. Surface acts like a mirror. High-intensity specular reflections of the light source color.";
  }
  return "SHEEN: Natural semi-matte. Standard fabric reflection properties.";
}

export const processStudioImage = async (
  state: StudioState,
  onUpdate: (data: { processedImage: string }) => void,
  isAutoEnhance: boolean = false
) => {
  if (!state.image) return;
  const ai = getAI();

  try {
    const mainImageData = await getImageData(state.image);
    const lightDescription = getLightDescription(state.light);
    const lensDescription = getLensDescription(state.activeLens);
    const nudgeDescription = state.nudgeValue !== 0 ? `The subject's orientation is adjusted by ${state.nudgeValue} degrees.` : '';
    
    const adjustmentPrompt = `
      Adjustments:
      - Exposure: ${state.adjustments.exposure}
      - Contrast: ${state.adjustments.contrast}
      - Saturation: ${state.adjustments.saturation}
      - Filter: ${state.adjustments.activeFilter || 'Neutral'}
    `;

    const aiDescriptionPrompt = state.aiDescription 
      ? `Specific Edit: ${state.aiDescription}` 
      : '';

    const autoEnhancePrompt = isAutoEnhance 
      ? "AUTO-MODE: Optimize levels and lighting for editorial quality." 
      : "";

    const backgroundPrompt = state.background 
      ? `BACKGROUND: Replace the current background with: ${state.background}. Ensure seamless integration with the subject's lighting and shadows.`
      : "BACKGROUND: Maintain original background but clean up distractions.";

    const physicsPrompt = `PHYSICS: Simulate fabric behavior with:
      - Elasticity: ${state.physics.elasticity * 100}%
      - Wind: ${state.physics.windStrength * 10}m/s from ${state.physics.windDirection}°
      - Tension: ${state.materials.tension * 100}%
      - Wrinkle Depth: ${state.materials.wrinkleDepth * 100}%
      - Warp Tension: ${state.materials.warpTension * 100}%
      - Weft Tension: ${state.materials.weftTension * 100}%
      - Wrinkle Frequency: ${state.materials.wrinkleFrequency}Hz
      - Wrinkle Amplitude: ${state.materials.wrinkleAmplitude}px
      - Subsurface Scattering (Base): ${state.materials.subsurface * 100}%
      - SSS Epidermal Depth: ${state.materials.sssEpidermal}mm
      - SSS Dermal Depth: ${state.materials.sssDermal}mm
      - SSS Bone (PRT): ${state.materials.sssBone * 100}%`;

    const sculptingPrompt = `SCULPTING (Subtle Adjustments):
      - Jawline Definition: ${state.sculpting.jawline > 0 ? '+' : ''}${state.sculpting.jawline * 100}%
      - Cheekbones: ${state.sculpting.cheekbones > 0 ? '+' : ''}${state.sculpting.cheekbones * 100}%
      - Body Mass: ${state.sculpting.bodyMass > 0 ? '+' : ''}${state.sculpting.bodyMass * 100}%
      - Musculature: ${state.sculpting.musculature > 0 ? '+' : ''}${state.sculpting.musculature * 100}%
      - Skin Texture: ${state.sculpting.skinTexture > 0 ? '+' : ''}${state.sculpting.skinTexture * 100}%`;

    const styleTransferPrompt = state.styleTransfer.activeStyle 
      ? `STYLE TRANSFER: Apply the artistic style of "${state.styleTransfer.activeStyle}" to the entire image. Intensity: ${state.styleTransfer.intensity * 100}%. Ensure the subject remains recognizable but fully integrated into the aesthetic.`
      : '';

    let prompt = `Role: Professional Digital Lighting Artist and Compositor.
      Task: Apply realistic studio lighting, lens effects, and background integration.
      
      Scene Settings:
      - Lighting: ${lightDescription}
      - Camera: ${lensDescription}
      - Pose: ${state.activePose}
      ${nudgeDescription}
      ${adjustmentPrompt}
      ${aiDescriptionPrompt}
      ${autoEnhancePrompt}
      ${backgroundPrompt}
      ${physicsPrompt}
      ${sculptingPrompt}
      ${styleTransferPrompt}
      
      Constraints:
      - Output ONLY the modified image.
      - Maintain strict physical accuracy for skin subsurface scattering, fabric folds, and shadows.
      - If background is replaced, ensure the subject's edges are perfectly masked and integrated.`;

    const parts: any[] = [
      { inlineData: { data: mainImageData.data, mimeType: mainImageData.mimeType } },
      { text: prompt }
    ];

    if (state.wardrobe) {
      const wardrobeImageData = await getImageData(state.wardrobe.image);
      parts.push({
        inlineData: { data: wardrobeImageData.data, mimeType: wardrobeImageData.mimeType },
      });
      
      const sheenDescription = getFabricSheen(state.wardrobe.name, state.wardrobe.description || '');

      parts[1].text += `\n\nWardrobe Layering:
        - Piece: ${state.wardrobe.name}
        - Properties: ${state.wardrobe.description || 'Generic'}
        - ${sheenDescription}
        - Match the lighting of the main plate to the new fabric folds.
        - The fabric should react to the pose: ${state.activePose}.`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts },
    });

    let resultImage = '';
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        resultImage = `data:image/png;base64,${part.inlineData.data}`;
        break;
      }
    }

    if (resultImage) {
      onUpdate({ processedImage: resultImage });
    }
  } catch (error: any) {
    console.error("AI Error:", error);
    if (error.status === 429 || error.message?.includes('429') || error.status === 'RESOURCE_EXHAUSTED') {
      throw new Error("Daily AI quota exceeded. Please try again later.");
    }
  }
};

export const segmentBackground = async (
  imageUrl: string,
  backgroundPrompt: string,
  blending: number = 1.0,
  colorMatch: number = 1.0
): Promise<string[]> => {
  const ai = getAI();
  try {
    const imageData = await getImageData(imageUrl);
    
    const variations = [
      "Variation 1: Focus on dramatic, high-contrast lighting with a low-angle perspective.",
      "Variation 2: Focus on soft, diffused natural lighting with a straight-on, eye-level perspective.",
      "Variation 3: Focus on cinematic, moody lighting with a slightly high-angle perspective."
    ];

    const promises = variations.map(async (variationText) => {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { inlineData: { data: imageData.data, mimeType: imageData.mimeType } },
            { text: `Role: AI Background Synthesis Artist. 
Task: Generate a completely new, creative, and diverse custom background based on this prompt: "${backgroundPrompt}". 
${variationText}
Instructions:
1. Accurately segment the subject (person and garment) from the original image.
2. Synthesize a high-quality, professional environment that matches the prompt.
3. Ensure the subject is seamlessly integrated into the new generated background.
4. Harmonize the lighting, shadows, and color grading between the subject and the new environment.
   - Blending Intensity: ${Math.round(blending * 100)}% (How much the subject's edges blend with the environment)
   - Color Match: ${Math.round(colorMatch * 100)}% (How much the subject's lighting/color adapts to the new background)
5. Output ONLY the final synthesized image.` }
          ]
        }
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
      return null;
    });

    const results = await Promise.all(promises);
    return results.filter(Boolean) as string[];
  } catch (error: any) {
    console.error("Segmentation Error:", error);
    if (error.status === 429 || error.message?.includes('429') || error.status === 'RESOURCE_EXHAUSTED') {
      throw new Error("Daily AI quota exceeded. Please try again later.");
    }
  }
  return [];
};

export const reconstructLens = async (imageUrl: string, lensSettings: { model: LensType, focalLength: number, aperture: number, distortion: number }) => {
  const ai = getAI();
  try {
    const imageData = await getImageData(imageUrl);
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { data: imageData.data, mimeType: imageData.mimeType } },
          { text: `Role: Optical Engineer. Task: Reconstruct the image as if it were shot through a ${lensSettings.model} lens.
Parameters:
- Focal Length: ${lensSettings.focalLength}mm
- Aperture: f/${lensSettings.aperture}
- Distortion: ${lensSettings.distortion > 0 ? 'Barrel' : lensSettings.distortion < 0 ? 'Pincushion' : 'None'} (${Math.abs(lensSettings.distortion * 100)}%)

Simulate specific characteristics like swirly bokeh (for Petzval), horizontal flares and squeeze (for Anamorphic), or grain and color fringing (for Super-8) based on these settings. Output ONLY the modified image.` }
        ]
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (error: any) {
    console.error("Lens Reconstruction Error:", error);
    if (error.status === 429 || error.message?.includes('429') || error.status === 'RESOURCE_EXHAUSTED') {
      throw new Error("Daily AI quota exceeded. Please try again later.");
    }
  }
  return null;
};

export const relightImage = async (imageUrl: string, lightingPrompt: string, penumbraControl: number = 50, specularRoughness: number = 0.3) => {
  const ai = getAI();
  try {
    const imageData = await getImageData(imageUrl);
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { data: imageData.data, mimeType: imageData.mimeType } },
          { text: `Role: Professional Studio Lighting Artist.
Task: Relight the subject in the image based on the following description: "${lightingPrompt}".
Technical Parameters:
- Penumbra Control (PCSS): ${penumbraControl}% (Controls shadow softness and spread)
- Specular Roughness (GGX BRDF): ${specularRoughness} (Controls highlight spread on materials)
Instructions:
1. Analyze the subject's 3D geometry and surface properties.
2. Apply the new lighting scenario, ensuring accurate shadows, highlights, and subsurface scattering on skin.
3. Maintain the original subject's identity, pose, and clothing details.
4. Output ONLY the relit image.` }
        ]
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (error: any) {
    console.error("Relighting Error:", error);
    if (error.status === 429 || error.message?.includes('429') || error.status === 'RESOURCE_EXHAUSTED') {
      throw new Error("Daily AI quota exceeded. Please try again later.");
    }
  }
  return null;
};

export const generateStudioImage = async (prompt: string, aspectRatio: string = "1:1", size: "1K" | "2K" | "4K" | "1024x1024" = "1K", isEdit: boolean = false, imageUrl?: string) => {
  const ai = getAI();
  try {
    const model = 'gemini-2.5-flash-image';
    const parts: any[] = [{ text: prompt }];

    if (isEdit && imageUrl) {
      const imageData = await getImageData(imageUrl);
      parts.unshift({ inlineData: { data: imageData.data, mimeType: imageData.mimeType } });
    }

    const response = await ai.models.generateContent({
      model: model,
      contents: { parts },
      config: {
        // Fallback for config
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (error: any) {
    console.error("Generation Error:", error);
    if (error.status === 429 || error.message?.includes('429') || error.status === 'RESOURCE_EXHAUSTED') {
      throw new Error("Daily AI quota exceeded. Please try again later.");
    }
  }
  return null;
};

export const analyzeStudioImage = async (imageUrl: string) => {
  const ai = getAI();
  try {
    const imageData = await getImageData(imageUrl);
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: {
        parts: [
          { inlineData: { data: imageData.data, mimeType: imageData.mimeType } },
          { text: "Provide a detailed technical analysis of this image. Analyze the lighting conditions (color temperature, intensity, direction), composition elements (rule of thirds, leading lines, framing), and material properties (reflectivity, roughness, texture). Provide concise, professional insights." }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            lighting: {
              type: Type.OBJECT,
              properties: {
                temperature: { type: Type.STRING, description: "Estimated color temperature (e.g., '5600K Daylight')" },
                intensity: { type: Type.STRING, description: "Lighting intensity and contrast ratio" },
                description: { type: Type.STRING, description: "Brief description of the lighting setup" }
              },
              required: ["temperature", "intensity", "description"]
            },
            composition: {
              type: Type.OBJECT,
              properties: {
                ruleOfThirds: { type: Type.STRING, description: "How the image complies with the rule of thirds" },
                leadingLines: { type: Type.STRING, description: "Presence and effect of leading lines" },
                description: { type: Type.STRING, description: "Brief description of the composition" }
              },
              required: ["ruleOfThirds", "leadingLines", "description"]
            },
            materials: {
              type: Type.OBJECT,
              properties: {
                reflectivity: { type: Type.STRING, description: "Analysis of specular highlights and reflectivity" },
                roughness: { type: Type.STRING, description: "Analysis of surface roughness and texture" },
                description: { type: Type.STRING, description: "Brief description of the materials" }
              },
              required: ["reflectivity", "roughness", "description"]
            }
          },
          required: ["lighting", "composition", "materials"]
        }
      }
    });
    return response.text;
  } catch (error: any) {
    console.error("Analysis Error:", error);
    if (error.status === 429 || error.message?.includes('429') || error.status === 'RESOURCE_EXHAUSTED') {
      throw new Error("Daily AI quota exceeded. Please try again later.");
    }
    return null;
  }
};

export const speakStudioFeedback = async (text: string) => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
        }
      }
    });
    
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const binary = atob(base64Audio);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      
      const dataInt16 = new Int16Array(bytes.buffer);
      const buffer = audioCtx.createBuffer(1, dataInt16.length, 24000);
      const channelData = buffer.getChannelData(0);
      for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;

      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(audioCtx.destination);
      source.start();
    }
  } catch (error) {
    console.error("TTS Error:", error);
  }
};

export const transcribeAudio = async (audioData: string): Promise<string> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { data: audioData, mimeType: 'audio/webm' } },
          { text: "Transcribe the following audio exactly." }
        ]
      }
    });
    return response.text || "";
  } catch (error) {
    console.error("Transcription Error:", error);
    return "";
  }
};

export const analyzeFabric = async (imageUrl: string, description: string) => {
  const ai = getAI();
  try {
    const imageData = await getImageData(imageUrl);
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: {
        parts: [
          { inlineData: { data: imageData.data, mimeType: imageData.mimeType } },
          { text: `Role: Material Scientist & Fashion Physicist.
Task: Analyze the fabric in this image and description: "${description}".
Determine the physical properties for a 3D simulation.

Output strictly valid JSON with no markdown formatting:
{
  "materials": {
    "sheen": 0.0-1.0, // 0=matte, 1=glossy
    "roughness": 0.0-1.0, // 0=smooth, 1=rough
    "metallic": 0.0-1.0, // 0=dielectric, 1=metal
    "subsurface": 0.0-1.0, // 0=opaque, 1=translucent
    "tension": 0.0-1.0, // 0=loose, 1=tight
    "wrinkleDepth": 0.0-1.0 // 0=flat, 1=deep folds
  },
  "physics": {
    "elasticity": 0.0-1.0, // 0=stiff, 1=stretchy
    "windStrength": 0.0-1.0, // How much it reacts to air
    "windResistance": 0.0-1.0 // Drag coefficient
  }
}` }
        ]
      }
    });

    const text = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(text);
  } catch (error: any) {
    console.error("Fabric Analysis Error:", error);
    if (error.status === 429 || error.message?.includes('429') || error.status === 'RESOURCE_EXHAUSTED') {
      throw new Error("Daily AI quota exceeded. Please try again later.");
    }
    return null;
  }
};

function getLightDescription(light: LightState) {
  return `Point source at (${light.x}, ${light.y}, ${light.z}), Intensity: ${light.intensity}, Temp: ${light.temperature}K.`;
}

function getLensDescription(lens: LensType) {
  return `Shot on a ${lens} equivalent lens with simulated depth of field.`;
}
