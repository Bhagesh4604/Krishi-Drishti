import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Globe, Keyboard, Mic, Sparkles, Square, WifiOff, X } from 'lucide-react';
import { languages } from '../translations';
import { Language } from '../types';

interface VoiceAssistantModalProps {
    isOpen: boolean;
    onClose: () => void;
    language: Language;
    onSwitchToText?: () => void;
}

const languageCodes: Record<string, string> = {
    en: 'en-IN', hi: 'hi-IN', kn: 'kn-IN', te: 'te-IN',
    ta: 'ta-IN', mr: 'mr-IN', gu: 'gu-IN',
};

const getGeminiApiKey = () => import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';

const blobToBase64 = async (blob: Blob) => {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = '';
    const chunkSize = 0x8000;
    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
    }
    return btoa(binary);
};

const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({ isOpen, onClose, language, onSwitchToText }) => {
    const [isActive, setIsActive] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [transcriptions, setTranscriptions] = useState<{ role: 'user' | 'model'; text: string }[]>([]);
    const [currentInput, setCurrentInput] = useState('');
    const [selectedLang, setSelectedLang] = useState<Language>(language);
    const [showLangMenu, setShowLangMenu] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [volume, setVolume] = useState(0);

    const isActiveRef = useRef(false);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const audioContextInRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationRef = useRef<number>();
    const mediaStreamRef = useRef<MediaStream | null>(null);

    const speakResponse = (text: string, langCode: string) => {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = languageCodes[langCode] || 'en-IN';
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.onstart = () => setVolume(0.7);
        utterance.onend = () => setVolume(0);
        window.speechSynthesis.speak(utterance);
    };

    const processUserInput = async (text: string) => {
        setIsConnecting(true);
        try {
            const apiKey = getGeminiApiKey();
            if (!apiKey) throw new Error('Gemini API key is not configured.');
            const ai = new GoogleGenAI({ apiKey });
            const currentLangLabel = languages.find(l => l.code === selectedLang)?.label || 'English';

            setTranscriptions(prev => [...prev, { role: 'user', text }]);
            setCurrentInput('');

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: text,
                config: {
                    systemInstruction: `You are Krishi Drishti AI, an expert AI Agricultural Scientist. Language: ${currentLangLabel}. Provide concise, practical farming advice in exactly 1 or 2 short sentences. Do not use markdown.`,
                },
            });

            const reply = response.text || "I'm sorry, I couldn't process that.";
            setTranscriptions(prev => [...prev, { role: 'model', text: reply }]);
            speakResponse(reply, selectedLang);
        } catch (err: any) {
            console.error(err);
            setErrorMessage(err?.message?.includes('API key')
                ? 'Voice AI is not configured yet. Use text chat for now.'
                : 'Could not connect to Voice AI. Check your connection and try again.');
        } finally {
            setIsConnecting(false);
        }
    };

    const releaseAudioResources = () => {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
        animationRef.current = undefined;
        analyserRef.current = null;
        mediaStreamRef.current?.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
        if (audioContextInRef.current) {
            void audioContextInRef.current.close().catch(() => undefined);
            audioContextInRef.current = null;
        }
        setVolume(0);
    };

    const transcribeRecording = async (audio: Blob) => {
        setIsConnecting(true);
        setErrorMessage(null);
        try {
            const apiKey = getGeminiApiKey();
            if (!apiKey) {
                setErrorMessage('Voice AI is not configured yet. Use text chat for now.');
                return;
            }
            if (audio.size > 18 * 1024 * 1024) {
                setErrorMessage('That recording is too long. Please record a shorter question.');
                return;
            }

            const ai = new GoogleGenAI({ apiKey });
            const audioData = await blobToBase64(audio);
            const mimeType = audio.type.split(';')[0] || 'audio/webm';
            const currentLangLabel = languages.find(l => l.code === selectedLang)?.label || 'English';
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [
                    { inlineData: { mimeType, data: audioData } },
                    `Transcribe only the spoken words in this audio. The speaker is using ${currentLangLabel}. Return only the transcription, without labels or commentary. If there is no intelligible speech, return an empty response.`,
                ],
            });
            const transcript = (response.text || '').trim().replace(/^['"“”]+|['"“”]+$/g, '');
            if (!transcript) {
                setErrorMessage('I could not hear a clear question. Tap the microphone and try again.');
                return;
            }
            await processUserInput(transcript);
        } catch (err) {
            console.error(err);
            setErrorMessage('Could not process the recording. Check your connection and try again.');
        } finally {
            setIsConnecting(false);
        }
    };

    const stopSession = () => {
        setIsActive(false);
        isActiveRef.current = false;
        setIsConnecting(false);
        const recorder = recorderRef.current;
        recorderRef.current = null;
        if (recorder && recorder.state !== 'inactive') {
            recorder.ondataavailable = null;
            recorder.onstop = null;
            try { recorder.stop(); } catch { /* already stopped */ }
        }
        audioChunksRef.current = [];
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        releaseAudioResources();
        setCurrentInput('');
    };

    const startSession = async () => {
        if (isActiveRef.current || isConnecting) return;
        setErrorMessage(null);
        setCurrentInput('');

        if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
            setErrorMessage('Voice recording is not supported here. Use text chat or open the app in a supported browser.');
            return;
        }

        setIsConnecting(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            });
            mediaStreamRef.current = stream;

            const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContextCtor) {
                audioContextInRef.current = new AudioContextCtor();
                await audioContextInRef.current.resume();
                const analyser = audioContextInRef.current.createAnalyser();
                analyser.fftSize = 256;
                analyserRef.current = analyser;
                audioContextInRef.current.createMediaStreamSource(stream).connect(analyser);

                const updateVolume = () => {
                    if (!analyserRef.current) return;
                    const data = new Uint8Array(analyserRef.current.frequencyBinCount);
                    analyserRef.current.getByteFrequencyData(data);
                    const average = data.reduce((sum, value) => sum + value, 0) / data.length;
                    setVolume(previous => previous * 0.8 + Math.min(1, average / 60) * 0.2);
                    animationRef.current = requestAnimationFrame(updateVolume);
                };
                updateVolume();
            }

            const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus']
                .find(type => MediaRecorder.isTypeSupported(type));
            const recorder = mimeType
                ? new MediaRecorder(stream, { mimeType })
                : new MediaRecorder(stream);
            audioChunksRef.current = [];
            recorder.ondataavailable = event => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };
            recorder.onstop = () => {
                const chunks = audioChunksRef.current;
                audioChunksRef.current = [];
                const recording = new Blob(chunks, { type: recorder.mimeType || chunks[0]?.type || 'audio/webm' });
                releaseAudioResources();
                recorderRef.current = null;
                if (recording.size < 1000) {
                    setIsConnecting(false);
                    setErrorMessage('I could not hear a clear question. Tap the microphone and try again.');
                    return;
                }
                void transcribeRecording(recording);
            };
            recorderRef.current = recorder;
            recorder.start(250);
            isActiveRef.current = true;
            setIsActive(true);
        } catch (err: any) {
            console.error(err);
            releaseAudioResources();
            setErrorMessage(err?.name === 'NotAllowedError' || err?.name === 'SecurityError'
                ? 'Microphone permission is blocked. Allow microphone access, then try again.'
                : err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError'
                    ? 'No microphone was detected. Check your audio device and try again.'
                    : 'Could not start the microphone. Check microphone access and try again.');
        } finally {
            setIsConnecting(false);
        }
    };

    const finishRecording = () => {
        const recorder = recorderRef.current;
        if (!recorder || recorder.state === 'inactive') return;
        isActiveRef.current = false;
        setIsActive(false);
        setIsConnecting(true);
        try { recorder.stop(); } catch { setIsConnecting(false); }
    };

    useEffect(() => {
        if (!isOpen) stopSession();
        return () => stopSession();
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Krishi Drishti voice assistant"
            className="absolute inset-0 z-[100] flex min-h-0 flex-col overflow-hidden rounded-none text-white animate-in fade-in duration-200 sm:rounded-[2.5rem]"
            style={{ background: 'radial-gradient(ellipse at 50% 38%, rgba(0,187,120,0.08), transparent 46%), #05120B' }}
        >
            <header className="shrink-0 flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-4 sm:px-6 sm:py-5">
                <div className="flex items-center gap-2">
                    <Sparkles size={17} className="text-teal-400" />
                    <span className="text-sm font-bold tracking-[0.14em] uppercase text-teal-300">Krishi Drishti AI</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <button
                            type="button"
                            aria-label="Choose voice language"
                            aria-expanded={showLangMenu}
                            onClick={() => setShowLangMenu(value => !value)}
                            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-semibold transition-colors hover:bg-white/10"
                        >
                            <Globe size={14} />
                            {languages.find(l => l.code === selectedLang)?.native || 'English'}
                        </button>
                        {showLangMenu && (
                            <div className="absolute right-0 top-full z-50 mt-2 max-h-64 w-52 overflow-y-auto rounded-2xl border border-white/10 bg-[#102017] p-1 shadow-2xl">
                                {languages.map(lang => (
                                    <button
                                        key={lang.code}
                                        type="button"
                                        onClick={() => { setSelectedLang(lang.code as Language); setShowLangMenu(false); }}
                                        className={`w-full rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition-colors hover:bg-white/[0.06] ${selectedLang === lang.code ? 'text-teal-300' : 'text-white/65'}`}
                                    >
                                        {lang.native} <span className="text-white/40">({lang.label})</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close voice assistant"
                        className="rounded-full bg-white/[0.07] p-2.5 transition-colors hover:bg-white/15"
                    >
                        <X size={18} />
                    </button>
                </div>
            </header>

            <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
                <div className="flex w-full items-center justify-center">
                    {errorMessage ? (
                        <div role="alert" className="w-full max-w-sm rounded-2xl border border-rose-300/20 bg-rose-400/[0.08] p-4 shadow-xl shadow-black/10">
                            <div className="flex items-start gap-3">
                                <span className="mt-0.5 rounded-xl bg-rose-300/10 p-2.5 text-rose-200">
                                    <WifiOff size={17} />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-bold text-rose-100">Voice is temporarily unavailable</p>
                                    <p className="mt-1 text-xs leading-relaxed text-rose-100/70">{errorMessage}</p>
                                    <button type="button" onClick={startSession} className="mt-3 rounded-xl border border-white/10 bg-white/[0.07] px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-white/10">
                                        Try again
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="relative flex h-40 w-full items-center justify-center">
                            {isActive && <>
                                <div className="absolute h-40 w-40 rounded-full bg-teal-500/15 animate-ping" style={{ animationDuration: '2s', transform: `scale(${1 + volume})` }} />
                                <div className="absolute h-48 w-48 rounded-full border border-teal-400/15 animate-spin-slow" style={{ transform: `rotate(${volume * 360}deg)` }} />
                            </>}
                            <div className={`relative flex h-28 w-28 items-center justify-center rounded-full transition-all duration-100 ${isActive ? 'bg-gradient-to-tr from-teal-400 to-emerald-500 shadow-[0_0_42px_rgba(45,212,191,0.35)]' : 'border border-white/10 bg-white/[0.04]'}`} style={{ transform: `scale(${isActive ? 1 + volume * 0.24 : 1})` }}>
                                <div className={`absolute inset-0 rounded-full bg-gradient-to-tr from-teal-300 to-emerald-400 blur-md transition-opacity ${isActive ? 'opacity-35' : 'opacity-0'}`} />
                                <Mic size={34} className={`relative z-10 ${isActive ? 'text-white' : 'text-white/35'}`} />
                            </div>
                        </div>
                    )}
                </div>

                <p className="text-center text-xs font-bold uppercase tracking-[0.16em] text-teal-200">
                    {isConnecting ? 'Processing your question' : isActive ? 'Listening' : errorMessage ? 'Ready when you are' : 'Ask Krishi Drishti'}
                </p>
                <p className="max-w-sm text-center text-[11px] leading-relaxed text-white/45">
                    {isActive ? 'Speak naturally, then tap the microphone to send.' : 'Tap the microphone to speak about crops, weather, or markets.'}
                </p>

                {(transcriptions.length > 0 || currentInput) && (
                    <div className="w-full max-w-sm space-y-2 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3 text-center">
                        {transcriptions.slice(-2).map((item, index) => (
                            <p key={`${item.role}-${index}`} className={`text-sm leading-relaxed ${item.role === 'model' ? 'text-white' : 'text-white/50'}`}>
                                {item.text}
                            </p>
                        ))}
                        {currentInput && <p className="text-sm text-teal-100/70">{currentInput}</p>}
                    </div>
                )}
            </main>

            <footer className="shrink-0 px-5 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] pt-3 sm:px-6">
                <div className="mx-auto flex max-w-sm items-center gap-3 rounded-[26px] border border-white/[0.07] bg-white/[0.035] p-3 shadow-2xl shadow-black/15">
                    <button
                        type="button"
                        onClick={onSwitchToText}
                        aria-label="Switch to text chat"
                        className="flex h-14 flex-1 items-center justify-center gap-2.5 rounded-2xl border border-white/[0.06] bg-white/[0.04] px-3 text-white/80 transition-colors hover:bg-white/[0.08] active:scale-[0.98]"
                    >
                        <Keyboard size={19} className="text-teal-300" />
                        <span className="text-sm font-semibold">Type a question</span>
                    </button>
                    <button
                        type="button"
                        onClick={isActive ? finishRecording : startSession}
                        disabled={isConnecting}
                        aria-label={isActive ? 'Finish recording and send' : 'Start voice recording'}
                        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl transition-all active:scale-95 disabled:cursor-wait disabled:opacity-60 ${isActive ? 'bg-rose-500 text-white shadow-lg shadow-rose-950/30' : 'bg-gradient-to-br from-emerald-400 to-teal-500 text-[#032014] shadow-lg shadow-emerald-950/30'}`}
                    >
                        {isConnecting ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : isActive ? <Square size={19} fill="currentColor" /> : <Mic size={22} />}
                    </button>
                </div>
                <p className="mt-2 text-center text-[10px] font-medium text-white/35">
                    {isConnecting ? 'One moment…' : isActive ? 'Tap the square to send your recording' : 'Your microphone starts only when you tap'}
                </p>
            </footer>
        </div>
    );
};

export default VoiceAssistantModal;
