import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { aiService } from '../src/services/api';
import { COLORS } from '../constants';
import { Screen, ChatMessage, Language } from '../types';
import {
  Send,
  Mic,
  ArrowLeft,
  Bot,
  Loader2,
  Globe,
  Search,
  Landmark,
  X,
  ExternalLink,
  BrainCircuit,
  Sparkles,
  Zap,
  HeartHandshake,
  Phone,
  ShieldAlert,
  FileHeart,
  Wheat,
  TrendingUp,
  CloudRain,
  Leaf,
  Volume2
} from 'lucide-react';
import { languages } from '../translations';

interface ChatScreenProps {
  navigateTo: (screen: Screen) => void;
  language: Language;
  t: any;
  onOpenVoiceAssistant: () => void;
}

const LANG_MAP: Record<string, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  mr: 'mr-IN',
  bn: 'bn-IN',
  te: 'te-IN',
  ta: 'ta-IN',
  pa: 'pa-IN',
  kn: 'kn-IN',
};

const DISTRESS_REGEX = /(suicide|kill myself|die|hopeless|ruined|debt|loan|repay|failed|end my life|mar jaunga|khatam|barbad|karz|udhaar|phas gaya|atmahatya|pareshan|tension|depression)/i;

// Suggestion prompts
const SUGGESTIONS = [
  { icon: Wheat, text: "Best crop for this season?", color: 'from-amber-400 to-yellow-500' },
  { icon: TrendingUp, text: "Current mandi prices", color: 'from-green-400 to-emerald-500' },
  { icon: CloudRain, text: "Weather forecast impact", color: 'from-blue-400 to-cyan-500' },
  { icon: Landmark, text: "PM-Kisan status check", color: 'from-purple-400 to-pink-500' },
];

