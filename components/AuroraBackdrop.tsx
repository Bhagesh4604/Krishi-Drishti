import React from 'react';
import { motion } from 'framer-motion';

/**
 * AuroraBackdrop — animated 3D ambient light field.
 * Floating gradient orbs + perspective grid floor, rendered behind content.
 */
const AuroraBackdrop: React.FC<{ variant?: 'light' | 'dark' }> = ({ variant = 'light' }) => {
  const dark = variant === 'dark';
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      {/* Perspective grid floor — gives depth to the scene */}
      <div
        className="absolute inset-x-0 bottom-0 h-64 opacity-40"
        style={{
          backgroundImage: dark
            ? 'linear-gradient(rgba(52,211,153,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(52,211,153,0.18) 1px, transparent 1px)'
            : 'linear-gradient(rgba(0,187,120,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(0,187,120,0.12) 1px, transparent 1px)',
          backgroundSize: '34px 34px',
          transform: 'perspective(400px) rotateX(58deg)',
          transformOrigin: 'bottom',
          maskImage: 'linear-gradient(to top, black 20%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to top, black 20%, transparent 100%)',
        }}
      />

      {/* Floating aurora orbs */}
      <motion.div
        animate={{ x: [0, 40, -20, 0], y: [0, -50, 20, 0], scale: [1, 1.2, 0.95, 1] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
        className={`absolute -top-24 -left-24 w-72 h-72 rounded-full blur-3xl ${dark ? 'bg-emerald-400/30' : 'bg-emerald-300/50'}`}
      />
      <motion.div
        animate={{ x: [0, -35, 25, 0], y: [0, 40, -30, 0], scale: [1, 0.85, 1.15, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className={`absolute top-1/3 -right-20 w-64 h-64 rounded-full blur-3xl ${dark ? 'bg-teal-400/25' : 'bg-teal-200/50'}`}
      />
      <motion.div
        animate={{ x: [0, 30, -30, 0], y: [0, -25, 35, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
        className={`absolute -bottom-16 left-1/4 w-72 h-72 rounded-full blur-3xl ${dark ? 'bg-amber-400/20' : 'bg-amber-200/45'}`}
      />

      {/* Subtle vignette for depth */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,20,10,0.10) 100%)',
        }}
      />
    </div>
  );
};

export default AuroraBackdrop;
