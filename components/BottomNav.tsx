import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Store, User, Map } from 'lucide-react';
import { Screen } from '../types';

interface BottomNavProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentScreen, onNavigate }) => {
  const tabs = [
    { screen: 'market' as Screen, icon: Store, label: 'Mandi', emoji: '📊' },
    { screen: 'map' as Screen, icon: Map, label: 'Field', emoji: '🗺' },
    { screen: 'home' as Screen, icon: Home, label: 'Home', emoji: '🏡' },
    { screen: 'profile' as Screen, icon: User, label: 'Profile', emoji: '👤' },
  ];

  return (
    <div className="absolute bottom-0 left-0 right-0 px-4 pb-3 z-50 pointer-events-none">
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 22, delay: 0.15 }}
        className="pointer-events-auto flex items-center justify-around px-2 py-2 rounded-[2rem]"
        style={{
          background: 'rgba(5, 12, 8, 0.92)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.4), 0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
        }}>
        {tabs.map(({ screen, icon: Icon, label, emoji }) => {
          const active = currentScreen === screen;
          return (
            <button
              key={screen}
              onClick={() => onNavigate(screen)}
              className="relative flex flex-col items-center justify-center gap-0.5 py-1.5 px-5 rounded-2xl transition-all active:scale-90"
            >
              {/* Active glow background */}
              {active && (
                <motion.div
                  layoutId="nav-pill"
                  transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                  className="absolute inset-0 rounded-2xl"
                  style={{
                    background: 'linear-gradient(135deg, rgba(0,255,135,0.2), rgba(0,187,120,0.15))',
                    border: '1px solid rgba(0,255,135,0.25)',
                    boxShadow: '0 0 20px rgba(0,255,135,0.15)',
                  }}
                />
              )}

              {/* Active dot indicator */}
              {active && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
                  style={{ background: '#00FF87', boxShadow: '0 0 8px 2px rgba(0,255,135,0.6)' }}
                />
              )}

              <Icon
                size={20}
                strokeWidth={active ? 2.5 : 1.8}
                className="relative z-10 transition-colors"
                style={{ color: active ? '#00FF87' : 'rgba(255,255,255,0.35)' }}
              />
              <span
                className="relative z-10 text-[10px] font-bold tracking-wide transition-colors"
                style={{ color: active ? '#00FF87' : 'rgba(255,255,255,0.3)' }}
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
