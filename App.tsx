import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Screen, UserProfile, Language, VisionMode } from './types';
import {
  MessageCircle,
  Sparkles,
  Mic,
  AlertTriangle,
  Loader2,
  Leaf,
  Wifi,
  WifiOff,
  RefreshCw
} from 'lucide-react';
import AuthScreen from './screens/AuthScreen';
import ProfileScreen from './screens/ProfileScreen';
import DashboardScreen from './screens/DashboardScreen';
import ChatScreen from './screens/ChatScreen';
import VisionScreen from './screens/VisionScreen';
import VisionResultScreen from './screens/VisionResultScreen';
import FarmMapScreen from './screens/FarmMapScreen';
import MarketScreen from './screens/MarketScreen';
import MarketDetailScreen from './screens/MarketDetailScreen';
import InsuranceScreen from './screens/InsuranceScreen';
import ForecastScreen from './screens/ForecastScreen';
import LiveAudioScreen from './screens/LiveAudioScreen';
import CarbonVaultScreen from './screens/CarbonVaultScreen';
import SchemeSetuScreen from './screens/SchemeSetuScreen';
import CropStressScreen from './screens/CropStressScreen';
import LandMarkingScreen from './screens/LandMarkingScreen';
import VoiceAssistantModal from './components/VoiceAssistantModal';
import AcousticScannerScreen from './screens/AcousticScannerScreen';
import SoilCarbonModelScreen from './screens/SoilCarbonModelScreen';
import SplashScreen from './screens/SplashScreen';
import TraceabilityScreen from './screens/TraceabilityScreen';
import TraceabilityVerifyScreen from './screens/TraceabilityVerifyScreen';
import BottomNav from './components/BottomNav';
import { userService, weatherService, getUserLocation } from './src/services/api';
import { translations } from './translations';
import LandingScreen from './screens/LandingScreen';
import AgritechDashboardNew from './screens/AgritechDashboardNew';
import FieldMonitorScreen from './screens/FieldMonitorScreen';
import CorporateDashboardScreen from './screens/CorporateDashboardScreen';
import CropCycleScreen from './screens/CropCycleScreen';
import FarmerMarketplaceScreen from './screens/FarmerMarketplaceScreen';
import SmartIrrigationScreen from './screens/SmartIrrigationScreen';
import DigitalTwinScreen from './screens/DigitalTwinScreen';
import { LanguageProvider } from './src/context/LanguageContext';

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <ErrorBoundary>
        <AppContent />
      </ErrorBoundary>
    </LanguageProvider>
  );
};

interface ErrorBoundaryState { hasError: boolean; error: Error | null; }
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };
  declare props: { children: React.ReactNode };

  constructor(props: { children: React.ReactNode }) {
    super(props);
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-red-100 p-6 flex items-center justify-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 border border-red-100"
          >
            <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-lg shadow-red-200">
              <AlertTriangle className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-black text-gray-900 mb-2 text-center">Oops! Something Broke</h1>
            <p className="text-sm text-gray-500 text-center mb-4">Don't worry, we can fix this</p>
            <pre className="text-xs font-mono bg-gray-50 p-4 rounded-2xl border border-gray-200 whitespace-pre-wrap max-h-40 overflow-auto text-red-700">
              {this.state.error?.toString()}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 w-full px-4 py-4 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-2xl font-bold shadow-lg shadow-red-200 active:scale-95 transition-transform flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              Reload App
            </button>
          </motion.div>
        </div>
      );
    }
    return this.props.children;
  }
}

