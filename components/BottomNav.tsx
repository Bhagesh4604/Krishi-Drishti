import React from 'react';
import { Home, Store, Camera, Map as MapIcon, MessageCircle, User } from 'lucide-react';
import { Screen } from '../types';

interface BottomNavProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentScreen, onNavigate }) => {
  const navItems = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'market', icon: Store, label: 'Mandi' },
    { id: 'vision', icon: Camera, label: 'Scan' },
    { id: 'chat', icon: MessageCircle, label: 'Ask AI' },
    { id: 'profile', icon: User, label: 'Profile' },
  ];

  return (
    <div className="absolute bottom-6 left-6 right-6 bg-white/90 backdrop-blur-md rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-gray-100 px-6 py-4 flex justify-between items-center z-50 max-w-sm mx-auto">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentScreen === item.id || (item.id === 'vision' && currentScreen === 'vision-result');

        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id as Screen)}
            className="flex flex-col items-center justify-center space-y-1 transition-all duration-300 active:scale-95"
          >
            <div className={`p-2 rounded-full transition-all ${isActive ? 'bg-green-600 text-white shadow-lg shadow-green-200' : 'text-gray-400 hover:text-green-600'}`}>
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default BottomNav;
