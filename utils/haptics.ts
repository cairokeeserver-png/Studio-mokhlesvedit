class HapticEngine {
  private audioCtx: AudioContext | null = null;
  private enabled: boolean = true;

  private initAudio() {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    }
  }

  public enable() {
    this.enabled = true;
    this.initAudio();
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  public disable() {
    this.enabled = false;
  }

  public trigger(type: 'detent' | 'limit' | 'heavy' | 'light' = 'detent') {
    if (!this.enabled) return;

    // Hardware vibration (Voice Coil Actuator simulation on mobile)
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      switch (type) {
        case 'detent': navigator.vibrate(2); break;
        case 'light': navigator.vibrate(5); break;
        case 'heavy': navigator.vibrate(15); break;
        case 'limit': navigator.vibrate([10, 20, 10]); break;
      }
    }

    // Audio synthesis for tactile illusion (Desktop/Mobile fallback)
    this.initAudio();
    if (!this.audioCtx) return;

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    const now = this.audioCtx.currentTime;

    if (type === 'detent' || type === 'light') {
      // High-frequency, very short click (like a fine detent)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.02);
      
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
      
      osc.start(now);
      osc.stop(now + 0.02);
    } else if (type === 'heavy' || type === 'limit') {
      // Lower-frequency, slightly longer thud (like hitting a limit or heavy resistance)
      osc.type = 'square';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.05);
      
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      
      osc.start(now);
      osc.stop(now + 0.05);
    }
  }
}

export const haptics = new HapticEngine();
