import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { X, Mic, MicOff, Loader2, Globe, Sparkles, Keyboard } from 'lucide-react';
import { languages } from '../translations';
import { Language } from '../types';

interface VoiceAssistantModalProps {
    isOpen: boolean;
    onClose: () => void;
    language: Language;
    onSwitchToText?: () => void;
}

const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({ isOpen, onClose, language, onSwitchToText }) => {
    const [isActive, setIsActive] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [transcriptions, setTranscriptions] = useState<{ role: 'user' | 'model', text: string }[]>([]);
    const [currentInput, setCurrentInput] = useState('');
    const [currentOutput, setCurrentOutput] = useState('');
    const [selectedLang, setSelectedLang] = useState<Language>(language);
    const [showLangMenu, setShowLangMenu] = useState(false);

    // Visualization State
    const [volume, setVolume] = useState(0);

    const sessionRef = useRef<any>(null);
    const isActiveRef = useRef(false);
    const audioContextInRef = useRef<AudioContext | null>(null);
    const audioContextOutRef = useRef<AudioContext | null>(null);
    const nextStartTimeRef = useRef(0);
    const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const animationRef = useRef<number>();
    const analyserRef = useRef<AnalyserNode | null>(null);

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
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
            audioContextInRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            audioContextOutRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            const currentLangLabel = languages.find(l => l.code === selectedLang)?.label || 'English';

            // Connect Analyser for Visualization
            const analyser = audioContextInRef.current.createAnalyser();
            analyser.fftSize = 256;
            analyserRef.current = analyser;

            const source = audioContextInRef.current.createMediaStreamSource(stream);
            source.connect(analyser); // Connect source to analyser

            // Visualization Loop
            const updateVolume = () => {
                const dataArray = new Uint8Array(analyser.frequencyBinCount);
                analyser.getByteFrequencyData(dataArray);
                const avg = dataArray.reduce((p, c) => p + c, 0) / dataArray.length;

                // Normalize and smooth volume (0 to 1 range, biased towards speech frequencies)
                // Use a lower threshold to make it sensitive
                const normalizedParams = Math.min(1, avg / 60);

                setVolume(prev => prev * 0.8 + normalizedParams * 0.2); // Smooth transition
                animationRef.current = requestAnimationFrame(updateVolume);
            };
            updateVolume();

            const sessionPromise = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-12-2025',
                callbacks: {
                    onopen: () => {
                        setIsActive(true);
                        isActiveRef.current = true;
                        setIsConnecting(false);

                        // Re-use source for script processor logic
                        // We need to re-create the graph part for the processor since it's a specific requirement for the SDK input
                        const scriptProcessor = audioContextInRef.current!.createScriptProcessor(4096, 1, 1);
                        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                            if (!isActiveRef.current) return;
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob = createBlob(inputData);
                            sessionPromise.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };

                        // Connect the source to the processor
                        // Note: source is already created above and connected to analyser.
                        // We can connect it to multiple destinations.
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
                        if (animationRef.current) cancelAnimationFrame(animationRef.current);
                    },
                    onerror: (e) => {
                        console.error(e);
                        setIsActive(false);
                        isActiveRef.current = false;
                        setIsConnecting(false);
                        if (animationRef.current) cancelAnimationFrame(animationRef.current);
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
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
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
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
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

    // Dynamic Style for Orb
    const orbScale = 1 + (volume * 1.5);

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

                    {/* Animated Container for Circular Motion */}
                    <div
                        className="relative flex items-center justify-center transition-transform duration-100 ease-linear"
                        style={{
                            transform: `scale(${orbScale}) rotate(${Date.now() / 1000 * 20}deg)`,
                        }}
                    >
                        {/* Core Orb */}
                        <div className={`w-32 h-32 rounded-full bg-teal-500 blur-2xl opacity-40 transition-all duration-75`} />
                        <div className={`absolute w-24 h-24 rounded-full bg-teal-400 blur-xl opacity-60 transition-all duration-75`} />
                        <div className="absolute w-20 h-20 rounded-full bg-white blur-lg opacity-30" />
                    </div>

                    {/* Orbiting Particles (Simulated) */}
                    {isActive && (
                        <div className="absolute inset-0 animate-[spin_10s_linear_infinite]" style={{ animationDuration: `${Math.max(0.5, 5 - volume * 4)}s` }}>
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-teal-200 rounded-full blur-[1px]"></div>
                            <div className="absolute bottom-10 right-10 w-1.5 h-1.5 bg-teal-300 rounded-full blur-[1px]"></div>
                        </div>
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
            <div className="p-8 pb-12 flex justify-center items-center gap-6">

                {/* Switch to Text Chat */}
                <button
                    onClick={onSwitchToText}
                    className="p-4 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all active:scale-95 flex flex-col items-center gap-1"
                    title="Type to Chat"
                >
                    <div className="bg-teal-500/20 p-3 rounded-full border border-teal-500/50">
                        <Keyboard size={20} className="text-teal-400" />
                    </div>
                    <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider">Type</span>
                </button>

                <button
                    onClick={isActive ? stopSession : startSession}
                    className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-2xl active:scale-90 ${isActive ? 'bg-red-500/20 text-red-400 border-2 border-red-500/50 hover:bg-red-500/30' : 'bg-teal-500/20 text-teal-400 border-2 border-teal-500/50 hover:bg-teal-500/30'}`}
                >
                    {isActive ? <X size={32} /> : <Mic size={32} />}
                </button>

                {/* Placeholder for symmetry */}
                <div className="w-16"></div>
            </div>
        </div>
    );
};

export default VoiceAssistantModal;
