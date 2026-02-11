
import React, { useState } from 'react';
import { Sprout, Globe, ArrowRight, Phone, KeyRound, ChevronLeft } from 'lucide-react';
import { Language } from '../types';
import { languages, translations } from '../translations';
import { authService } from '../src/services/api';

interface AuthScreenProps {
  onLogin: () => void;
  onSkip: () => void;
  currentLang: Language;
  onLangChange: (lang: Language) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin, onSkip, currentLang, onLangChange }) => {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const t = translations[currentLang];

  const handleSendOtp = async () => {
    try {
      setLoading(true);
      const response = await authService.sendOtp(phone);
      alert("OTP Sent! Check your backend terminal (or console) for the code. It is usually 4 digits.");
      setStep('otp');
    } catch (error) {
      alert('Failed to send OTP. Is the backend running at port 8000?');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    try {
      setLoading(true);
      await authService.verifyOtp(phone, otp);
      onLogin();
    } catch (error) {
      alert('Invalid OTP');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col relative overflow-hidden bg-gradient-to-br from-green-600 via-emerald-600 to-teal-800 text-white">

      {/* Background Decor */}
      <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-yellow-300 rounded-full mix-blend-overlay filter blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-80 h-80 bg-green-300 rounded-full mix-blend-overlay filter blur-3xl opacity-20 animate-pulse delay-1000"></div>

      {/* Header */}
      <div className="flex justify-between items-center p-6 z-10">
        <button
          onClick={onSkip}
          className="px-4 py-2 text-sm font-bold text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all backdrop-blur-sm"
        >
          Skip
        </button>
        <button
          onClick={() => setShowLangPicker(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full text-xs font-bold text-white backdrop-blur-md transition-all"
        >
          <Globe size={14} />
          {languages.find(l => l.code === currentLang)?.native}
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 z-10">

        {/* Logo Section */}
        <div className="mb-10 text-center animate-in slide-in-from-top duration-700 fade-in">
          <div className="inline-flex p-5 rounded-full bg-white/20 backdrop-blur-xl border border-white/30 shadow-2xl mb-6">
            <Sprout size={48} className="text-white drop-shadow-lg" strokeWidth={2} />
          </div>
          <h1 className="text-3xl font-black tracking-tight drop-shadow-md">{t.welcome}</h1>
          <p className="text-white/80 mt-2 font-medium">{t.slogan}</p>
        </div>

        {/* Input Card */}
        <div className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom duration-700 fade-in">
          <label className="block text-xs font-bold text-white/70 uppercase tracking-widest mb-3 ml-1">
            {step === 'phone' ? t.mobile_number : 'Verification Code'}
          </label>

          <div className="relative mb-6">
            {step === 'phone' ? (
              <>
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <Phone size={20} className="text-white/60" />
                  <span className="text-white font-bold pr-2 border-r border-white/20">+91</span>
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="00000 00000"
                  className="w-full pl-24 pr-4 py-4 bg-black/20 border border-white/10 rounded-2xl focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all outline-none text-lg font-bold tracking-wider text-white placeholder:text-white/30"
                />
              </>
            ) : (
              <>
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                  <KeyRound size={20} className="text-white/60" />
                </div>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="• • • •"
                  className="w-full pl-12 pr-4 py-4 bg-black/20 border border-white/10 rounded-2xl focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all outline-none text-2xl font-bold tracking-[1em] text-center text-white placeholder:text-white/30"
                />
              </>
            )}
          </div>

          <button
            onClick={step === 'phone' ? handleSendOtp : handleVerifyOtp}
            disabled={loading || (step === 'phone' ? phone.length < 10 : otp.length < 4)}
            className="w-full py-4 rounded-xl font-bold text-green-900 bg-yellow-400 hover:bg-yellow-300 shadow-lg shadow-yellow-400/20 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-green-900 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                {step === 'phone' ? 'Get OTP' : 'Verify & Login'}
                <ArrowRight size={18} />
              </>
            )}
          </button>

          {step === 'otp' && (
            <button
              onClick={() => setStep('phone')}
              className="w-full mt-4 text-xs font-bold text-white/60 hover:text-white flex items-center justify-center gap-1 transition-colors"
            >
              <ChevronLeft size={14} />
              Change Phone Number
            </button>
          )}
        </div>

      </div>

      <div className="p-6 text-center z-10">
        <p className="text-[10px] text-white/40 font-medium">
          By continuing, you agree to Krishi-Drishti's Terms of Service and Privacy Policy.
        </p>
      </div>

      {/* Language Picker Modal */}
      {showLangPicker && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-white w-full rounded-[2rem] p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-gray-900">{t.select_language}</h3>
              <button onClick={() => setShowLangPicker(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
                <ChevronLeft size={20} className="text-gray-600" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    onLangChange(lang.code as Language);
                    setShowLangPicker(false);
                  }}
                  className={`py - 4 px - 4 rounded - 2xl text - left border transition - all ${currentLang === lang.code
                      ? 'bg-green-600 border-green-600 text-white shadow-lg shadow-green-200 ring-2 ring-green-100'
                      : 'bg-gray-50 border-gray-100 text-gray-700 hover:bg-white hover:border-green-200 hover:shadow-md'
                    } `}
                >
                  <p className="text-xs opacity-70 mb-1 font-bold uppercase tracking-wider">{lang.label}</p>
                  <p className="text-lg font-bold">{lang.native}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthScreen;