const ChatScreen: React.FC<ChatScreenProps> = ({ navigateTo, language, t, onOpenVoiceAssistant }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: `${t.namaste || 'Namaste!'} 🙏 I am your Agri-Tutor AI. I can help with crop lifecycle techniques, latest market prices, and Govt. Schemes. How can I assist you today?` }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isThinkingMode, setIsThinkingMode] = useState(false);
  const [isDistressed, setIsDistressed] = useState(false);
  const [groundingUrls, setGroundingUrls] = useState<{ title: string, uri: string }[]>([]);
  const [mode, setMode] = useState<'tutor' | 'schemes'>('tutor');
  const [showSuggestions, setShowSuggestions] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const currentLangLabel = languages.find(l => l.code === language)?.label || 'English';

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = LANG_MAP[language] || 'en-IN';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [language]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      if (!recognitionRef.current) {
        alert("Speech recognition is not supported in your browser.");
        return;
      }
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const handleSend = async (customInput?: string) => {
    const messageText = customInput || input;
    if (!messageText.trim() || isLoading) return;

    setShowSuggestions(false);
    const userMsg = messageText.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);
    setGroundingUrls([]);

    const distressDetected = DISTRESS_REGEX.test(userMsg);
    if (distressDetected) {
      setIsDistressed(true);
      setMessages(prev => [...prev, {
        role: 'system',
        text: t.support_message || 'You are not alone. Help is available. Please reach out.',
        isIntervention: true,
        interventionType: 'helpline'
      }]);
    }

    try {
      let finalMessage = userMsg;
      if (isThinkingMode) finalMessage = `[Mode: Deep Thinking] ${userMsg}`;
      else if (mode === 'schemes') finalMessage = `[Mode: Schemes] ${userMsg}`;

      const data = await aiService.chat(finalMessage);
      const aiText = data.response || "I can't answer that right now.";
      setMessages(prev => [...prev, { role: 'model', text: aiText }]);

    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: 'model', text: "Server error. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Dynamic theme based on state
  const theme = isDistressed ? {
    bg: 'from-blue-50 via-indigo-50/50 to-blue-50',
    primary: 'from-blue-500 to-indigo-600',
    primaryDark: 'from-blue-600 to-indigo-700',
    accent: 'blue',
    color: '#2563eb',
  } : isThinkingMode ? {
    bg: 'from-indigo-50/50 via-purple-50/30 to-indigo-50/50',
    primary: 'from-indigo-500 to-purple-600',
    primaryDark: 'from-indigo-600 to-purple-700',
    accent: 'indigo',
    color: '#4f46e5',
  } : mode === 'schemes' ? {
    bg: 'from-blue-50/50 via-cyan-50/30 to-blue-50/50',
    primary: 'from-blue-500 to-cyan-600',
    primaryDark: 'from-blue-600 to-cyan-700',
    accent: 'blue',
    color: '#2563eb',
  } : {
    bg: 'from-emerald-50/50 via-green-50/30 to-emerald-50/50',
    primary: 'from-emerald-500 to-green-600',
    primaryDark: 'from-emerald-600 to-green-700',
    accent: 'emerald',
    color: '#10b981',
  };

  return (
    <div className={`flex flex-col h-full transition-all duration-1000 bg-gradient-to-br ${theme.bg} relative overflow-hidden`}>

      {/* ========== AMBIENT BACKGROUND ========== */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 30, 0],
            y: [0, -20, 0],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
          className={`absolute top-20 right-10 w-72 h-72 rounded-full blur-3xl opacity-20 ${isDistressed ? 'bg-blue-400' : isThinkingMode ? 'bg-indigo-400' : 'bg-emerald-400'
            }`}
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            x: [0, -30, 0],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          className={`absolute bottom-40 left-10 w-80 h-80 rounded-full blur-3xl opacity-20 ${isDistressed ? 'bg-indigo-400' : isThinkingMode ? 'bg-purple-400' : 'bg-teal-400'
            }`}
        />
      </div>

      {/* ========== PREMIUM HEADER ========== */}
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 20 }}
        className={`relative z-20 px-4 pt-10 pb-4 bg-white/80 backdrop-blur-xl border-b shadow-sm ${isDistressed ? 'border-blue-100' : 'border-gray-100'
          }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.button
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05, x: -2 }}
              onClick={() => navigateTo('home')}
              className="p-2.5 bg-gray-100 hover:bg-gray-200 rounded-2xl text-gray-700 transition-colors"
            >
              <ArrowLeft size={20} />
            </motion.button>

            <div className="flex items-center gap-3">
              <motion.div
                animate={isDistressed || isThinkingMode ? {
                  scale: [1, 1.08, 1],
                  rotate: [0, 3, -3, 0],
                } : {}}
                transition={{ duration: 2, repeat: Infinity }}
                className={`relative w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-lg overflow-hidden bg-gradient-to-br ${theme.primary}`}
                style={{ boxShadow: `0 8px 24px ${theme.color}40` }}
              >
                {/* Animated glow */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-0"
                  style={{
                    background: `conic-gradient(from 0deg, transparent, ${theme.color}80, transparent)`,
                  }}
                />
                <div className="relative z-10">
                  {isDistressed ? <HeartHandshake size={20} /> :
                    isThinkingMode ? <BrainCircuit size={20} /> :
                      mode === 'tutor' ? <Bot size={20} /> : <Landmark size={20} />}
                </div>
              </motion.div>

              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className={`text-sm font-black leading-none ${isDistressed ? 'text-blue-700' : 'text-gray-900'
                    }`}>
                    {isDistressed ? (t.crisis_shield || 'Crisis Shield') :
                      isThinkingMode ? 'Deep Thinking' :
                        mode === 'tutor' ? 'Agri-Tutor AI' : 'Sahayak Bot'}
                  </h2>
                  {isDistressed && (
                    <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
                      <ShieldAlert size={12} className="text-blue-500" />
                    </motion.div>
                  )}
                  {!isDistressed && isThinkingMode && (
                    <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
                      <Sparkles size={12} className="text-indigo-600" />
                    </motion.div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${isDistressed ? 'bg-blue-400' : isThinkingMode ? 'bg-indigo-400' : 'bg-emerald-400'
                    }`} />
                  <span className={`text-[9px] font-black uppercase tracking-widest ${isDistressed ? 'text-blue-500' : 'text-gray-500'
                    }`}>
                    {isDistressed ? (t.calm_down || 'Take a breath') : `${currentLangLabel} • Online`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Mode Switchers */}
          {!isDistressed && (
            <div className="flex gap-1.5">
              <motion.button
                whileTap={{ scale: 0.9 }}
                whileHover={{ scale: 1.05 }}
                onClick={() => setIsThinkingMode(!isThinkingMode)}
                className={`relative p-2.5 rounded-2xl transition-all flex items-center gap-1 border ${isThinkingMode
                  ? 'bg-gradient-to-br from-indigo-500 to-purple-600 border-indigo-400 text-white shadow-lg shadow-indigo-200'
                  : 'bg-white border-gray-200 text-gray-400 hover:border-indigo-200'
                  }`}
              >
                <BrainCircuit size={16} />
                {isThinkingMode && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                    className="absolute -top-1 -right-1"
                  >
                    <Sparkles size={10} className="text-yellow-300" />
                  </motion.div>
                )}
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.9 }}
                whileHover={{ scale: 1.05 }}
                onClick={() => setMode(mode === 'tutor' ? 'schemes' : 'tutor')}
                className={`px-3 py-2.5 rounded-2xl text-[10px] font-black uppercase transition-all flex items-center gap-1.5 border ${mode === 'schemes'
                  ? 'bg-gradient-to-br from-blue-50 to-cyan-50 text-blue-700 border-blue-200 shadow-sm'
                  : 'bg-gradient-to-br from-emerald-50 to-green-50 text-emerald-700 border-emerald-200 shadow-sm'
                  }`}
              >
                {mode === 'schemes' ? <Leaf size={12} /> : <Landmark size={12} />}
                <span>{mode === 'schemes' ? 'Tutor' : 'Schemes'}</span>
              </motion.button>
            </div>
          )}
        </div>
      </motion.div>

      {/* ========== MESSAGES AREA ========== */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 relative z-10">
        <AnimatePresence>
          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', damping: 20, stiffness: 200 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'system' ? (
                // ============ CRISIS INTERVENTION CARD ============
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-full max-w-[90%] relative"
                >
                  <div className="relative bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 rounded-3xl p-5 text-white shadow-2xl shadow-blue-300 overflow-hidden">
                    {/* Animated background */}
                    <motion.div
                      animate={{
                        scale: [1, 1.3, 1],
                        rotate: [0, 180, 360],
                      }}
                      transition={{ duration: 20, repeat: Infinity }}
                      className="absolute -top-20 -right-20 w-48 h-48 bg-white/10 rounded-full"
                    />
                    <motion.div
                      animate={{
                        scale: [1.2, 1, 1.2],
                        rotate: [360, 180, 0],
                      }}
                      transition={{ duration: 15, repeat: Infinity }}
                      className="absolute -bottom-20 -left-20 w-48 h-48 bg-white/10 rounded-full"
                    />

                    <div className="relative">
                      <div className="flex items-center gap-3 mb-3">
                        <motion.div
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="p-2 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30"
                        >
                          <ShieldAlert size={20} className="text-white" />
                        </motion.div>
                        <div className="flex-1">
                          <h4 className="text-base font-black">{t.distress_detected || 'We Hear You'}</h4>
                          <p className="text-[10px] text-blue-100 font-semibold uppercase tracking-wider">Crisis Support Active</p>
                        </div>
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          <HeartHandshake size={20} className="text-pink-200" />
                        </motion.div>
                      </div>

                      <p className="text-sm font-medium leading-relaxed text-blue-50 mb-4">
                        {msg.text}
                      </p>

                      <div className="grid grid-cols-2 gap-2">
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          whileHover={{ scale: 1.02 }}
                          className="flex items-center justify-center gap-1.5 bg-white text-blue-700 py-3 rounded-2xl font-black text-[11px] uppercase tracking-wider shadow-lg"
                        >
                          <Phone size={14} />
                          <span>{t.helpline_btn || 'Helpline'}</span>
                        </motion.button>
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          whileHover={{ scale: 1.02 }}
                          className="flex items-center justify-center gap-1.5 bg-blue-900/50 backdrop-blur-md border border-white/20 text-white py-3 rounded-2xl font-black text-[11px] uppercase tracking-wider"
                        >
                          <FileHeart size={14} />
                          <span>{t.debt_relief_btn || 'Relief'}</span>
                        </motion.button>
                      </div>

                      <div className="mt-3 pt-3 border-t border-white/20 flex items-center justify-center gap-2">
                        <motion.div
                          animate={{ opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                          className="w-1.5 h-1.5 bg-red-400 rounded-full"
                        />
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-200">
                          Kisan Helpline: 1800-180-1551
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                // ============ STANDARD MESSAGE ============
                <div className={`flex items-end gap-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  {/* Avatar */}
                  {msg.role === 'model' && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white bg-gradient-to-br ${theme.primary} shadow-md mb-1`}
                    >
                      {isDistressed ? <HeartHandshake size={12} /> :
                        isThinkingMode ? <BrainCircuit size={12} /> :
                          <Bot size={12} />}
                    </motion.div>
                  )}

                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    className={`relative px-4 py-3 text-sm leading-relaxed shadow-md transition-all ${msg.role === 'user'
                      ? `bg-gradient-to-br ${theme.primary} text-white rounded-3xl rounded-br-md`
                      : `bg-white text-gray-900 border rounded-3xl rounded-bl-md font-medium ${isDistressed ? 'border-blue-100' :
                        isThinkingMode ? 'border-indigo-100 ring-1 ring-indigo-50' :
                          'border-gray-100'
                      }`
                      }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>

                    {/* Message metadata */}
                    {msg.role === 'model' && (
                      <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Sparkles size={8} className={`text-${theme.accent}-500`} />
                          <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">AI Response</span>
                        </div>
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          whileHover={{ scale: 1.1 }}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <Volume2 size={12} />
                        </motion.button>
                      </div>
                    )}

                    {msg.role === 'model' && groundingUrls.length > 0 && idx === messages.length - 1 && (
                      <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                        <p className="text-[10px] font-black text-gray-400 uppercase flex items-center gap-1.5 tracking-widest">
                          <Globe size={12} className={`text-${theme.accent}-600`} />
                          Search Grounded Sources
                        </p>
                        <div className="flex flex-col gap-2">
                          {groundingUrls.map((link, i) => (
                            <motion.a
                              key={i}
                              whileHover={{ x: 2 }}
                              href={link.uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-between p-2 bg-gray-50 rounded-xl border border-gray-100 hover:border-emerald-200 transition-colors group"
                            >
                              <span className="text-[11px] text-gray-700 font-bold truncate max-w-[85%]">{link.title}</span>
                              <ExternalLink size={12} className="text-gray-400 group-hover:text-emerald-600" />
                            </motion.a>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* ========== QUICK SUGGESTIONS ========== */}
        <AnimatePresence>
          {showSuggestions && messages.length === 1 && !isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: 0.5 }}
              className="pt-2"
            >
              <div className="flex items-center gap-2 mb-3 ml-2">
                <Zap size={12} className="text-amber-500" />
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
                  Quick Questions
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {SUGGESTIONS.map((suggestion, i) => (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6 + i * 0.1 }}
                    whileTap={{ scale: 0.95 }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    onClick={() => handleSend(suggestion.text)}
                    className="relative bg-white border border-gray-100 rounded-2xl p-3 text-left shadow-sm hover:shadow-md transition-all overflow-hidden group"
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${suggestion.color} opacity-0 group-hover:opacity-[0.08] transition-opacity`} />
                    <div className="relative flex items-start gap-2">
                      <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${suggestion.color} flex items-center justify-center text-white shadow-sm flex-shrink-0`}>
                        <suggestion.icon size={14} />
                      </div>
                      <p className="text-[11px] font-bold text-gray-700 leading-tight pt-1">
                        {suggestion.text}
                      </p>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ========== LOADING INDICATOR ========== */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex justify-start"
            >
              <div className="flex items-end gap-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-white bg-gradient-to-br ${theme.primary} shadow-md mb-1`}
                >
                  {isDistressed ? <HeartHandshake size={12} /> :
                    isThinkingMode ? <BrainCircuit size={12} /> :
                      <Bot size={12} />}
                </motion.div>

                <div className={`bg-white px-4 py-3 rounded-3xl rounded-bl-md border shadow-md flex items-center gap-2 ${isThinkingMode ? 'border-indigo-100 ring-1 ring-indigo-100' : 'border-gray-100'
                  }`}>
                  {isDistressed ? (
                    <>
                      <HeartHandshake size={16} className="text-blue-600" />
                      <div className="flex gap-1">
                        {[0, 1, 2].map(i => (
                          <motion.div
                            key={i}
                            animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                            transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                            className="w-1.5 h-1.5 bg-blue-500 rounded-full"
                          />
                        ))}
                      </div>
                      <span className="text-[10px] text-blue-700 font-black uppercase tracking-widest ml-1">
                        Caring response...
                      </span>
                    </>
                  ) : isThinkingMode ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      >
                        <BrainCircuit size={16} className="text-indigo-600" />
                      </motion.div>
                      <div className="flex gap-1">
                        {[0, 1, 2].map(i => (
                          <motion.div
                            key={i}
                            animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
                            transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                            className="w-1.5 h-1.5 bg-indigo-500 rounded-full"
                          />
                        ))}
                      </div>
                      <span className="text-[10px] text-indigo-700 font-black uppercase tracking-widest ml-1">
                        Deep thinking...
                      </span>
                    </>
                  ) : (
                    <>
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      >
                        <Sparkles size={16} className="text-emerald-600" />
                      </motion.div>
                      <div className="flex gap-1">
                        {[0, 1, 2].map(i => (
                          <motion.div
                            key={i}
                            animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                            transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                            className="w-1.5 h-1.5 bg-emerald-500 rounded-full"
                          />
                        ))}
                      </div>
                      <span className="text-[10px] text-emerald-700 font-black uppercase tracking-widest ml-1">
                        Thinking...
                      </span>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ========== PREMIUM INPUT BAR ========== */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', damping: 20 }}
        className={`relative z-20 p-3 border-t backdrop-blur-xl ${isDistressed ? 'bg-blue-50/80 border-blue-100' : 'bg-white/80 border-gray-100'
          }`}
      >
        {/* Listening Overlay */}
        <AnimatePresence>
          {isListening && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className="absolute -top-20 left-4 right-4 flex justify-center"
            >
              <div className="relative bg-gradient-to-r from-red-500 to-rose-600 text-white px-5 py-3 rounded-2xl flex items-center gap-3 shadow-2xl shadow-red-300">
                {/* Animated pulse rings */}
                <motion.div
                  animate={{ scale: [1, 1.5], opacity: [0.4, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="absolute inset-0 bg-red-400 rounded-2xl"
                />
                <div className="relative flex items-center gap-3">
                  <div className="flex gap-0.5 items-end h-4">
                    {[0, 1, 2, 3, 4].map(i => (
                      <motion.div
                        key={i}
                        animate={{
                          height: ['30%', '100%', '30%'],
                        }}
                        transition={{
                          duration: 0.8,
                          repeat: Infinity,
                          delay: i * 0.1,
                        }}
                        className="w-1 bg-white rounded-full"
                      />
                    ))}
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest">
                    Listening {currentLangLabel}...
                  </span>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={toggleListening}
                    className="ml-1 p-1 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                  >
                    <X size={14} />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-2">
          {/* Input Field */}
          <div className={`flex-1 relative bg-white rounded-2xl border-2 transition-all ${isDistressed
            ? 'border-blue-200 focus-within:border-blue-500'
            : isThinkingMode
              ? 'border-indigo-200 focus-within:border-indigo-500 shadow-sm shadow-indigo-100'
              : mode === 'schemes'
                ? 'border-blue-200 focus-within:border-blue-500'
                : 'border-emerald-200 focus-within:border-emerald-500'
            }`}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder={
                isDistressed ? "We are here to help you..." :
                  isThinkingMode ? "Ask for long-term farm planning..." :
                    mode === 'schemes' ? 'Ask about PM-Kisan, KCC...' :
                      (t.placeholder_chat || 'Ask me anything...')
              }
              className="w-full bg-transparent outline-none text-sm text-gray-900 font-bold placeholder:text-gray-400 placeholder:font-medium px-4 py-3.5"
            />
            {input && (
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setInput('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
              >
                <X size={14} />
              </motion.button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-1.5">
            {/* Voice Assistant Button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
              onClick={onOpenVoiceAssistant}
              className="relative w-11 h-11 rounded-2xl flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-200 overflow-hidden"
              title="Open Voice Assistant"
            >
              <motion.div
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12"
              />
              <Sparkles size={18} className="relative z-10" />
            </motion.button>

            {/* Mic Button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
              onClick={toggleListening}
              className={`relative w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg transition-all ${isListening
                ? 'bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-red-200'
                : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300'
                }`}
            >
              {isListening && (
                <motion.div
                  animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="absolute inset-0 bg-red-400 rounded-2xl"
                />
              )}
              <Mic size={18} className="relative z-10" />
            </motion.button>

            {/* Send Button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: input.trim() && !isLoading ? 1.05 : 1 }}
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className={`relative w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed overflow-hidden bg-gradient-to-br ${theme.primary}`}
              style={{ boxShadow: input.trim() && !isLoading ? `0 8px 20px ${theme.color}50` : undefined }}
            >
              {input.trim() && !isLoading && (
                <motion.div
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12"
                />
              )}
              {isLoading ? (
                <Loader2 size={18} className="animate-spin relative z-10" />
              ) : (
                <Send size={18} className="relative z-10" />
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ChatScreen;