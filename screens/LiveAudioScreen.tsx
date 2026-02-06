
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Screen, Language } from '../types';
import { ArrowLeft, Mic, MicOff, Volume2, VolumeX, X, BrainCircuit, Sparkles, Loader2, MessageSquareText, HeartHandshake, ShieldAlert } from 'lucide-react';
import { COLORS } from '../constants';
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
  
  const sessionRef = useRef<any>(null);
  const isActiveRef = useRef(false);
  const audioContextInRef = useRef<AudioContext | null>(null);
  const audioContextOutRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const currentLangLabel = languages.find(l => l.code === language)?.label || 'English';

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
               // Check for distress in the user's input transcription
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
          1. Monitor for signs of extreme distress, panic, debt-related hopelessness, or suicidal ideation in the user's voice and text.
          2. IF DISTRESS IS DETECTED:
             - Immediately shift tone to be calm, slow, and reassuring.
             - Validate their feelings (e.g., "I hear you, and I know it is very hard right now.").
             - Do NOT give technical farming advice in this state.
             - Gently mention the "Samadhan Debt Relief Scheme" or "Kisan Helpline (1800-180-1551)" as a source of immediate human support.
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

  return (
    <div className={`h-full flex flex-col transition-colors duration-1000 ${isDistressed ? 'bg-blue-50' : 'bg-white'}`}>
      {/* Header */}
      <div className="p-4 flex items-center justify-between z-10">
        <button onClick={() => { stopSession(); navigateTo('home'); }} className="p-2 text-gray-400 bg-gray-50 rounded-full">
          <ArrowLeft size={24} />
        </button>
        <div className="flex flex-col items-center">
          <span className={`text-[10px] font-black uppercase tracking-widest ${isDistressed ? 'text-blue-500' : 'text-green-500'}`}>
            {isDistressed ? 'Crisis Shield Active' : 'Live Satellite Link'}
          </span>
          <h2 className="text-lg font-black text-gray-900">{isDistressed ? 'Kisan-Manas Support' : 'Agri-Scientist AI'}</h2>
        </div>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isActive ? 'bg-red-50 text-red-500 animate-pulse' : 'bg-gray-50 text-gray-300'}`}>
          <div className="w-3 h-3 bg-current rounded-full"></div>
        </div>
      </div>

      {/* Main Visualizer Area */}
      <div className="flex-1 flex flex-col items-center justify-center relative">
         {/* Background Ambient Effect */}
         <div className={`absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none transition-colors duration-1000 ${isDistressed ? 'text-blue-300' : 'text-green-200'}`}>
            <div className={`w-64 h-64 rounded-full blur-3xl bg-current ${isActive ? 'animate-pulse' : ''}`}></div>
         </div>

         {/* Central Avatar / Visualizer */}
         <div className={`relative z-10 w-48 h-48 rounded-full flex items-center justify-center transition-all duration-500 ${
           isActive 
           ? (isDistressed ? 'bg-blue-100 shadow-[0_0_60px_rgba(59,130,246,0.3)] scale-110' : 'bg-green-100 shadow-[0_0_60px_rgba(34,197,94,0.3)] scale-110')
           : 'bg-gray-50'
         }`}>
            {isConnecting ? (
               <Loader2 size={48} className={`animate-spin ${isDistressed ? 'text-blue-500' : 'text-green-600'}`} />
            ) : isActive ? (
               isDistressed ? (
                 <HeartHandshake size={64} className="text-blue-600 animate-pulse" />
               ) : (
                 <BrainCircuit size={64} className="text-green-600" />
               )
            ) : (
               <MicOff size={48} className="text-gray-300" />
            )}
            
            {/* Ripple Effects when Active */}
            {isActive && (
              <>
                 <div className={`absolute inset-0 rounded-full border-2 opacity-50 animate-ping ${isDistressed ? 'border-blue-400' : 'border-green-400'}`} style={{ animationDuration: '2s' }}></div>
                 <div className={`absolute inset-0 rounded-full border-2 opacity-30 animate-ping ${isDistressed ? 'border-blue-400' : 'border-green-400'}`} style={{ animationDuration: '3s', animationDelay: '0.5s' }}></div>
              </>
            )}
         </div>
         
         <p className="mt-8 text-sm font-bold text-gray-400 uppercase tracking-widest text-center max-w-xs px-6">
           {isConnecting ? "Establishing Secure Line..." : (isActive ? (isDistressed ? "We are here for you..." : "Listening...") : "Tap microphone to start")}
         </p>

         {/* Transcription Preview */}
         <div className="mt-6 h-24 w-full max-w-sm px-6 overflow-y-auto no-scrollbar text-center space-y-2">
            {transcriptions.slice(-2).map((t, i) => (
              <p key={i} className={`text-sm ${t.role === 'user' ? 'text-gray-500' : (isDistressed ? 'text-blue-600 font-medium' : 'text-green-600 font-medium')}`}>
                {t.text}
              </p>
            ))}
            {currentInput && <p className="text-sm text-gray-400 italic">{currentInput}...</p>}
         </div>
      </div>

      {/* Controls */}
      <div className="p-8 pb-12 flex justify-center items-center gap-6">
         {isActive ? (
            <button 
              onClick={stopSession}
              className="w-20 h-20 bg-red-500 rounded-full text-white shadow-xl shadow-red-200 flex items-center justify-center active:scale-90 transition-all"
            >
               <X size={32} />
            </button>
         ) : (
            <button 
              onClick={startSession}
              disabled={isConnecting}
              className={`w-20 h-20 rounded-full text-white shadow-xl flex items-center justify-center active:scale-90 transition-all ${
                 isConnecting ? 'bg-gray-200' : (isDistressed ? 'bg-blue-600 shadow-blue-200' : 'bg-green-600 shadow-green-200')
              }`}
            >
               <Mic size={32} />
            </button>
         )}
      </div>

      {/* Distress Overlay Card */}
      {isDistressed && (
        <div className="absolute top-20 left-4 right-4 bg-blue-600 text-white p-6 rounded-[2rem] shadow-2xl animate-in slide-in-from-top-4 z-20">
           <div className="flex items-start gap-4">
              <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                 <ShieldAlert size={24} />
              </div>
              <div className="flex-1">
                 <h3 className="text-lg font-black">{t.distress_detected}</h3>
                 <p className="text-sm text-blue-100 mt-1 leading-relaxed">
                   {t.support_message}
                 </p>
              </div>
           </div>
           <div className="mt-6 flex gap-3">
              <button className="flex-1 py-3 bg-white text-blue-700 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg">
                 Call Helpline
              </button>
              <button className="flex-1 py-3 bg-blue-800 text-white rounded-xl text-xs font-black uppercase tracking-widest">
                 Debt Relief
              </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default LiveAudioScreen;
