import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';

/**
 * Tilt3D — Interactive 3D tilt card wrapper.
 * Tracks the pointer and applies perspective rotateX/rotateY with a
 * moving specular highlight, giving every card a physical, layered feel.
 */
interface Tilt3DProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  maxTilt?: number;        // degrees
  glare?: boolean;
  onClick?: () => void;
  lift?: boolean;          // extra translateY on hover
}

const Tilt3D: React.FC<Tilt3DProps> = ({
  children,
  className = '',
  style,
  maxTilt = 10,
  glare = true,
  onClick,
  lift = true,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState('');
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50, o: 0 });

  const handleMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;   // 0..1
    const py = (e.clientY - rect.top) / rect.height;   // 0..1
    const rx = (0.5 - py) * maxTilt * 2;
    const ry = (px - 0.5) * maxTilt * 2;
    setTransform(
      `perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)${lift ? ' translateZ(14px)' : ''}`
    );
    setGlarePos({ x: px * 100, y: py * 100, o: 0.22 });
  };

  const handleLeave = () => {
    setTransform('perspective(900px) rotateX(0deg) rotateY(0deg) translateZ(0px)');
    setGlarePos((g) => ({ ...g, o: 0 }));
  };

  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`relative ${className}`}
      style={{ cursor: 'pointer' }}
    >
      <div
        ref={ref}
        onPointerMove={handleMove}
        onPointerLeave={handleLeave}
        className="relative w-full h-full overflow-hidden"
        style={{
          transform,
          transition: 'transform 0.18s ease-out',
          transformStyle: 'preserve-3d',
          borderRadius: 'inherit',
          ...style,
        }}
      >
        {children}
        {glare && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              opacity: glarePos.o,
              transition: 'opacity 0.3s ease',
              background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(255,255,255,0.55), transparent 55%)`,
              borderRadius: 'inherit',
            }}
          />
        )}
      </div>
    </motion.div>
  );
};

export default Tilt3D;
