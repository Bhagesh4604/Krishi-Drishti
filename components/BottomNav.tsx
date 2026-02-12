import { Home, Store, Camera, MessageCircle, User, Map } from 'lucide-react';
import { Screen } from '../types';

interface BottomNavProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentScreen, onNavigate }) => {
  const navItems = [
    { id: 'market', icon: Store, label: 'Mandi' },
    { id: 'map', icon: Map, label: 'Field' },
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'profile', icon: User, label: 'Profile' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md shadow-[0_-5px_15px_-5px_rgba(0,0,0,0.1)] flex justify-around items-center py-2 z-50 border-t border-orange-50/50">

      {/* Mandi */}
      <button
        onClick={() => onNavigate('market')}
        className={`flex flex-col items-center gap-0.5 transition-all ${currentScreen === 'market' ? 'text-[#E09F3E]' : 'text-gray-400 hover:text-gray-600'}`}
      >
        <Store size={22} />
        <span className="text-[9px] font-bold">Mandi</span>
      </button>

      {/* Field */}
      <button
        onClick={() => onNavigate('map')}
        className={`flex flex-col items-center gap-0.5 transition-all ${currentScreen === 'map' ? 'text-[#E09F3E]' : 'text-gray-400 hover:text-gray-600'}`}
      >
        <Map size={22} />
        <span className="text-[9px] font-bold">Field</span>
      </button>

      {/* Center: Home */}
      <button
        onClick={() => onNavigate('home')}
        className={`p-3 rounded-full shadow-lg transition-all transform -translate-y-6 border-4 border-white ${currentScreen === 'home' ? 'bg-[#333333] text-[#D4AF37]' : 'bg-gray-100 text-gray-400'}`}
      >
        <Home size={28} />
      </button>

      {/* Chat (Adding Chat too for completeness or just Profile?) */}
      {/* Profile */}
      <button
        onClick={() => onNavigate('profile')}
        className={`flex flex-col items-center gap-0.5 transition-all ${currentScreen === 'profile' ? 'text-[#E09F3E]' : 'text-gray-400 hover:text-gray-600'}`}
      >
        <User size={22} />
        <span className="text-[9px] font-bold">Profile</span>
      </button>

    </div>
  );
};

export default BottomNav;