const AppContent: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<Screen>('landing');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [visionMode, setVisionMode] = useState<VisionMode>('diagnosis');
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [language, setLanguage] = useState<Language>('en');
  const [loading, setLoading] = useState(true);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const [weather, setWeather] = useState<any>(null);
  const [locationName, setLocationName] = useState<string>("Locating...");
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const locationFetched = useRef(false);
  const [fabMenuOpen, setFabMenuOpen] = useState(false);
  const [traceVerifyId, setTraceVerifyId] = useState<string | undefined>(undefined);
  const [screenData, setScreenData] = useState<any>(null);

  // Admin fast-path handled above at state init time

  // ── Weather re-fetch whenever accurate GPS coords arrive ──────────────────
  useEffect(() => {
    if (!userCoords) return;
    console.log('[App] Re-fetching weather for coords:', userCoords.lat, userCoords.lng);
    weatherService.getWeather(userCoords.lat, userCoords.lng)
      .then(wd => setWeather(wd))
      .catch(e => console.error('[App] Weather refresh failed:', e?.message));
    // Also auto-refresh every 5 minutes
    const iv = setInterval(() => {
      weatherService.getWeather(userCoords.lat, userCoords.lng)
        .then(wd => setWeather(wd)).catch(() => {});
    }, 5 * 60 * 1000);
    return () => clearInterval(iv);
  }, [userCoords]);

  // ── QR deep-link: ?verify=KD-HTK-YYYY-NNNNN ──
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verifyId = params.get('verify');
    if (verifyId) {
      setTraceVerifyId(verifyId);
      setCurrentScreen('trace-verify');
    }
  }, []);

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
    // If we came via the admin redirect, skip all auth/init logic
    if (currentScreen === 'admin') return;

    const init = async () => {
      console.log("[App] init called");
      log("[App] Init started (No Delay)");

      if (!userService) {
        log("[App] CRITICAL: userService is undefined!");
      } else {
        log("[App] userService is present");
      }

      const savedLang = localStorage.getItem('ks_lang') as Language;
      if (savedLang) setLanguage(savedLang);

      const token = localStorage.getItem('ks_token');
      log(`[App] Token found: ${!!token}`);

      try {
        const location = await getUserLocation();

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), 60000)
        );
        timeoutPromise.catch(() => { });

      if (token) {
          log("[App] Fetching profile...");
          try {
            const profile = await Promise.race([
              userService.getProfile(),
              new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 10000))
            ]) as UserProfile;

            log(`[App] Profile fetched: ${profile?.name}`);

            // Normalize crops field — backend returns comma-string, we need array
            if (profile.crops && typeof profile.crops === 'string') {
              (profile as any).crops = (profile.crops as string).split(',').filter(Boolean);
            }

            if (location) profile.location = location;

            // Cache the profile locally so app works even if backend is slow
            localStorage.setItem('ks_profile_cache', JSON.stringify(profile));

            setUser(profile);
            setCurrentScreen(profile.name ? 'home' : 'profile');
            if (profile.language) setLanguage(profile.language);
            log("[App] Profile loaded, going to: " + (profile.name ? 'home' : 'profile'));
          } catch (profileErr: any) {
            log(`[App] Profile fetch failed: ${profileErr.message}`);

            // Try restoring from local cache before giving up
            const cachedRaw = localStorage.getItem('ks_profile_cache');
            if (cachedRaw) {
              try {
                const cached = JSON.parse(cachedRaw);
                if (location) cached.location = location;
                setUser(cached);
                setCurrentScreen(cached.name ? 'home' : 'profile');
                log("[App] Restored from local cache");
              } catch {
                // Cache corrupt — force re-login only on auth errors, not network errors
                if (profileErr.response?.status === 401) {
                  localStorage.removeItem('ks_token');
                  localStorage.removeItem('ks_profile_cache');
                  setCurrentScreen('auth');
                } else {
                  setCurrentScreen('profile'); // let them retry saving
                }
              }
            } else {
              // Only clear token on explicit 401 Unauthorized
              if (profileErr.response?.status === 401) {
                localStorage.removeItem('ks_token');
                setCurrentScreen('auth');
              } else {
                setCurrentScreen('profile');
              }
            }
          }
        } else {
          log("[App] No token, go to Auth");
          setCurrentScreen('auth');
        }

        console.log("[App] Fetching weather/location...");
        const lat = location?.lat || 21.1458;
        const lng = location?.lng || 79.0882;

        // Save coords so the weather re-fetch effect picks them up
        setUserCoords({ lat, lng });

        // ── Reverse geocode: try backend first, then direct BigDataCloud as client-side fallback ──
        const resolveLocationName = async (lat: number, lng: number) => {
          // Try backend first
          try {
            const locData = await weatherService.reverseGeocode(lat, lng);
            if (locData && (locData.city || locData.district)) {
              setLocationName(`${locData.city || ''}${locData.city && locData.district ? ', ' : ''}${locData.district || ''}`);
              return;
            }
          } catch { /* fall through to client-side fallback */ }

          // Backend failed (500) — call BigDataCloud directly from browser (free, no key, no CORS issues)
          try {
            const r = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`);
            const d = await r.json();
            const city = d.locality || d.city || d.principalSubdivision || null;
            const district = d.principalSubdivision || '';
            if (city) {
              setLocationName(`${city}${district && district !== city ? ', ' + district : ''}`);
              return;
            }
          } catch { /* ignore */ }

          // Final fallback: show rounded coordinates
          setLocationName(`${lat.toFixed(2)}°N, ${lng.toFixed(2)}°E`);
        };

        if (!locationFetched.current) {
          locationFetched.current = true;
          resolveLocationName(lat, lng);
        }

        // Weather is now fetched reactively in the useEffect below
        // (kept as one-shot fallback if GPS arrives before the effect)
        weatherService.getWeather(lat, lng)
          .then((wd) => { setWeather(wd); log("[App] Initial weather loaded"); })
          .catch((e) => console.error("[App] Weather fetch failed:", e?.message || e));


      } catch (e: any) {
        log(`[App] Outer init error: ${e.message}`);
        console.error("[App] Init error:", e);
        // Only show connection error UI for true network failures, never wipe token
        if (e.message === "Timeout" || e.message === "Network Error") {
          setConnectionError(true);
          setLoading(false);
          return;
        }
        // For any other unexpected error, go to landing but keep the token
        setCurrentScreen('landing');
      }
      setLoading(false);
    };
    init();
  }, [showSplash]);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error("Global Error (Logged):", event.error);
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled Rejection (Logged):", event.reason);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  const changeLanguage = async (lang: Language) => {
    console.log("[App] Changing language to:", lang);
    setLanguage(lang);
    localStorage.setItem('ks_lang', lang);
    if (user || localStorage.getItem('ks_token')) {
      try {
        await userService.updateProfile({ language: lang });
        console.log("[App] Synced language to backend profile.");
      } catch (e) {
        console.error("[App] Failed to sync language to backend.", e);
      }
    }
  };

  const navigateTo = (screen: Screen, data?: any) => {
    const protectedScreens: Screen[] = ['map', 'carbon-vault', 'crop-stress', 'landmark', 'soil-carbon', 'traceability', 'field-monitor'];
    
    // Check BOTH localStorage token AND in-memory user state.
    // On Android/Capacitor WebView, localStorage can sometimes appear empty
    // on app resume even when the user is authenticated. Checking user state
    // as a fallback prevents false "please log in" blocks.
    const hasToken = !!localStorage.getItem('ks_token') || !!user;

    if (protectedScreens.includes(screen) && !hasToken) {
      setIsGuestMode(false);
      alert('Please log in to use farm tools and save your land.');
      setCurrentScreen('auth');
      return;
    }

    if (screen === 'vision-result' && data?.image) {
      setCapturedImage(data.image);
      if (data.mode) setVisionMode(data.mode);
    }
    if (screen === 'market-detail' && data?.listing) {
      setSelectedListing(data.listing);
    }
    if (screen === 'trace-verify' && data?.tokenId) {
      setTraceVerifyId(data.tokenId);
    }
    if (screen === 'field-monitor' && data?.plotId) {
      setScreenData({ plotId: data.plotId });
    }
    setCurrentScreen(screen);
    setFabMenuOpen(false);
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
    // Normalize crops so the cache always stores an array
    if (completeProfile.crops && typeof completeProfile.crops === 'string') {
      (completeProfile as any).crops = (completeProfile.crops as string).split(',').filter(Boolean);
    }
    // Write to local cache so next reload skips re-fetch
    localStorage.setItem('ks_profile_cache', JSON.stringify(completeProfile));
    setUser(completeProfile);
    navigateTo('home');
  };

  const handleLogout = () => {
    localStorage.removeItem('ks_token');
    localStorage.removeItem('ks_lang');
    localStorage.removeItem('ks_profile_cache');
    setUser(null);
    setIsGuestMode(false);
    setCurrentScreen('auth');
  };

  const t = translations[language];

  // ============ SPLASH SCREEN ============
  if (showSplash) {
    return (
      <div className="h-full w-full max-w-md mx-auto bg-white shadow-2xl overflow-hidden relative font-sans">
        <SplashScreen onFinish={() => setShowSplash(false)} />
      </div>
    );
  }

  // ============ ENHANCED LOADING SCREEN ============
  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 p-10 relative overflow-hidden">
        {/* Animated background blobs */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-10 left-10 w-72 h-72 bg-green-300/30 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [90, 0, 90],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-10 right-10 w-80 h-80 bg-emerald-400/30 rounded-full blur-3xl"
        />

        {/* Main loader content */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="relative z-10 flex flex-col items-center"
        >
          {/* Rotating outer ring with leaf */}
          <div className="relative w-32 h-32 mb-8">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full border-4 border-transparent border-t-green-600 border-r-emerald-500"
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="absolute inset-2 rounded-full border-4 border-transparent border-b-teal-500 border-l-green-400"
            />
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-xl shadow-green-300">
                <Leaf className="w-8 h-8 text-white" />
              </div>
            </motion.div>
          </div>

          <motion.h2
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-black bg-gradient-to-r from-green-700 to-emerald-600 bg-clip-text text-transparent mb-2"
          >
            Krishi Drishti
          </motion.h2>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex items-center gap-2 text-green-700"
          >
            <Sparkles className="w-4 h-4" />
            <p className="text-sm font-semibold">Initializing Smart Farm AI...</p>
          </motion.div>

          {/* Animated dots */}
          <div className="flex gap-2 mt-6">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{
                  y: [0, -10, 0],
                  backgroundColor: ['#10b981', '#059669', '#10b981'],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
                className="w-2 h-2 bg-green-500 rounded-full"
              />
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  // ============ ENHANCED CONNECTION ERROR ============
  if (connectionError) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-br from-red-50 via-orange-50 to-amber-50 p-6 text-center relative overflow-hidden">
        {/* Background effects */}
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 4, repeat: Infinity }}
          className="absolute top-20 left-10 w-64 h-64 bg-red-200 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ scale: [1.3, 1, 1.3], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 5, repeat: Infinity }}
          className="absolute bottom-20 right-10 w-64 h-64 bg-orange-200 rounded-full blur-3xl"
        />

        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 150 }}
          className="relative z-10"
        >
          <motion.div
            animate={{
              rotate: [0, -10, 10, -10, 0],
            }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="w-24 h-24 bg-gradient-to-br from-red-500 to-orange-500 rounded-3xl flex items-center justify-center mb-6 mx-auto shadow-2xl shadow-red-200 relative"
          >
            <WifiOff className="w-12 h-12 text-white" />
            <motion.div
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 rounded-3xl border-4 border-red-400"
            />
          </motion.div>

          <motion.h2
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-2xl font-black bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent mb-2"
          >
            Connection Timeout
          </motion.h2>

          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-sm text-gray-600 mb-8 font-medium max-w-xs"
          >
            Server is taking too long to respond. Please check your internet connection and try again.
          </motion.p>

          <motion.button
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.05 }}
            onClick={() => window.location.reload()}
            className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-wider shadow-xl shadow-green-300 flex items-center gap-3 mx-auto"
          >
            <RefreshCw className="w-5 h-5" />
            Retry Connection
          </motion.button>
        </motion.div>
      </div>
    );
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case 'landing':
        return (
          <LandingScreen
            onLogin={() => {
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
            onAdminLogin={() => setCurrentScreen('admin')}
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
        return <ProfileScreen onComplete={handleProfileComplete} t={t} navigateTo={navigateTo} onLogout={handleLogout} />;
      case 'home':
        return <DashboardScreen
          navigateTo={navigateTo}
          user={user}
          t={t}
          onLangChange={changeLanguage}
          currentLang={language}
          weather={weather}
          locationName={locationName}
        />;
      case 'admin':
        return <AgritechDashboardNew t={t} />;
      case 'chat':
        return <ChatScreen navigateTo={navigateTo} language={language} t={t} onOpenVoiceAssistant={() => setIsVoiceActive(true)} />;
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
      case 'insurance':
        return <InsuranceScreen navigateTo={navigateTo} t={t} />;
      case 'forecast':
        return <ForecastScreen navigateTo={navigateTo} t={t} weather={weather} user={user} locationName={locationName} />;
      case 'live-audio':
        return <LiveAudioScreen navigateTo={navigateTo} language={language} t={t} />;
      case 'carbon-vault':
        return <CarbonVaultScreen navigateTo={navigateTo} t={t} />;
      case 'scheme-setu':
        return <SchemeSetuScreen navigateTo={navigateTo} user={user} t={t} />;
      case 'crop-stress':
        return <CropStressScreen navigateTo={navigateTo} />;
      case 'landmark':
        return <LandMarkingScreen navigation={{ goBack: () => navigateTo('home'), goToAuth: () => navigateTo('auth') }} />;
      case 'acoustic-scanner':
        return <AcousticScannerScreen navigation={{ goBack: () => navigateTo('home') }} />;
      case 'soil-carbon':
        return <SoilCarbonModelScreen navigateTo={navigateTo} />;
      case 'traceability':
        return <TraceabilityScreen navigateTo={navigateTo} />;
      case 'trace-verify':
        return <TraceabilityVerifyScreen navigateTo={navigateTo} tokenId={traceVerifyId} />;
      case 'field-monitor':
        return <FieldMonitorScreen navigateTo={navigateTo} screenData={screenData} t={t} />;
      case 'corporate-dashboard':
        return <CorporateDashboardScreen navigateTo={navigateTo} t={t} />;
      case 'crop-cycle':
        return <CropCycleScreen navigateTo={navigateTo} screenData={screenData} t={t} />;
      case 'marketplace':
        return <FarmerMarketplaceScreen navigateTo={navigateTo} t={t} />;
      case 'smart-irrigation':
        return <SmartIrrigationScreen navigateTo={navigateTo} />;
      case 'digital-twin':
        return <DigitalTwinScreen navigateTo={navigateTo} />;
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

  const showNav = !['landing', 'auth', 'profile', 'market-detail', 'live-audio', 'carbon-vault', 'scheme-setu', 'landmark', 'chat', 'vision', 'vision-result', 'acoustic-scanner', 'traceability', 'trace-verify', 'field-monitor', 'corporate-dashboard', 'crop-cycle', 'smart-irrigation', 'digital-twin'].includes(currentScreen);

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto shadow-2xl relative overflow-hidden text-gray-900 bg-white" style={{ transform: 'translate(0)' }}>
      <main className={`flex-1 overflow-y-auto mobile-container relative ${showNav ? 'pb-20' : 'pb-0'}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentScreen}
            initial={{ opacity: 0, x: 30, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -30, scale: 0.98 }}
            transition={{
              duration: 0.3,
              ease: [0.25, 0.1, 0.25, 1],
            }}
            className="h-full"
          >
            {renderScreen()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ============ ENHANCED FLOATING ACTION BUTTON WITH EXPANDABLE MENU ============ */}
      {showNav && (
        <>
          {/* Backdrop when FAB menu is open */}
          <AnimatePresence>
            {fabMenuOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setFabMenuOpen(false)}
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90]"
              />
            )}
          </AnimatePresence>

          {/* Voice Assistant Sub-button */}
          <AnimatePresence>
            {fabMenuOpen && (
              <motion.button
                initial={{ scale: 0, y: 0, opacity: 0 }}
                animate={{ scale: 1, y: -80, opacity: 1 }}
                exit={{ scale: 0, y: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                onClick={() => {
                  setIsVoiceActive(true);
                  setFabMenuOpen(false);
                }}
                className="fixed bottom-24 right-6 w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-full shadow-2xl shadow-purple-500/50 flex items-center justify-center z-[100] border-2 border-white/30"
              >
                <Mic size={22} />
                <motion.span
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="absolute right-16 bg-gray-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap shadow-lg"
                >
                  Voice Assistant
                </motion.span>
              </motion.button>
            )}
          </AnimatePresence>

          {/* Chat Sub-button */}
          <AnimatePresence>
            {fabMenuOpen && (
              <motion.button
                initial={{ scale: 0, y: 0, opacity: 0 }}
                animate={{ scale: 1, y: -160, opacity: 1 }}
                exit={{ scale: 0, y: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.05 }}
                onClick={() => {
                  setCurrentScreen('chat');
                  setFabMenuOpen(false);
                }}
                className="fixed bottom-24 right-6 w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 text-white rounded-full shadow-2xl shadow-blue-500/50 flex items-center justify-center z-[100] border-2 border-white/30"
              >
                <MessageCircle size={22} />
                <motion.span
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 }}
                  className="absolute right-16 bg-gray-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap shadow-lg"
                >
                  AI Chat
                </motion.span>
              </motion.button>
            )}
          </AnimatePresence>

          {/* Main FAB Button with pulse effect */}
          <motion.button
            onClick={() => setFabMenuOpen(!fabMenuOpen)}
            whileTap={{ scale: 0.9 }}
            className="fixed bottom-24 right-6 w-16 h-16 rounded-full shadow-2xl flex items-center justify-center z-[101] overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
              boxShadow: '0 10px 40px rgba(16, 185, 129, 0.5)',
            }}
          >
            {/* Pulse rings */}
            {!fabMenuOpen && (
              <>
                <motion.div
                  animate={{
                    scale: [1, 1.8],
                    opacity: [0.5, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeOut",
                  }}
                  className="absolute inset-0 rounded-full bg-green-400"
                />
                <motion.div
                  animate={{
                    scale: [1, 1.8],
                    opacity: [0.5, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeOut",
                    delay: 1,
                  }}
                  className="absolute inset-0 rounded-full bg-emerald-400"
                />
              </>
            )}

            {/* Icon with rotation animation */}
            <motion.div
              animate={{ rotate: fabMenuOpen ? 135 : 0 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="relative z-10"
            >
              <Sparkles size={28} className="text-white drop-shadow-lg" />
            </motion.div>

            {/* Shimmer effect */}
            <motion.div
              animate={{
                x: ['-100%', '200%'],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "linear",
              }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12"
            />
          </motion.button>
        </>
      )}

      {/* Global Voice Assistant Modal */}
      <VoiceAssistantModal
        isOpen={isVoiceActive}
        onClose={() => setIsVoiceActive(false)}
        language={language}
        onSwitchToText={() => {
          setIsVoiceActive(false);
          setCurrentScreen('chat');
        }}
      />

      {showNav && (
        <BottomNav currentScreen={currentScreen} onNavigate={navigateTo} />
      )}
    </div>
  );
};

export default App;