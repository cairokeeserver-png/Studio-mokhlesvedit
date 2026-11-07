import React, { useRef, useEffect } from 'react';
import { haptics } from '../utils/haptics';

interface TactileSliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  resistance?: 'light' | 'medium' | 'heavy';
  detentStep?: number; // How often to trigger a detent
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const TactileSlider: React.FC<TactileSliderProps> = ({ 
  resistance = 'medium', 
  detentStep,
  onChange, 
  className,
  ...props 
}) => {
  const lastDetentValue = useRef<number | null>(null);
  const isDragging = useRef(false);

  // Initialize audio context on first interaction
  const handlePointerDown = () => {
    haptics.enable();
    isDragging.current = true;
  };

  const handlePointerUp = () => {
    isDragging.current = false;
    lastDetentValue.current = null;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    const min = parseFloat(props.min as string || '0');
    const max = parseFloat(props.max as string || '100');
    const step = parseFloat(props.step as string || '1');

    if (isDragging.current) {
      // Trigger limit haptics
      if (val === min || val === max) {
        haptics.trigger('limit');
      } else {
        // Calculate detents
        const effectiveDetent = detentStep || step;
        if (lastDetentValue.current === null || Math.abs(val - lastDetentValue.current) >= effectiveDetent) {
          haptics.trigger(resistance === 'heavy' ? 'heavy' : resistance === 'light' ? 'light' : 'detent');
          lastDetentValue.current = val;
        }
      }
    }

    if (onChange) {
      onChange(e);
    }
  };

  return (
    <input
      type="range"
      onChange={handleChange}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      className={`w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-white ${className || ''}`}
      {...props}
    />
  );
};
