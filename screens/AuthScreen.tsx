
import React, { useState, useRef } from 'react';
import { Sprout, Globe, ArrowRight, Phone, KeyRound, ChevronLeft, Shield, CheckCircle2, Loader2, Star } from 'lucide-react';
import { Language } from '../types';
import { languages, translations } from '../translations';
import { authService } from '../src/services/api';
import { motion, AnimatePresence } from 'framer-motion';

interface AuthScreenProps {
  onLogin: () => void;
  onSkip: () => void;
  currentLang: Language;
  onLangChange: (lang: Language) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin, onSkip, currentLang, onLangChange }) => {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([null, null, null, null]);
  const t = translations[currentLang];

  const handleSendOtp = async () => {
    if (phone.length < 10) return;
    try {
      setLoading(true);
      await authService.sendOtp(phone);
      alert('OTP Sent! Check your backend terminal for the code.');
      setStep('otp');
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch {
      alert('Failed to send OTP. Is the backend running at port 8000?');
    } finally { setLoading(false); }
  };

  const handleOtpChange = (val: string, idx: number) => {
    if (val.length > 1) val = val[val.length - 1];
    const next = [...otp];
    next[idx] = val;
    setOtp(next);
    if (val && idx < 3) otpRefs.current[idx + 1]?.focus();
    if (!val && idx > 0) otpRefs.current[idx - 1]?.focus();
  };

  const handleVerifyOtp = async () => {
    const code = otp.join('');
    if (code.length < 4) return;
    try {
      setLoading(true);
      await authService.verifyOtp(phone, code);
      onLogin();
    } catch { alert('Invalid OTP. Try again.'); }
    finally { setLoading(false); }
  };

  const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const rise = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } } };

  return (
    <div className="h-full flex flex-col relative overflow-hidden"
      style={{ background: 'linear-gradient(165deg, #020B06 0%, #031208 40%, #041A0E 100%)' }}>

      {/* ANIMATED BG */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.35, 0.2] }}
          transition={{ duration: 10, repeat: Infinity }}
          className="absolute -top-20 -left-20 w-80 h-80 rounded-full"
          style={{ background: 'radial-gradient(circle, #00FF87, transparent 70%)' }} />
        <motion.div animate={{ scale: [1.2, 1, 1.2], opacity: [0.15, 0.25, 0.15] }}
          transition={{ duration: 12, repeat: Infinity, delay: 4 }}
          className="absolute -bottom-20 -right-20 w-72 h-72 rounded-full"
          style={{ background: 'radial-gradient(circle, #FFB800, transparent 70%)' }} />
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
      </div>

      {/* HEADER */}
      <div className="relative z-10 flex justify-between items-center px-5 pt-12 pb-4">
        <button onClick={onSkip}
          className="flex items-center gap-1 text-sm font-bold text-white/50 hover:text-white transition-colors">
          Skip
          <ChevronLeft size={14} className="rotate-180" />
        </button>

        <div className="flex items-center gap-2">
          <div className="relative">
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowLangPicker(!showLangPicker)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/15 text-xs font-bold text-white/70"
              style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)' }}>
              <Globe size={12} />
              {languages.find(l => l.code === currentLang)?.native}
            </motion.button>
            <AnimatePresence>
              {showLangPicker && (
                <>
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50" onClick={() => setShowLangPicker(false)} />
                  <motion.div initial={{ opacity: 0, scale: 0.9, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                    className="absolute top-full mt-2 right-0 rounded-2xl shadow-2xl border border-white/10 p-1.5 z-[60] w-44 max-h-64 overflow-y-auto no-scrollbar"
                    style={{ background: 'rgba(5,20,12,0.97)', backdropFilter: 'blur(20px)' }}>
                    {languages.map((lang: any) => (
                      <button key={lang.code}
                        onClick={() => { onLangChange(lang.code as Language); setShowLangPicker(false); }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex justify-between items-center mb-0.5 transition-all ${currentLang === lang.code ? 'text-emerald-400' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
                        style={currentLang === lang.code ? { background: 'rgba(0,255,135,0.08)' } : {}}>
                        <div><span className="block">{lang.label}</span><span className="text-[9px] opacity-50">{lang.native}</span></div>
                        {currentLang === lang.code && <span className="text-emerald-400">✓</span>}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* MAIN */}
      <motion.div variants={stagger} initial="hidden" animate="show"
        className="relative z-10 flex-1 flex flex-col items-center justify-center px-6">

        {/* Logo */}
        <motion.div variants={rise} className="mb-6 text-center">
          <div className="relative inline-block mb-4">
            <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 3, repeat: Infinity }}
              className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto"
              style={{
                background: 'linear-gradient(135deg, #00FF87 0%, #00BB78 50%, #059669 100%)',
                boxShadow: '0 0 40px rgba(0,255,135,0.4), 0 12px 30px rgba(0,0,0,0.4)',
              }}>
              <span className="text-4xl">🌱</span>
            </motion.div>
            {/* Orbit dot */}
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{ border: '2px dashed rgba(0,255,135,0.2)' }}>
              <div className="absolute -top-1 left-1/2 w-2.5 h-2.5 -translate-x-1/2 rounded-full"
                style={{ background: '#00FF87', boxShadow: '0 0 8px 2px rgba(0,255,135,0.6)' }} />
            </motion.div>
          </div>
          <h1 className="text-2xl font-black text-white mb-1">Krishi Drishti</h1>
          <p className="text-xs text-white/40 font-semibold tracking-wide">India's Smart Farming Platform</p>
        </motion.div>

        {/* FORM CARD */}
        <motion.div variants={rise}
          className="w-full max-w-sm rounded-3xl p-6"
          style={{
            background: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          }}>
          <AnimatePresence mode="wait">
            {step === 'phone' ? (
              <motion.div key="phone" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #00FF87, #00BB78)', boxShadow: '0 4px 12px rgba(0,255,135,0.3)' }}>
                    <Phone size={15} className="text-gray-900 font-black" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-white">{t.mobile_number || 'Mobile Number'}</h2>
                    <p className="text-[10px] text-white/40">We'll send you a 4-digit OTP</p>
                  </div>
                </div>

                {/* Phone input */}
                <div className="relative mb-4">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <span className="text-base">🇮🇳</span>
                    <span className="text-sm font-bold text-white/60">+91</span>
                    <div className="w-px h-5 bg-white/15" />
                  </div>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="9876543210"
                    className="w-full pl-20 pr-4 py-3.5 rounded-2xl text-sm font-bold text-white outline-none transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.07)',
                      border: phone.length === 10 ? '1.5px solid rgba(0,255,135,0.5)' : '1.5px solid rgba(255,255,255,0.1)',
                    }}
                    onKeyDown={e => e.key === 'Enter' && phone.length === 10 && handleSendOtp()}
                  />
                  {phone.length === 10 && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <CheckCircle2 size={16} className="text-emerald-400" />
                    </div>
                  )}
                </div>

                {/* Send OTP button */}
                <motion.button whileTap={{ scale: 0.97 }}
                  onClick={handleSendOtp}
                  disabled={phone.length < 10 || loading}
                  className="relative w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 font-black text-sm overflow-hidden transition-all"
                  style={{
                    background: phone.length === 10 ? 'linear-gradient(135deg, #00FF87, #00BB78)' : 'rgba(255,255,255,0.08)',
                    color: phone.length === 10 ? '#001A0E' : 'rgba(255,255,255,0.3)',
                    boxShadow: phone.length === 10 ? '0 8px 24px rgba(0,255,135,0.3)' : 'none',
                  }}>
                  {loading ? <Loader2 size={18} className="animate-spin" /> : (
                    <><span>Send OTP</span><ArrowRight size={16} /></>
                  )}
                </motion.button>
              </motion.div>
            ) : (
              <motion.div key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <button onClick={() => setStep('phone')} className="flex items-center gap-1 text-xs text-white/40 mb-4 hover:text-white transition-colors">
                  <ChevronLeft size={14} /> Back
                </button>

                <div className="mb-5">
                  <h2 className="text-sm font-black text-white mb-1">Verify OTP</h2>
                  <p className="text-[10px] text-white/40">Sent to <span className="text-emerald-400 font-bold">+91 {phone}</span></p>
                </div>

                {/* 4 OTP boxes */}
                <div className="flex justify-between gap-3 mb-5">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => { otpRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleOtpChange(e.target.value.replace(/\D/g, ''), i)}
                      className="w-full aspect-square text-center text-xl font-black text-white rounded-2xl outline-none transition-all"
                      style={{
                        background: digit ? 'rgba(0,255,135,0.15)' : 'rgba(255,255,255,0.07)',
                        border: digit ? '1.5px solid rgba(0,255,135,0.5)' : '1.5px solid rgba(255,255,255,0.1)',
                      }}
                    />
                  ))}
                </div>

                <motion.button whileTap={{ scale: 0.97 }}
                  onClick={handleVerifyOtp}
                  disabled={otp.join('').length < 4 || loading}
                  className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 font-black text-sm"
                  style={{
                    background: otp.join('').length === 4 ? 'linear-gradient(135deg, #00FF87, #00BB78)' : 'rgba(255,255,255,0.08)',
                    color: otp.join('').length === 4 ? '#001A0E' : 'rgba(255,255,255,0.3)',
                    boxShadow: otp.join('').length === 4 ? '0 8px 24px rgba(0,255,135,0.3)' : 'none',
                  }}>
                  {loading ? <Loader2 size={18} className="animate-spin" /> : (
                    <><CheckCircle2 size={16} /><span>Verify & Login</span></>
                  )}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Trust row */}
        <motion.div variants={rise} className="flex items-center justify-center gap-4 mt-5">
          {[
            { icon: <Shield size={11} />, label: 'Encrypted', color: '#34D399' },
            { icon: <Star size={11} />, label: '4.9★ Rated', color: '#FBBF24' },
            { icon: <CheckCircle2 size={11} />, label: 'Govt Verified', color: '#818CF8' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-1" style={{ color: item.color }}>
              {item.icon}
              <span className="text-[9px] font-bold text-white/40">{item.label}</span>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* Bottom hint */}
      <div className="relative z-10 pb-8 text-center px-5">
        <p className="text-[10px] text-white/25 font-medium leading-relaxed">
          By continuing, you agree to our Terms of Service & Privacy Policy
        </p>
      </div>
    </div>
  );
};

export default AuthScreen;
