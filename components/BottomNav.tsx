
import React from 'react';
import { Home, Store, Camera, Map as MapIcon, MessageCircle } from 'lucide-react';
import { Screen } from '../types';
import { COLORS } from '../constants';

interface BottomNavProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentScreen, onNavigate }) => {
  const navItems = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'chat', icon: MessageCircle, label: 'Chat' },
    { id: 'vision', icon: Camera, label: 'Scan' },
    { id: 'map', icon: MapIcon, label: 'Map' },
    { id: 'market', icon: Store, label: 'Mandi' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 backdrop-blur-xl border-t border-gray-100 px-2 py-3 flex justify-around items-center z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentScreen === item.id || (item.id === 'vision' && currentScreen === 'vision-result');
        
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id as Screen)}
            className="flex flex-col items-center justify-center space-y-1 transition-all duration-300 active:scale-90 flex-1"
            style={{ color: isActive ? COLORS.primary : '#94a3b8' }}
          >
            <div className={`p-2 rounded-2xl transition-all ${isActive ? 'bg-green-50 scale-110 shadow-sm' : ''}`}>
               <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
            </div>
            <span className={`text-[8px] font-black uppercase tracking-wider transition-opacity ${isActive ? 'opacity-100' : 'opacity-60'}`}>
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default BottomNav;
