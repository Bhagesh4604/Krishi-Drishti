import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { X, Mic, Loader2, Globe, Sparkles, Keyboard } from 'lucide-react';
import { languages } from '../translations';
import { Language } from '../types';

interface VoiceAssistantModalProps {
    isOpen: boolean;
    onClose: () => void;
    language: Language;
    onSwitchToText?: () => void;
}

const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;

const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({ isOpen, onClose, language, onSwitchToText }) => {
    const [isActive, setIsActive] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [transcriptions, setTranscriptions] = useState<{ role: 'user' | 'model', text: string }[]>([]);
    const [currentInput, setCurrentInput] = useState('');
    const [selectedLang, setSelectedLang] = useState<Language>(language);
    const [showLangMenu, setShowLangMenu] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Visualization State
    const [volume, setVolume] = useState(0);

    const isActiveRef = useRef(false);
    const recognitionRef = useRef<any>(null);
    const audioContextInRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationRef = useRef<number>();
    const mediaStreamRef = useRef<MediaStream | null>(null);

    const speakResponse = (text: string, langCode: string) => {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Try to map our language codes to browser voice languages
        const langMap: Record<string, string> = {
            'en': 'en-IN', 'hi': 'hi-IN', 'kn': 'kn-IN', 'te': 'te-IN', 
            'ta': 'ta-IN', 'mr': 'mr-IN', 'gu': 'gu-IN'
        };
        utterance.lang = langMap[langCode] || 'en-IN';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        
        utterance.onstart = () => {
            // Simulate volume while speaking
            setVolume(0.8);
        };
        
        utterance.onend = () => {
            setVolume(0);
            if (isActiveRef.current && recognitionRef.current) {
                // Resume listening after speaking
                try {
                    recognitionRef.current.start();
                } catch(e) {}
            }
        };

        window.speechSynthesis.speak(utterance);
    };

    const processUserInput = async (text: string) => {
        setIsConnecting(true);
        try {
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
            const ai = new GoogleGenAI({ apiKey });
            const currentLangLabel = languages.find(l => l.code === selectedLang)?.label || 'English';

            setTranscriptions(prev => [...prev, { role: 'user', text }]);
            setCurrentInput('');
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: text,
                config: {
                    systemInstruction: `You are Krishi Drishti AI, an expert AI Agricultural Scientist. Language: ${currentLangLabel}. Provide concise, practical farming advice in exactly 1 or 2 short sentences. Do not use markdown.`
                }
            });

            const reply = response.text || "I'm sorry, I couldn't process that.";
            
            setTranscriptions(prev => [...prev, { role: 'model', text: reply }]);
            speakResponse(reply, selectedLang);

        } catch (err: any) {
            console.error(err);
            setErrorMessage("Failed to connect to AI. Check API Key or internet.");
            setIsActive(false);
            isActiveRef.current = false;
        } finally {
            setIsConnecting(false);
        }
    };

    const startSession = async () => {
        setErrorMessage(null);
        setIsConnecting(true);
        
        try {
            // Setup visualizer mic
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;
            
            audioContextInRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            const analyser = audioContextInRef.current.createAnalyser();
            analyser.fftSize = 256;
            analyserRef.current = analyser;

            const source = audioContextInRef.current.createMediaStreamSource(stream);
            source.connect(analyser);

            const updateVolume = () => {
                if (!analyserRef.current) return;
                const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
                analyserRef.current.getByteFrequencyData(dataArray);
                const avg = dataArray.reduce((p, c) => p + c, 0) / dataArray.length;
                const normalizedParams = Math.min(1, avg / 60);
                
                // If it's synthesizing speech, override volume for visual effect
                if (!window.speechSynthesis.speaking) {
                    setVolume(prev => prev * 0.8 + normalizedParams * 0.2);
                }
                
                animationRef.current = requestAnimationFrame(updateVolume);
            };
            updateVolume();

            // Setup Speech Recognition
            if (SpeechRecognition) {
                const recognition = new SpeechRecognition();
                const langMap: Record<string, string> = {
                    'en': 'en-IN', 'hi': 'hi-IN', 'kn': 'kn-IN', 'te': 'te-IN', 
                    'ta': 'ta-IN', 'mr': 'mr-IN', 'gu': 'gu-IN'
                };
                recognition.lang = langMap[selectedLang] || 'en-IN';
                recognition.continuous = false;
                recognition.interimResults = true;

                recognition.onresult = (event: any) => {
                    const transcript = Array.from(event.results)
                        .map((result: any) => result[0].transcript)
                        .join('');
                    
                    setCurrentInput(transcript);

                    if (event.results[0].isFinal) {
                        recognition.stop();
                        processUserInput(transcript);
                    }
                };

                recognition.onerror = (event: any) => {
                    if (event.error !== 'no-speech' && event.error !== 'aborted') {
                        console.error('Speech recognition error', event.error);
                        setErrorMessage(`Microphone error: ${event.error}`);
                        stopSession();
                    }
                };

                recognition.onend = () => {
                    // Only auto-restart if we are actively listening and NOT currently speaking
                    if (isActiveRef.current && !window.speechSynthesis.speaking && !isConnecting) {
                        try { recognition.start(); } catch(e) {}
                    }
                };

                recognitionRef.current = recognition;
                recognition.start();
                
                setIsActive(true);
                isActiveRef.current = true;
                setIsConnecting(false);
            } else {
                setErrorMessage("Voice Recognition is not supported in your browser. Please try Chrome.");
                setIsConnecting(false);
            }

        } catch (err: any) {
            console.error(err);
            setErrorMessage("Microphone Access Denied. Please check browser permissions.");
            setIsConnecting(false);
        }
    };

    const stopSession = () => {
        setIsActive(false);
        isActiveRef.current = false;
        setIsConnecting(false);
        
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
        }
        if (audioContextInRef.current) {
            audioContextInRef.current.close();
        }
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
        }
        setVolume(0);
        setCurrentInput('');
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
        <div className="absolute inset-0 z-[100] flex flex-col bg-black/95 text-white animate-in fade-in duration-300 rounded-[2.5rem] overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center p-6">
                <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-teal-400" />
                    <span className="text-sm font-bold tracking-widest uppercase text-teal-400">Krishi Drishti AI</span>
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
                {/* Clean Pulsing Visualizer Area */}
                <div className="w-full h-64 relative flex items-center justify-center pointer-events-none">
                    {errorMessage ? (
                        <div className="bg-red-500/20 border border-red-500/50 p-4 rounded-xl text-center max-w-[80%] backdrop-blur-md">
                            <p className="text-red-200 text-sm font-medium">{errorMessage}</p>
                        </div>
                    ) : (
                        <div className="relative flex items-center justify-center">
                            {/* Outer animated rings when active */}
                            {isActive && (
                                <>
                                    <div className="absolute w-40 h-40 bg-teal-500/20 rounded-full animate-ping" style={{ animationDuration: '2s', transform: `scale(${1 + volume})` }} />
                                    <div className="absolute w-48 h-48 bg-emerald-500/10 rounded-full animate-ping" style={{ animationDuration: '3s', animationDelay: '0.5s', transform: `scale(${1 + volume * 1.5})` }} />
                                    <div className="absolute w-56 h-56 border border-teal-500/20 rounded-full animate-spin-slow" style={{ transform: `rotate(${volume * 360}deg)` }} />
                                </>
                            )}
                            
                            {/* Core Orb reacting to volume */}
                            <div className={`w-32 h-32 rounded-full relative flex items-center justify-center transition-all duration-75 ease-out ${isActive ? 'bg-gradient-to-tr from-teal-400 to-emerald-500 shadow-[0_0_40px_rgba(45,212,191,0.6)]' : 'bg-white/5 border-2 border-white/10'}`} style={{ transform: `scale(${isActive ? 1 + volume * 0.4 : 1})` }}>
                                <div className={`absolute inset-0 rounded-full bg-gradient-to-tr from-teal-300 to-emerald-400 blur-md transition-opacity duration-700 ${isActive ? 'opacity-50' : 'opacity-0'}`} />
                                <Mic size={40} className={`relative z-10 transition-colors duration-700 ${isActive ? 'text-white drop-shadow-lg' : 'text-white/30'}`} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Status Text */}
                <p className="mt-8 text-sm font-bold text-teal-200 uppercase tracking-[0.2em] animate-pulse">
                    {isConnecting ? 'Thinking...' : (isActive ? 'Listening...' : 'Paused')}
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
