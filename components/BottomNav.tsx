import React from 'react';
import { Home, Store, Camera, MessageCircle, User } from 'lucide-react';
import { Screen } from '../types';

interface BottomNavProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentScreen, onNavigate }) => {
  const navItems = [
    { id: 'market', icon: Store, label: 'Mandi' },
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'profile', icon: User, label: 'Profile' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md shadow-[0_-5px_15px_-5px_rgba(0,0,0,0.1)] flex justify-around items-center py-3 z-50 border-t border-orange-50/50">

      {/* Left Side: Mandi */}
      <button
        onClick={() => onNavigate('market')}
        className={`flex flex-col items-center gap-1 p-2 transition-all ${currentScreen === 'market' ? 'text-[var(--accent-orange)]' : 'text-gray-400 hover:text-gray-600'}`}
      >
        <Store size={24} />
        <span className="text-[10px] font-medium">Mandi</span>
      </button>

      {/* Center: Home (Highlighted) */}
      <button
        onClick={() => onNavigate('home')}
        className={`p-4 rounded-full shadow-lg transition-all transform -translate-y-6 border-4 border-[#FFF8E7] ${currentScreen === 'home' ? 'bg-black text-white' : 'bg-gray-800 text-gray-300'}`}
      >
        <Home size={28} />
      </button>

      {/* Right Side: Profile */}
      <button
        onClick={() => onNavigate('profile')}
        className={`flex flex-col items-center gap-1 p-2 transition-all ${currentScreen === 'profile' ? 'text-[var(--accent-orange)]' : 'text-gray-400 hover:text-gray-600'}`}
      >
        <User size={24} />
        <span className="text-[10px] font-medium">Profile</span>
      </button>

    </div>
  );
};

export default BottomNav;
