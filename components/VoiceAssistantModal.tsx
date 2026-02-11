import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { X, Mic, MicOff, Loader2, Globe, Sparkles } from 'lucide-react';
import { languages } from '../translations';
import { Language } from '../types';

interface VoiceAssistantModalProps {
    isOpen: boolean;
    onClose: () => void;
    language: Language;
}

const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({ isOpen, onClose, language }) => {
    const [isActive, setIsActive] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [transcriptions, setTranscriptions] = useState<{ role: 'user' | 'model', text: string }[]>([]);
    const [currentInput, setCurrentInput] = useState('');
    const [currentOutput, setCurrentOutput] = useState('');
    const [selectedLang, setSelectedLang] = useState<Language>(language);
    const [showLangMenu, setShowLangMenu] = useState(false);

    const sessionRef = useRef<any>(null);
    const isActiveRef = useRef(false);
    const audioContextInRef = useRef<AudioContext | null>(null);
    const audioContextOutRef = useRef<AudioContext | null>(null);
    const nextStartTimeRef = useRef(0);
    const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

    // Audio helper functions (Same as LiveAudioScreen)
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
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY }); // Ensure API KEY is available
            audioContextInRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            audioContextOutRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            const currentLangLabel = languages.find(l => l.code === selectedLang)?.label || 'English';

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
                    systemInstruction: `You are Kisan-Sarathi, an expert AI Agricultural Scientist. 
          Language: ${currentLangLabel}.
          Provide concise, practical farming advice.`
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
        setTranscriptions([]);
    };

    useEffect(() => {
        if (isOpen && !isActive && !isConnecting) {
            startSession();
        } else if (!isOpen) {
            stopSession();
        }
        return () => stopSession();
    }, [isOpen]);

    // Restart session if language changes while active
    useEffect(() => {
        if (isActive && isOpen) {
            stopSession();
            setTimeout(() => startSession(), 500);
        }
    }, [selectedLang]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black/95 text-white animate-in fade-in duration-300">

            {/* Header */}
            <div className="flex justify-between items-center p-6">
                <div className="flex items-center gap-2">
                    <Sparkles className="text-teal-400" size={20} />
                    <span className="text-sm font-bold tracking-widest uppercase text-teal-400">Kisan-Sarathi AI</span>
                </div>

                <div className="flex gap-4 items-center">
                    {/* Language Selector */}
                    <div className="relative">
                        <button
                            onClick={() => setShowLangMenu(!showLangMenu)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-bold transition-colors"
                        >
                            <Globe size={14} />
                            {languages.find(l => l.code === selectedLang)?.native || 'English'}
                        </button>

                        {showLangMenu && (
                            <div className="absolute top-full right-0 mt-2 w-48 bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50">
                                {languages.map(lang => (
                                    <button
                                        key={lang.code}
                                        onClick={() => {
                                            setSelectedLang(lang.code as Language);
                                            setShowLangMenu(false);
                                        }}
                                        className={`w-full text-left px-4 py-3 text-xs font-bold hover:bg-white/5 transition-colors ${selectedLang === lang.code ? 'text-teal-400' : 'text-gray-400'}`}
                                    >
                                        {lang.native} ({lang.label})
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <button onClick={onClose} className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                        <X size={20} />
                    </button>
                </div>
            </div>

            {/* Main Visualizer Area */}
            <div className="flex-1 flex flex-col items-center justify-center relative">

                {/* Perplexity-style Orb Animation */}
                <div className="relative w-64 h-64 flex items-center justify-center">
                    {/* Core Orb */}
                    <div className={`w-32 h-32 rounded-full bg-teal-500 blur-2xl opacity-40 transition-all duration-500 ${isActive ? 'scale-110' : 'scale-90'}`}></div>
                    <div className={`absolute w-24 h-24 rounded-full bg-teal-400 blur-xl opacity-60 transition-all duration-300 ${isActive ? 'scale-110' : 'scale-100'}`}></div>
                    <div className="absolute w-20 h-20 rounded-full bg-white blur-lg opacity-30"></div>

                    {/* Rotating Rings (Simulated) */}
                    {isActive && (
                        <>
                            <div className="absolute inset-0 border border-teal-500/30 rounded-full w-full h-full animate-[spin_4s_linear_infinite]"></div>
                            <div className="absolute inset-4 border border-teal-300/20 rounded-full w-56 h-56 animate-[spin_6s_linear_infinite_reverse]"></div>
                        </>
                    )}

                    {/* Ripple Waves */}
                    {isActive && (
                        <>
                            <div className="absolute w-full h-full rounded-full border-2 border-teal-500/20 animate-ping" style={{ animationDuration: '2s' }}></div>
                            <div className="absolute w-full h-full rounded-full border-2 border-teal-500/10 animate-ping" style={{ animationDuration: '3s', animationDelay: '0.5s' }}></div>
                        </>
                    )}

                    {/* Icon Center */}
                    <div className="absolute z-10">
                        {isConnecting ? (
                            <Loader2 className="animate-spin text-white" size={32} />
                        ) : isActive ? (
                            <Mic className="text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]" size={32} />
                        ) : (
                            <MicOff className="text-gray-400" size={32} />
                        )}
                    </div>
                </div>

                {/* Status Text */}
                <p className="mt-8 text-sm font-bold text-teal-200 uppercase tracking-[0.2em] animate-pulse">
                    {isConnecting ? 'Initializing...' : (isActive ? 'Listening...' : 'Paused')}
                </p>

                {/* Transcription Stream */}
                <div className="mt-8 w-full max-w-lg px-8 space-y-4 text-center h-32 overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/95 z-10 pointer-events-none"></div>
                    {transcriptions.slice(-1).map((t, i) => (
                        <p key={i} className={`text-lg font-medium leading-relaxed ${t.role === 'model' ? 'text-white' : 'text-gray-400'}`}>
                            "{t.text}"
                        </p>
                    ))}
                    {currentInput && <p className="text-lg text-gray-400 font-medium">"{currentInput}..."</p>}
                    {currentOutput && <p className="text-lg text-white font-medium">"{currentOutput}..."</p>}
                </div>

            </div>

            {/* Footer / Controls */}
            <div className="p-8 pb-12 flex justify-center">
                <button
                    onClick={isActive ? stopSession : startSession}
                    className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-2xl active:scale-90 ${isActive ? 'bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30' : 'bg-teal-500/20 text-teal-400 border border-teal-500/50 hover:bg-teal-500/30'}`}
                >
                    {isActive ? <X size={24} /> : <Mic size={24} />}
                </button>
            </div>
        </div>
    );
};

export default VoiceAssistantModal;
