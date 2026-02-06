
import React, { useState, useEffect } from 'react';
import { Screen, UserProfile, Language, VisionMode } from './types';
import AuthScreen from './screens/AuthScreen';
import ProfileScreen from './screens/ProfileScreen';
import DashboardScreen from './screens/DashboardScreen';
import ChatScreen from './screens/ChatScreen';
import VisionScreen from './screens/VisionScreen';
import VisionResultScreen from './screens/VisionResultScreen';
import FarmMapScreen from './screens/FarmMapScreen';
import MarketScreen from './screens/MarketScreen';
import MarketDetailScreen from './screens/MarketDetailScreen';
import FinanceScreen from './screens/FinanceScreen';
import ForecastScreen from './screens/ForecastScreen';
import LiveAudioScreen from './screens/LiveAudioScreen';
import CarbonVaultScreen from './screens/CarbonVaultScreen';
import SchemeSetuScreen from './screens/SchemeSetuScreen';
import CropStressScreen from './screens/CropStressScreen';
import BottomNav from './components/BottomNav';
import { userService } from './src/services/api';
import { translations } from './translations';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('auth');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [visionMode, setVisionMode] = useState<VisionMode>('diagnosis');
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [language, setLanguage] = useState<Language>('en');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const savedLang = localStorage.getItem('ks_lang') as Language;
      if (savedLang) setLanguage(savedLang);

      const token = localStorage.getItem('ks_token');
      if (token) {
        try {
          const profile = await userService.getProfile();
          setUser(profile);
          setCurrentScreen(profile.name ? 'home' : 'profile');
        } catch (e) {
          console.error("Session expired or invalid", e);
          localStorage.removeItem('ks_token');
          setCurrentScreen('auth');
        }
      } else {
        setCurrentScreen('auth');
      }
      setLoading(false);
    };
    init();
  }, []);

  const changeLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('ks_lang', lang);
  };

  const navigateTo = (screen: Screen, data?: any) => {
    if (screen === 'vision-result' && data?.image) {
      setCapturedImage(data.image);
      if (data.mode) setVisionMode(data.mode);
    }
    if (screen === 'market-detail' && data?.listing) {
      setSelectedListing(data.listing);
    }
    setCurrentScreen(screen);
  };

  const handleLogin = async () => {
    // AuthScreen sets the token. Now we fetch profile to decide where to go.
    try {
      setLoading(true);
      const profile = await userService.getProfile();
      setUser(profile);
      // If profile has a name, go home, else go to completion screen
      setCurrentScreen(profile.name ? 'home' : 'profile');
    } catch (e) {
      // If 404 (User created but no profile data yet), go to profile
      setCurrentScreen('profile');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileComplete = (profile: UserProfile) => {
    // Profile is already saved in ProfileScreen, just update local state and nav
    const completeProfile = { ...profile, language };
    setUser(completeProfile);
    navigateTo('home');
  };

  if (loading) {
    return <div className="h-screen flex items-center justify-center bg-white text-green-600 font-bold">Loading...</div>;
  }

  const t = translations[language];

  const renderScreen = () => {
    switch (currentScreen) {
      case 'auth':
        return <AuthScreen onLogin={handleLogin} currentLang={language} onLangChange={changeLanguage} />;
      case 'profile':
        return <ProfileScreen onComplete={handleProfileComplete} t={t} />;
      case 'home':
        return <DashboardScreen navigateTo={navigateTo} user={user} t={t} onLangChange={changeLanguage} currentLang={language} />;
      case 'chat':
        return <ChatScreen navigateTo={navigateTo} language={language} t={t} />;
      case 'vision':
        return <VisionScreen navigateTo={navigateTo} t={t} />;
      case 'vision-result':
        return <VisionResultScreen navigateTo={navigateTo} image={capturedImage} mode={visionMode} language={language} t={t} />;
      case 'map':
        return <FarmMapScreen navigateTo={navigateTo} />;
      case 'market':
        return <MarketScreen navigateTo={navigateTo} t={t} />;
      case 'market-detail':
        return <MarketDetailScreen navigateTo={navigateTo} listing={selectedListing} t={t} />;
      case 'finance':
        return <FinanceScreen navigateTo={navigateTo} t={t} />;
      case 'forecast':
        return <ForecastScreen navigateTo={navigateTo} t={t} />;
      case 'live-audio':
        return <LiveAudioScreen navigateTo={navigateTo} language={language} t={t} />;
      case 'carbon-vault':
        return <CarbonVaultScreen navigateTo={navigateTo} t={t} />;
      case 'scheme-setu':
        return <SchemeSetuScreen navigateTo={navigateTo} user={user} t={t} />;
      case 'crop-stress':
        return <CropStressScreen />;
      default:
        return <AuthScreen onLogin={handleLogin} currentLang={language} onLangChange={changeLanguage} />;
    }
  };

  const showNav = !['auth', 'profile', 'market-detail', 'live-audio', 'carbon-vault', 'scheme-setu'].includes(currentScreen);

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-[#F8FAF8] shadow-xl relative overflow-hidden text-gray-900">
      <main className="flex-1 overflow-y-auto pb-20">
        {renderScreen()}
      </main>
      {showNav && (
        <BottomNav currentScreen={currentScreen} onNavigate={navigateTo} />
      )}
    </div>
  );
};

export default App;
