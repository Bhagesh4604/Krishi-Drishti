import React from 'react';
import { motion } from 'framer-motion';
import { Home, Store, User, Map } from 'lucide-react';
import { Screen } from '../types';

interface BottomNavProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
}

const PRIMARY = '#00BB78';

const BottomNav: React.FC<BottomNavProps> = ({ currentScreen, onNavigate }) => {
  const tabs = [
    { screen: 'market' as Screen, icon: Store, label: 'Mandi' },
    { screen: 'map' as Screen, icon: Map, label: 'Field' },
    { screen: 'home' as Screen, icon: Home, label: 'Home' },
    { screen: 'profile' as Screen, icon: User, label: 'Profile' },
  ];

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md px-4 pb-3 z-50 pointer-events-none" style={{ perspective: '800px' }}>
      {/* ══ Floating 3D Glass Dock ══ */}
      <motion.div
        initial={{ y: 80, rotateX: 30, opacity: 0 }}
        animate={{ y: 0, rotateX: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 160, damping: 18, delay: 0.2 }}
        className="pointer-events-auto flex items-center justify-around px-2 py-2 rounded-[2rem]"
        style={{
          transformStyle: 'preserve-3d',
          background: 'linear-gradient(160deg, rgba(255,255,255,0.88), rgba(240,253,246,0.72))',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: '1px solid rgba(255,255,255,0.9)',
          boxShadow:
            '0 8px 24px rgba(0,60,30,0.16), 0 24px 60px -10px rgba(0,60,30,0.28), inset 0 1px 0 rgba(255,255,255,1), 0 0 40px rgba(0,187,120,0.10)',
        }}
      >
        {tabs.map(({ screen, icon: Icon, label }) => {
          const active = currentScreen === screen;
          return (
            <button
              key={screen}
              onClick={() => onNavigate(screen)}
              className="relative flex flex-col items-center justify-center gap-0.5 py-1.5 px-4 rounded-2xl transition-all active:scale-90"
              style={{ transform: active ? 'translateZ(18px)' : 'translateZ(0)' }}
            >
              {/* Active pill backdrop */}
              {active && (
                <motion.div
                  layoutId="nav-pill"
                  transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                  className="absolute inset-0 rounded-2xl"
                  style={{
                    background: 'linear-gradient(150deg, #34d399, #00BB78)',
                    boxShadow:
                      '0 4px 14px rgba(0,187,120,0.45), 0 10px 24px rgba(0,187,120,0.3), inset 0 1px 0 rgba(255,255,255,0.5)',
                  }}
                />
              )}

              {/* Glow dot above active tab */}
              {active && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_3px_rgba(52,211,153,0.8)]"
                />
              )}

              <Icon
                size={21}
                strokeWidth={active ? 2.6 : 1.9}
                className="relative z-10"
                style={{ color: active ? '#FFFFFF' : '#616B68', filter: active ? 'drop-shadow(0 1px 2px rgba(0,60,30,0.35))' : 'none' }}
              />
              <span
                className="relative z-10 text-[10px] font-bold tracking-wide"
                style={{ color: active ? '#FFFFFF' : '#616B68' }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </motion.div>
    </div>
  );
};

export default BottomNav;
