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
import SocialScreen from './screens/SocialScreen';
// import ContractsScreen from './screens/ContractsScreen';
// import GlobeView from './screens/GlobeView';
import SplashScreen from './screens/SplashScreen';
import BottomNav from './components/BottomNav';
import { userService } from './src/services/api';

import { translations } from './translations';
import LandingScreen from './screens/LandingScreen';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
};

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-red-50 text-red-900 h-screen overflow-auto">
          <h1 className="text-2xl font-bold mb-4">Something went wrong.</h1>
          <pre className="text-xs font-mono bg-white p-4 rounded border border-red-200 whitespace-pre-wrap">
            {this.state.error?.toString()}
            <br />
            {this.state.error?.stack}
          </pre>
          <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-red-600 text-white rounded">
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const AppContent: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [currentScreen, setCurrentScreen] = useState<Screen>('landing');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [visionMode, setVisionMode] = useState<VisionMode>('diagnosis');
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [language, setLanguage] = useState<Language>('en');
  const [loading, setLoading] = useState(true);
  const [isGuestMode, setIsGuestMode] = useState(false);


  const [connectionError, setConnectionError] = useState(false);

  // Helper to append logs
  const log = (msg: string) => {
    console.log(msg);
    const list = document.getElementById('debug-log-list');
    if (list) {
      const li = document.createElement('li');
      li.innerText = `${new Date().toLocaleTimeString()} - ${msg}`;
      list.appendChild(li);
    }
  };

  useEffect(() => {
    console.log("[App] useEffect fired. showSplash:", showSplash);
    if (showSplash) return;

    const init = async () => {
      console.log("[App] init called");
      log("[App] Init started (No Delay)");

      if (!userService) {
        log("[App] CRITICAL: userService is undefined!");
        // throw new Error("userService missing"); // Don't crash, just log.
      } else {
        log("[App] userService is present");
      }

      // Helper to get location
      const getLocation = (): Promise<{ lat: number, lng: number } | null> => {
        return new Promise((resolve) => {
          if (!navigator.geolocation) {
            console.log("Geolocation not supported");
            resolve(null);
            return;
          }
          navigator.geolocation.getCurrentPosition(
            (position) => {
              console.log("Got location", position.coords);
              resolve({
                lat: position.coords.latitude,
                lng: position.coords.longitude
              });
            },
            (error) => {
              console.log("Location error", error);
              resolve(null);
            },
            { timeout: 10000, enableHighAccuracy: true }
          );
        });
      };

      const savedLang = localStorage.getItem('ks_lang') as Language;
      if (savedLang) setLanguage(savedLang);

      // Timeout race
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 5000)
      );

      const token = localStorage.getItem('ks_token');
      log(`[App] Token found: ${!!token}`);

      try {
        // Fetch location in parallel or before profile
        const location = await getLocation();

        if (token) {
          log("[App] Fetching profile...");
          // Race profile fetch against 5s timeout
          const profile = await Promise.race([
            userService.getProfile(),
            timeoutPromise
          ]) as UserProfile;

          log(`[App] Profile fetched: ${profile?.name}`);

          // Merge real location into profile if available
          if (location) {
            profile.location = location;
          }

          setUser(profile);
          setCurrentScreen('landing'); // Always start at landing screen
        } else {
          // even if no token, we might want to store location for guest mode later
          log("[App] No token, going to landing");
          // Initialize a temporary guest user with location if needed
          if (location) {
            // We can't set full profile, but we could pass it to dashboard if we had a guest context
            // For now, if we have a user state even for guests:
            // setUser({ ...guestDefaults, location }); 
          }
          setCurrentScreen('landing');
        }
      } catch (e) {
        log(`[App] Error: ${e.message}`);
        console.error("[App] Init error:", e);
        // If it was a timeout or network error, show retry
        if (e.message === "Timeout" || e.message === "Network Error") {
          setConnectionError(true);
          setLoading(false); // Stop loading spinner to show error UI
          return;
        }

        // Otherwise assume invalid session
        localStorage.removeItem('ks_token');
        setCurrentScreen('landing');
      }
      setLoading(false);
    };
    init();
  }, [showSplash]); // Rerun when showSplash changes to false

  // Global Error Handler for Async/Event Errors
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error("Global Error:", event.error);
      setConnectionError(true); // Reuse existing error UI or add specific state
      // Optionally store error message in state to display
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled Rejection:", event.reason);
      setConnectionError(true);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
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
    try {
      setLoading(true);
      const profile = await userService.getProfile();
      setUser(profile);
      setCurrentScreen(profile.name ? 'home' : 'profile');
    } catch (e) {
      setCurrentScreen('profile');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileComplete = (profile: UserProfile) => {
    const completeProfile = { ...profile, language };
    setUser(completeProfile);
    navigateTo('home');
  };

  const t = translations[language];

  if (showSplash) {
    return (
      <div className="h-full w-full max-w-md mx-auto bg-white shadow-2xl overflow-hidden relative font-sans">
        {/* Splash Screen Overlay */}
        <SplashScreen onFinish={() => setShowSplash(false)} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-white text-green-600 font-bold p-10">
        <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mb-4"></div>
        <h2 className="text-xl font-bold text-gray-800">Krishi Drishti</h2>
        <p className="text-sm text-green-600 font-medium animate-pulse">Initializing Secure Connection...</p>
      </div>
    );
  }



  if (connectionError) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-white p-6 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" x2="12" y1="9" y2="13" /><line x1="12" x2="12.01" y1="17" y2="17" /></svg>
        </div>
        <h2 className="text-xl font-black text-gray-900 mb-2">Connection Timeout</h2>
        <p className="text-sm text-gray-500 mb-6 font-bold">Server is taking too long to respond. Ensure backend is running.</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-green-700 text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest active:scale-95 transition-transform"
        >
          Retry Connection
        </button>
      </div>
    );
  }





  const renderScreen = () => {
    switch (currentScreen) {
      case 'landing':
        return (
          <LandingScreen
            onLogin={() => {
              // If user is already loaded/valid, go home directly
              if (user) {
                setCurrentScreen(user.name ? 'home' : 'profile');
              } else {
                setCurrentScreen('auth');
              }
            }}
            onBrowse={() => {
              setIsGuestMode(true);
              setCurrentScreen('home');
            }}
            currentLang={language}
            onLangChange={changeLanguage}
          />
        );
      case 'auth':
        return (
          <AuthScreen
            onLogin={handleLogin}
            onSkip={() => {
              setIsGuestMode(true);
              setCurrentScreen('home');
            }}
            currentLang={language}
            onLangChange={changeLanguage}
          />
        );
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
      /* case 'globe':
        return <GlobeView userLocation={user?.location ? { lat: user.location.lat, lng: user.location.lng } : null} plots={[]} onClose={() => setCurrentScreen('home')} />; */
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
      case 'social':
        return <SocialScreen navigateTo={navigateTo} />;
      // case 'contracts':
      //   return <ContractsScreen navigateTo={navigateTo} t={t} />;

      default:
        return (
          <AuthScreen
            onLogin={handleLogin}
            onSkip={() => {
              setIsGuestMode(true);
              setCurrentScreen('home');
            }}
            currentLang={language}
            onLangChange={changeLanguage}
          />
        );
    }
  };

  const showNav = !['landing', 'auth', 'profile', 'market-detail', 'live-audio', 'carbon-vault', 'scheme-setu'].includes(currentScreen);

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-[#F8FAF8] shadow-xl relative overflow-hidden text-gray-900" style={{ transform: 'translate(0)' }}>
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
