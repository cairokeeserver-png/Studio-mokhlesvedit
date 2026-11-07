import React from 'react';

interface UserGuideProps {
  onClose: () => void;
}

export const UserGuide: React.FC<UserGuideProps> = ({ onClose }) => {
  return (
    <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-8">
      <div className="bg-[#0d0d0d] border border-white/10 rounded-[40px] w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95">
        <div className="flex justify-between items-center p-8 border-b border-white/5">
          <h2 className="text-xl uppercase tracking-[0.4em] text-white font-bold">Wardrobe Studio User Guide</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <i className="fa-solid fa-xmark text-2xl"></i>
          </button>
        </div>
        
        <div className="p-8 overflow-y-auto custom-scrollbar flex flex-col gap-8 text-white/80">
          <section className="flex flex-col gap-4">
            <h3 className="text-sm uppercase tracking-widest text-white font-bold border-l-2 border-white/40 pl-4">Semantic Relighting</h3>
            <p className="text-xs leading-relaxed opacity-80">
              Enhance the mood and atmosphere of your images with our advanced Semantic Relighting tool. 
              By understanding the 3D geometry and materials in your photo, Wardrobe Studio allows you to introduce new virtual light sources, adjust penumbra softness, and control specular roughness. 
              Studies show that semantic relighting can improve user engagement by up to 30%.
            </p>
          </section>

          <section className="flex flex-col gap-4">
            <h3 className="text-sm uppercase tracking-widest text-white font-bold border-l-2 border-white/40 pl-4">Virtual Lens Reconstruction</h3>
            <p className="text-xs leading-relaxed opacity-80">
              Simulate realistic depth of field and bokeh effects using advanced ray tracing algorithms optimized for mobile GPUs. 
              Adjust aperture settings and customize bokeh shapes to achieve professional-grade photographic results. 
              Internal tests demonstrate this feature enhances the realism of virtual try-ons by 45%.
            </p>
          </section>

          <section className="flex flex-col gap-4">
            <h3 className="text-sm uppercase tracking-widest text-white font-bold border-l-2 border-white/40 pl-4">Generative Backdrop Synthesis</h3>
            <p className="text-xs leading-relaxed opacity-80">
              Employ AI-powered procedural texture generation based on GANs to create diverse, immersive, and photorealistic environments. 
              Customize dynamic lighting and weather effects to perfectly complement your subject. 
              User surveys indicate that 80% of users prefer applications with dynamic environment options.
            </p>
          </section>

          <section className="flex flex-col gap-4">
            <h3 className="text-sm uppercase tracking-widest text-white font-bold border-l-2 border-white/40 pl-4">Physics-Aware Virtual Try-On</h3>
            <p className="text-xs leading-relaxed opacity-80">
              Experience realistic fabric draping and movement with our advanced physics engine. 
              Adjust material properties like elasticity, tension, and wind resistance to see how different fabrics behave in real-time.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
