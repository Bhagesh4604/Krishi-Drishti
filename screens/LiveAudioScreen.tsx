import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Screen, Language } from '../types';
import {
  ArrowLeft,
  Mic,
  MicOff,
  X,
  BrainCircuit,
  Sparkles,
  Loader2,
  HeartHandshake,
  ShieldAlert,
  Phone,
  HandCoins,
  Radio,
  Waves,
  Zap,
  MessageCircle,
  Activity,
  Satellite
} from 'lucide-react';
import { languages } from '../translations';

interface LiveAudioScreenProps {
  navigateTo: (screen: Screen) => void;
  language: Language;
  t: any;
}

const LiveAudioScreen: React.FC<LiveAudioScreenProps> = ({ navigateTo, language, t }) => {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcriptions, setTranscriptions] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [currentOutput, setCurrentOutput] = useState('');
  const [isDistressed, setIsDistressed] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [sessionTime, setSessionTime] = useState(0);

  const sessionRef = useRef<any>(null);
  const isActiveRef = useRef(false);
  const audioContextInRef = useRef<AudioContext | null>(null);
  const audioContextOutRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const currentLangLabel = languages.find(l => l.code === language)?.label || 'English';

  // Session timer
  useEffect(() => {
    let interval: any;
    if (isActive) {
      interval = setInterval(() => setSessionTime(t => t + 1), 1000);
    } else {
      setSessionTime(0);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Audio level analyzer for visualizations
  const startAudioAnalyzer = (stream: MediaStream) => {
    if (!audioContextInRef.current) return;
    const analyser = audioContextInRef.current.createAnalyser();
    analyser.fftSize = 256;
    const source = audioContextInRef.current.createMediaStreamSource(stream);
    source.connect(analyser);
    analyserRef.current = analyser;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const updateLevel = () => {
      if (!analyserRef.current) return;
      analyserRef.current.getByteFrequencyData(dataArray);
      const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      setAudioLevel(Math.min(avg / 128, 1));
      animationFrameRef.current = requestAnimationFrame(updateLevel);
    };
    updateLevel();
  };

  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number) => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  };

  const encode = (bytes: Uint8Array) => {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const createBlob = (data: Float32Array) => {
    const int16 = new Int16Array(data.length);
    for (let i = 0; i < data.length; i++) {
      int16[i] = data[i] * 32768;
    }
    return {
      data: encode(new Uint8Array(int16.buffer)),
      mimeType: 'audio/pcm;rate=16000',
    };
  };

  const startSession = async () => {
    setIsConnecting(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      audioContextInRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextOutRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      startAudioAnalyzer(stream);

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsActive(true);
            isActiveRef.current = true;
            setIsConnecting(false);
            const source = audioContextInRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = audioContextInRef.current!.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
              if (!isActiveRef.current) return;
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromise.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContextInRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.outputTranscription) {
              setCurrentOutput(prev => prev + message.serverContent!.outputTranscription!.text);
            } else if (message.serverContent?.inputTranscription) {
              setCurrentInput(prev => prev + message.serverContent!.inputTranscription!.text);
            }

            if (message.serverContent?.turnComplete) {
              const distressRegex = /(suicide|kill myself|die|hopeless|ruined|debt|loan|repay|failed|end my life|mar jaunga|khatam|barbad|karz|udhaar)/i;
              if (distressRegex.test(currentInput)) {
                setIsDistressed(true);
              }

              setTranscriptions(prev => [
                ...prev,
                { role: 'user', text: currentInput },
                { role: 'model', text: currentOutput }
              ]);
              setCurrentInput('');
              setCurrentOutput('');
            }

            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              const audioCtx = audioContextOutRef.current!;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, audioCtx.currentTime);
              const audioBuffer = await decodeAudioData(
                decode(base64Audio),
                audioCtx,
                24000,
                1
              );
              const source = audioCtx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(audioCtx.destination);
              source.onended = () => {
                sourcesRef.current.delete(source);
              };
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }
          },
          onclose: () => {
            setIsActive(false);
            isActiveRef.current = false;
          },
          onerror: (e) => {
            console.error(e);
            setIsActive(false);
            isActiveRef.current = false;
            setIsConnecting(false);
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: `You are Kisan-Sarathi, an expert AI Agricultural Scientist and Empathetic Companion. 
          Language: ${currentLangLabel}.
          
          CRISIS SHIELD PROTOCOL (Active):
          1. Monitor for signs of extreme distress, panic, debt-related hopelessness, or suicidal ideation.
          2. IF DISTRESS IS DETECTED:
             - Immediately shift tone to be calm, slow, and reassuring.
             - Validate their feelings.
             - Do NOT give technical farming advice in this state.
             - Gently mention the "Samadhan Debt Relief Scheme" or "Kisan Helpline (1800-180-1551)".
             - Your primary goal is de-escalation and emotional support.
          
          NORMAL MODE:
          - Provide expert, scientific advice on crops, weather, and markets.
          - Be concise and practical.`
        }
      });
      sessionRef.current = sessionPromise;

    } catch (err) {
      console.error(err);
      setIsConnecting(false);
    }
  };

  const stopSession = () => {
    if (sessionRef.current) {
      sessionRef.current.then((session: any) => session.close());
    }
    if (audioContextInRef.current) audioContextInRef.current.close();
    if (audioContextOutRef.current) audioContextOutRef.current.close();
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    analyserRef.current = null;
    setAudioLevel(0);
    setIsActive(false);
    isActiveRef.current = false;
    setIsConnecting(false);
    setIsDistressed(false);
    setTranscriptions([]);
  };

  useEffect(() => {
    return () => {
      stopSession();
    };
  }, []);

  // Theme configuration based on state
  const theme = isDistressed
    ? {
      primary: 'from-blue-500 to-indigo-600',
      primaryDark: 'from-blue-700 to-indigo-800',
      accent: 'blue',
      bgGradient: 'from-blue-950 via-indigo-950 to-slate-950',
      glow: 'rgba(59, 130, 246, 0.6)',
      ring: 'border-blue-400',
    }
    : {
      primary: 'from-emerald-500 to-teal-600',
      primaryDark: 'from-emerald-700 to-teal-800',
      accent: 'emerald',
      bgGradient: 'from-slate-950 via-emerald-950/40 to-slate-950',
      glow: 'rgba(16, 185, 129, 0.6)',
      ring: 'border-emerald-400',
    };

  return (
    <div className={`h-full flex flex-col relative overflow-hidden bg-gradient-to-br ${theme.bgGradient} transition-all duration-1000`}>

      {/* ========== ANIMATED BACKGROUND ========== */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }}
        />

        {/* Floating orbs */}
        <motion.div
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
          className={`absolute top-20 left-10 w-72 h-72 rounded-full blur-3xl ${isDistressed ? 'bg-blue-500/20' : 'bg-emerald-500/20'}`}
        />
        <motion.div
          animate={{
            x: [0, -80, 0],
            y: [0, 60, 0],
            scale: [1.2, 1, 1.2],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          className={`absolute bottom-20 right-10 w-80 h-80 rounded-full blur-3xl ${isDistressed ? 'bg-indigo-500/20' : 'bg-teal-500/20'}`}
        />

        {/* Particle stars */}
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0.2, 1, 0.2],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 2 + Math.random() * 3,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* ========== PREMIUM HEADER ========== */}
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative z-10 p-4 flex items-center justify-between"
      >
        <motion.button
          whileTap={{ scale: 0.9 }}
          whileHover={{ scale: 1.05 }}
          onClick={() => { stopSession(); navigateTo('home'); }}
          className="w-11 h-11 bg-white/10 backdrop-blur-xl text-white rounded-2xl border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all"
        >
          <ArrowLeft size={20} />
        </motion.button>

        <div className="flex flex-col items-center">
          <motion.div
            className="flex items-center gap-2 mb-1"
            animate={isActive ? { scale: [1, 1.05, 1] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {isDistressed ? (
              <ShieldAlert size={12} className="text-blue-400" />
            ) : (
              <Satellite size={12} className={isActive ? 'text-emerald-400' : 'text-gray-500'} />
            )}
            <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${isDistressed ? 'text-blue-400' : isActive ? 'text-emerald-400' : 'text-gray-500'
              }`}>
              {isDistressed ? '• Crisis Shield Active •' : isActive ? '• Live Satellite Link •' : '• Standby •'}
            </span>
          </motion.div>
          <h2 className="text-base font-black text-white">
            {isDistressed ? 'Kisan-Manas Support' : 'Agri-Scientist AI'}
          </h2>
          {isActive && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-1.5 mt-1"
            >
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-mono font-bold text-white/80">{formatTime(sessionTime)}</span>
            </motion.div>
          )}
        </div>

        {/* Status indicator */}
        <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center backdrop-blur-xl transition-all ${isActive
            ? (isDistressed ? 'bg-blue-500/20 border-blue-400/40' : 'bg-emerald-500/20 border-emerald-400/40')
            : 'bg-white/10 border-white/20'
          }`}>
          {isActive ? (
            <motion.div
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className={`w-3 h-3 rounded-full ${isDistressed ? 'bg-blue-400' : 'bg-emerald-400'}`}
            />
          ) : (
            <div className="w-3 h-3 rounded-full bg-gray-500" />
          )}
        </div>
      </motion.div>

      {/* ========== MAIN VISUALIZER ========== */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10 px-6">

        {/* ==== CENTRAL ORB WITH ADVANCED VISUALIZATIONS ==== */}
        <div className="relative flex items-center justify-center" style={{ width: 320, height: 320 }}>

          {/* Outer rotating rings */}
          {isActive && (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 rounded-full"
                style={{
                  background: `conic-gradient(from 0deg, transparent, ${theme.glow}, transparent)`,
                  filter: 'blur(8px)',
                }}
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
                className={`absolute inset-4 rounded-full border-2 ${theme.ring} opacity-20`}
                style={{ borderStyle: 'dashed' }}
              />
            </>
          )}

          {/* Audio-reactive waveform circles */}
          {isActive && [...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className={`absolute rounded-full border-2 ${theme.ring}`}
              style={{
                inset: 40 + i * 20,
                opacity: 0.3 - i * 0.08,
              }}
              animate={{
                scale: [1, 1 + audioLevel * 0.3, 1],
              }}
              transition={{
                duration: 0.3,
                ease: 'easeOut',
              }}
            />
          ))}

          {/* Ripple effects */}
          {isActive && [0, 1, 2].map((i) => (
            <motion.div
              key={`ripple-${i}`}
              className={`absolute inset-16 rounded-full border-2 ${theme.ring}`}
              animate={{
                scale: [1, 2],
                opacity: [0.6, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: i * 1,
                ease: 'easeOut',
              }}
            />
          ))}

          {/* Main central orb */}
          <motion.div
            animate={isActive ? {
              scale: [1, 1 + audioLevel * 0.1, 1],
            } : {}}
            transition={{ duration: 0.2 }}
            className="relative w-52 h-52 rounded-full flex items-center justify-center"
            style={{
              background: isActive
                ? `radial-gradient(circle at 30% 30%, ${isDistressed ? '#60a5fa' : '#34d399'}, ${isDistressed ? '#1e40af' : '#065f46'})`
                : 'radial-gradient(circle at 30% 30%, #475569, #0f172a)',
              boxShadow: isActive
                ? `0 0 80px ${theme.glow}, 0 0 140px ${theme.glow}, inset 0 0 40px rgba(255,255,255,0.2)`
                : '0 0 40px rgba(0,0,0,0.5), inset 0 0 40px rgba(255,255,255,0.05)',
            }}
          >
            {/* Glossy highlight */}
            <div
              className="absolute inset-2 rounded-full opacity-40"
              style={{
                background: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.8), transparent 50%)',
              }}
            />

            {/* Inner icon */}
            <motion.div
              animate={isConnecting ? { rotate: 360 } : {}}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="relative z-10"
            >
              {isConnecting ? (
                <Loader2 size={56} className="text-white drop-shadow-lg" />
              ) : isActive ? (
                isDistressed ? (
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <HeartHandshake size={72} className="text-white drop-shadow-xl" strokeWidth={1.5} />
                  </motion.div>
                ) : (
                  <motion.div
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 4, repeat: Infinity }}
                  >
                    <BrainCircuit size={72} className="text-white drop-shadow-xl" strokeWidth={1.5} />
                  </motion.div>
                )
              ) : (
                <MicOff size={56} className="text-white/60" strokeWidth={1.5} />
              )}
            </motion.div>

            {/* Audio level bars inside orb */}
            {isActive && (
              <div className="absolute bottom-10 flex items-end gap-1 h-6">
                {[...Array(7)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-1 bg-white/70 rounded-full"
                    animate={{
                      height: [`${20 + Math.random() * 60}%`, `${30 + audioLevel * 70}%`, `${20 + Math.random() * 60}%`],
                    }}
                    transition={{
                      duration: 0.4,
                      repeat: Infinity,
                      delay: i * 0.05,
                    }}
                  />
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* ==== STATUS TEXT ==== */}
        <motion.div
          key={`${isConnecting}-${isActive}-${isDistressed}`}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mt-8 flex flex-col items-center"
        >
          <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full backdrop-blur-xl ${isActive
              ? (isDistressed ? 'bg-blue-500/20 border border-blue-400/30' : 'bg-emerald-500/20 border border-emerald-400/30')
              : 'bg-white/10 border border-white/20'
            }`}>
            {isActive && (
              <motion.div
                animate={{ scale: [1, 1.5, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className={`w-1.5 h-1.5 rounded-full ${isDistressed ? 'bg-blue-400' : 'bg-emerald-400'}`}
              />
            )}
            <p className={`text-xs font-black uppercase tracking-[0.2em] ${isActive
                ? (isDistressed ? 'text-blue-300' : 'text-emerald-300')
                : 'text-gray-400'
              }`}>
              {isConnecting
                ? "Establishing Secure Line..."
                : isActive
                  ? (isDistressed ? "We are here for you" : "Listening...")
                  : "Tap microphone to start"}
            </p>
          </div>
        </motion.div>

        {/* ==== TRANSCRIPTION PREVIEW ==== */}
        <div className="mt-6 h-28 w-full max-w-sm px-4 overflow-y-auto no-scrollbar text-center space-y-2">
          <AnimatePresence mode="popLayout">
            {transcriptions.slice(-2).map((tr, i) => (
              <motion.div
                key={`${i}-${tr.text}`}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10 }}
                className={`p-2.5 rounded-2xl backdrop-blur-sm ${tr.role === 'user'
                    ? 'bg-white/10 border border-white/20'
                    : (isDistressed ? 'bg-blue-500/20 border border-blue-400/30' : 'bg-emerald-500/20 border border-emerald-400/30')
                  }`}
              >
                <div className="flex items-center gap-1.5 justify-center mb-1">
                  {tr.role === 'user' ? (
                    <>
                      <Mic size={10} className="text-gray-400" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">You</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={10} className={isDistressed ? 'text-blue-300' : 'text-emerald-300'} />
                      <span className={`text-[9px] font-black uppercase tracking-widest ${isDistressed ? 'text-blue-300' : 'text-emerald-300'}`}>AI</span>
                    </>
                  )}
                </div>
                <p className={`text-xs font-medium ${tr.role === 'user' ? 'text-white/80' : 'text-white'
                  }`}>
                  {tr.text}
                </p>
              </motion.div>
            ))}
          </AnimatePresence>
          {currentInput && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-white/50 italic"
            >
              {currentInput}...
            </motion.p>
          )}
        </div>
      </div>

      {/* ========== CONTROLS ========== */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="relative z-10 p-6 pb-10 flex justify-center items-center gap-6"
      >
        <AnimatePresence mode="wait">
          {isActive ? (
            <motion.button
              key="stop"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
              onClick={stopSession}
              className="relative w-20 h-20 rounded-full text-white flex items-center justify-center shadow-2xl"
              style={{
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                boxShadow: '0 10px 40px rgba(239, 68, 68, 0.5)',
              }}
            >
              <motion.div
                animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 rounded-full bg-red-400"
              />
              <X size={32} strokeWidth={3} className="relative z-10" />
            </motion.button>
          ) : (
            <motion.button
              key="start"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
              onClick={startSession}
              disabled={isConnecting}
              className="relative w-20 h-20 rounded-full text-white flex items-center justify-center shadow-2xl overflow-hidden"
              style={{
                background: isConnecting
                  ? 'linear-gradient(135deg, #64748b, #475569)'
                  : isDistressed
                    ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)'
                    : 'linear-gradient(135deg, #10b981, #059669)',
                boxShadow: isConnecting
                  ? '0 10px 40px rgba(100, 116, 139, 0.4)'
                  : isDistressed
                    ? '0 10px 40px rgba(59, 130, 246, 0.5)'
                    : '0 10px 40px rgba(16, 185, 129, 0.5)',
              }}
            >
              {/* Pulse rings */}
              {!isConnecting && (
                <>
                  <motion.div
                    animate={{ scale: [1, 1.8], opacity: [0.5, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className={`absolute inset-0 rounded-full ${isDistressed ? 'bg-blue-400' : 'bg-emerald-400'}`}
                  />
                  <motion.div
                    animate={{ scale: [1, 1.8], opacity: [0.5, 0] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                    className={`absolute inset-0 rounded-full ${isDistressed ? 'bg-blue-400' : 'bg-emerald-400'}`}
                  />
                </>
              )}

              {isConnecting ? (
                <Loader2 size={32} className="animate-spin relative z-10" />
              ) : (
                <Mic size={32} strokeWidth={2.5} className="relative z-10" />
              )}

              {/* Shimmer */}
              <motion.div
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12"
              />
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ========== DISTRESS CRISIS OVERLAY ========== */}
      <AnimatePresence>
        {isDistressed && (
          <motion.div
            initial={{ y: -100, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ type: 'spring', damping: 20 }}
            className="absolute top-20 left-4 right-4 z-30"
          >
            <div className="relative bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 text-white p-5 rounded-3xl shadow-2xl overflow-hidden border border-blue-400/30">
              {/* Animated background effects */}
              <motion.div
                animate={{
                  scale: [1, 1.3, 1],
                  rotate: [0, 180, 360],
                }}
                transition={{ duration: 20, repeat: Infinity }}
                className="absolute -top-16 -right-16 w-48 h-48 bg-white/10 rounded-full"
              />
              <motion.div
                animate={{
                  scale: [1.2, 1, 1.2],
                  rotate: [360, 180, 0],
                }}
                transition={{ duration: 15, repeat: Infinity }}
                className="absolute -bottom-16 -left-16 w-48 h-48 bg-white/10 rounded-full"
              />

              <div className="relative">
                <div className="flex items-start gap-3">
                  <motion.div
                    animate={{
                      scale: [1, 1.1, 1],
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="p-3 bg-white/20 rounded-2xl backdrop-blur-md border border-white/30"
                  >
                    <ShieldAlert size={24} />
                  </motion.div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-black">{t.distress_detected || 'We Hear You'}</h3>
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <HeartHandshake size={16} className="text-pink-200" />
                      </motion.div>
                    </div>
                    <p className="text-xs text-blue-100 leading-relaxed font-medium">
                      {t.support_message || 'You are not alone. Help is available right now. Please take a deep breath.'}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    whileHover={{ scale: 1.02 }}
                    className="flex-1 py-3 bg-white text-blue-700 rounded-2xl text-[11px] font-black uppercase tracking-wider shadow-lg flex items-center justify-center gap-2"
                  >
                    <Phone size={14} />
                    Call Helpline
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    whileHover={{ scale: 1.02 }}
                    className="flex-1 py-3 bg-blue-900/60 backdrop-blur-md border border-white/20 text-white rounded-2xl text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-2"
                  >
                    <HandCoins size={14} />
                    Debt Relief
                  </motion.button>
                </div>

                {/* Emergency badge */}
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
        )}
      </AnimatePresence>
    </div>
  );
};

export default LiveAudioScreen;