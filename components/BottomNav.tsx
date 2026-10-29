import React from 'react';
import { motion } from 'framer-motion';
import { Home, Store, User, Map } from 'lucide-react';
import { Screen } from '../types';

interface BottomNavProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
  visible?: boolean;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentScreen, onNavigate, visible = true }) => {
  const tabs = [
    { screen: 'market' as Screen, icon: Store, label: 'Mandi' },
    { screen: 'map' as Screen, icon: Map, label: 'Field' },
    { screen: 'home' as Screen, icon: Home, label: 'Home' },
    { screen: 'profile' as Screen, icon: User, label: 'Profile' },
  ];

  return (
    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md px-4 pb-3 z-30 pointer-events-none">
      {/* ══ Sleek Floating Glass Dock ══ */}
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{
          y: visible ? 0 : 90,
          opacity: visible ? 1 : 0,
        }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        className={`flex items-center justify-around px-2 py-1.5 rounded-full transition-shadow ${
          visible ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
        style={{
          background: 'linear-gradient(160deg, rgba(255,255,255,0.85), rgba(240,253,246,0.75))',
          backdropFilter: 'blur(20px) saturate(170%)',
          WebkitBackdropFilter: 'blur(20px) saturate(170%)',
          border: '1px solid rgba(255,255,255,0.85)',
          boxShadow:
            '0 8px 24px rgba(0,40,20,0.12), 0 2px 8px rgba(0,40,20,0.06), inset 0 1px 0 rgba(255,255,255,0.95)',
        }}
      >
        {tabs.map(({ screen, icon: Icon, label }) => {
          const active = currentScreen === screen;
          return (
            <button
              key={screen}
              onClick={() => onNavigate(screen)}
              className="relative flex flex-col items-center justify-center gap-0.5 py-1 px-4 rounded-xl transition-all active:scale-95"
            >
              {/* Active pill backdrop */}
              {active && (
                <motion.div
                  layoutId="nav-pill"
                  transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                  className="absolute inset-0 rounded-xl"
                  style={{
                    background: 'linear-gradient(150deg, #34d399, #00BB78)',
                    boxShadow:
                      '0 4px 14px rgba(0,187,120,0.4), inset 0 1px 0 rgba(255,255,255,0.5)',
                  }}
                />
              )}

              {/* Glow dot above active tab */}
              {active && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.8)]"
                />
              )}

              <Icon
                size={20}
                strokeWidth={active ? 2.5 : 1.9}
                className="relative z-10"
                style={{
                  color: active ? '#FFFFFF' : '#616B68',
                  filter: active ? 'drop-shadow(0 1px 2px rgba(0,60,30,0.35))' : 'none',
                }}
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
