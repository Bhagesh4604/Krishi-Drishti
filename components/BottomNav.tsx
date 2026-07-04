import React from 'react';
import { Home, Store, User, Map } from 'lucide-react';
import { Screen } from '../types';

interface BottomNavProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
}

const PRIMARY = '#00BB78';
const DARK = '#001A11';
const GRAY = '#616B68';

const BottomNav: React.FC<BottomNavProps> = ({ currentScreen, onNavigate }) => {
  const tabs = [
    { screen: 'market' as Screen, icon: Store, label: 'Mandi' },
    { screen: 'map' as Screen, icon: Map, label: 'Field' },
    { screen: 'home' as Screen, icon: Home, label: 'Home' },
    { screen: 'profile' as Screen, icon: User, label: 'Profile' },
  ];

  return (
    <div
      className="fixed bottom-0 left-0 right-0 flex items-center justify-around px-2 z-50"
      style={{
        background: '#FFFFFF',
        borderTop: '1px solid #F0F0F0',
        paddingTop: '0.5rem',
        paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      {tabs.map(({ screen, icon: Icon, label }) => {
        const active = currentScreen === screen;
        return (
          <button
            key={screen}
            onClick={() => onNavigate(screen)}
            className="flex flex-col items-center justify-center gap-1 py-1 px-5 rounded-xl transition-all active:scale-90"
          >
            {/* Active indicator dot */}
            {active && (
              <span
                className="absolute -top-0.5 w-5 h-0.5 rounded-full"
                style={{ background: PRIMARY }}
              />
            )}
            <Icon
              size={22}
              strokeWidth={active ? 2.5 : 1.8}
              style={{ color: active ? PRIMARY : GRAY }}
            />
            <span
              className="text-[10px] font-semibold"
              style={{ color: active ? PRIMARY : GRAY }}
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default BottomNav;
