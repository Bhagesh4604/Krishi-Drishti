import React from 'react';
import { Home, Store, User, Map } from 'lucide-react';
import { Screen } from '../types';
import { motion } from 'framer-motion';

interface BottomNavProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentScreen, onNavigate }) => {
  return (
    <motion.div 
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl shadow-[0_-10px_30px_rgba(0,0,0,0.05)] flex justify-between items-center px-4 py-2 z-50 border-t border-emerald-50/50"
    >
      {/* Mandi */}
      <motion.button
        whileTap={{ scale: 0.8 }}
        onClick={() => onNavigate('market')}
        className={`relative py-2 px-1 flex flex-col items-center justify-center gap-1 w-[60px] z-10 transition-colors ${currentScreen === 'market' ? 'text-emerald-700' : 'text-gray-400 hover:text-gray-600'}`}
      >
        {currentScreen === 'market' && (
          <motion.div 
            layoutId="nav-glow" 
            className="absolute inset-0 bg-emerald-50 rounded-[1.2rem] -z-10 border border-emerald-100/50 shadow-inner"
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          />
        )}
        <Store size={22} className={currentScreen === 'market' ? 'drop-shadow-sm' : ''} />
        <span className="text-[10px] font-bold">Mandi</span>
      </motion.button>

      {/* Field */}
      <motion.button
        whileTap={{ scale: 0.8 }}
        onClick={() => onNavigate('map')}
        className={`relative py-2 px-1 flex flex-col items-center justify-center gap-1 w-[60px] z-10 transition-colors ${currentScreen === 'map' ? 'text-emerald-700' : 'text-gray-400 hover:text-gray-600'}`}
      >
        {currentScreen === 'map' && (
          <motion.div 
            layoutId="nav-glow" 
            className="absolute inset-0 bg-emerald-50 rounded-[1.2rem] -z-10 border border-emerald-100/50 shadow-inner"
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          />
        )}
        <Map size={22} className={currentScreen === 'map' ? 'drop-shadow-sm' : ''} />
        <span className="text-[10px] font-bold">Field</span>
      </motion.button>

      {/* Center: Home Floating Pillar */}
      <div className="relative flex justify-center w-[80px] z-20">
        <motion.button
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => onNavigate('home')}
          className={`p-4 rounded-[2rem] shadow-xl transition-all transform -translate-y-6 border-[6px] border-[#f8fafc] ${
            currentScreen === 'home' 
            ? 'bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-emerald-500/40 ring-4 ring-emerald-100/50' 
            : 'bg-white text-gray-400 hover:text-gray-600 hover:shadow-lg'
          }`}
        >
          <Home size={28} />
        </motion.button>
      </div>

      <div className="w-[10px]"></div>

      {/* Profile */}
      <motion.button
        whileTap={{ scale: 0.8 }}
        onClick={() => onNavigate('profile')}
        className={`relative py-2 px-1 flex flex-col items-center justify-center gap-1 w-[60px] z-10 transition-colors ${currentScreen === 'profile' ? 'text-emerald-700' : 'text-gray-400 hover:text-gray-600'}`}
      >
        {currentScreen === 'profile' && (
          <motion.div 
            layoutId="nav-glow" 
            className="absolute inset-0 bg-emerald-50 rounded-[1.2rem] -z-10 border border-emerald-100/50 shadow-inner"
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          />
        )}
        <User size={22} className={currentScreen === 'profile' ? 'drop-shadow-sm' : ''} />
        <span className="text-[10px] font-bold">Profile</span>
      </motion.button>

    </motion.div>
  );
};

export default BottomNav;
