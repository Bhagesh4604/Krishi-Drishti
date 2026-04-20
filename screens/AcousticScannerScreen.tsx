import React, { useState, useRef } from 'react';
import axios from 'axios';
import { Mic, FileAudio, Loader2, ShieldAlert, ArrowLeft, Activity } from 'lucide-react';
import { aiService } from '../src/services/api';

// Constants
const SERVER_URL = 'http://localhost:8002/analyze-audio';
const RECORDING_DURATION_MS = 10000;

interface AnalysisResult {
    pest_detected: boolean;
    confidence: number;
    pest_type: string;
}

const getPestAdvice = (pestType: string) => {
    switch (pestType) {
        case "Cicada / Leafhopper":
            return "Use yellow sticky traps, apply neem oil (10,000 ppm) at 2ml/L, or introduce natural predators like ladybugs or lacewings.";
        case "Locust / Cricket":
            return "Create physical barriers, use insecticidal soap, or apply organic Neem-based baits around the field borders.";
        case "Beetle / Weevil":
            return "Hand-pick adult beetles, use diatomaceous earth around the base of plants, or apply organic pyrethrin insecticides.";
        case "Grub / Stem Borer":
            return "Apply beneficial nematodes (Steinernema carpocapsae) to the soil, remove and destroy infected stems immediately.";
        case "Unidentified Pest":
        default:
            return "Monitor crops closely. Capture an image for visual AI diagnosis using the Vision Scanner, or consult a local expert.";
    }
};

const AcousticScannerScreen: React.FC<{ navigation?: { goBack: () => void } }> = ({ navigation }) => {
    const [isRecording, setIsRecording] = useState<boolean>(false);
    const [timeLeft, setTimeLeft] = useState<number>(10);
    const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [dynamicAdvice, setDynamicAdvice] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerIntervalRef = useRef<number | null>(null);
    const stopTimeoutRef = useRef<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const pickDocument = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            await analyzeAudioFile(file, file.name);
        }
        // Reset input so the same file could be selected again if needed
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const startRecording = async () => {
        setErrorMsg(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                // Convert blob to a File object
                const audioFile = new File([audioBlob], 'acoustic_signature.webm', { type: 'audio/webm' });
                await analyzeAudioFile(audioFile, 'acoustic_signature.webm');

                // Stop all tracks to release microphone
                stream.getTracks().forEach((track) => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setTimeLeft(10);
            setResult(null);

            // Timer countdown
            timerIntervalRef.current = window.setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            // Automatically stop after 10 seconds
            stopTimeoutRef.current = window.setTimeout(() => {
                stopRecording();
            }, RECORDING_DURATION_MS);

        } catch (err) {
            console.error('Failed to start recording', err);
            setErrorMsg("Microphone access is needed for acoustic scanning.");
            setIsRecording(false);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current);
        setIsRecording(false);
    };

    const analyzeAudioFile = async (file: File, filename: string) => {
        setIsAnalyzing(true);
        setResult(null);
        setErrorMsg(null);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await axios.post<AnalysisResult>(SERVER_URL, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            setResult(response.data);
            
            // Trigger dynamic real AI analysis if a pest is actually detected
            if (response.data.pest_detected) {
                setDynamicAdvice("Consulting Krishi AI Agronomist on this pattern...");
                try {
                    const aiChat = await aiService.chat(
                        `Bioacoustic scanner detected ${response.data.pest_type} pest frequency patterns in my crop. Provide 1 specific, highly-actionable organic recommended action right now in English.`
                    );
                    setDynamicAdvice(aiChat.response);
                } catch (e) {
                    setDynamicAdvice(getPestAdvice(response.data.pest_type));
                }
            } else {
                setDynamicAdvice(null);
            }

        } catch (error: any) {
            console.error("Error analyzing audio:", error);
            setErrorMsg(error.response?.data?.detail || "Could not connect to the bioacoustic server.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="min-h-full bg-gray-50 flex flex-col pt-0 pb-32 font-sans relative">
            {/* Structured Premium Header */}
            <div className="bg-white p-6 pt-12 pb-6 shadow-sm border-b border-gray-100 sticky top-0 z-20 flex items-center justify-between rounded-b-[2rem]">
                <button
                    onClick={() => navigation?.goBack()}
                    className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-700 active:scale-95 transition-transform"
                >
                    <ArrowLeft size={20} />
                </button>
                <div className="text-center flex-1">
                    <h2 className="text-xl font-black text-gray-900 tracking-tight">Acoustic Scanner</h2>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mt-0.5">Bioacoustic AI</p>
                </div>
                <div className="w-10"></div> {/* Spacer for centering */}
            </div>

            <div className="p-6 flex flex-col items-center">
                {/* Hero Section */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50/30 p-8 rounded-[2rem] border border-green-100/50 w-full max-w-sm mb-8 relative overflow-hidden flex flex-col items-center text-center">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-green-200 rounded-full blur-3xl opacity-30 -mr-10 -mt-10"></div>
                    <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-green-100 flex items-center justify-center mb-4 text-green-700">
                        <Activity size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Detect Pests from Sound</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                        Clip a contact microphone to the plant stem, or upload a pre-recorded audio file to listen for hidden borer insects.
                    </p>
                </div>

                {errorMsg && (
                    <div className="bg-red-50 text-red-700 p-4 rounded-xl mb-6 text-center shadow-sm w-full max-w-sm">
                        {errorMsg}
                    </div>
                )}

                {/* Status / Actions Area */}
                {isRecording ? (
                    <div className="flex flex-col items-center justify-center p-8 bg-white rounded-[2rem] shadow-sm border border-gray-100 w-full max-w-sm">
                        <div className="relative w-32 h-32 flex items-center justify-center mb-6">
                            {/* Pulsing rings */}
                            <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping" style={{ animationDuration: '2s' }}></div>
                            <div className="absolute inset-2 bg-red-500/30 rounded-full animate-ping" style={{ animationDuration: '2.5s' }}></div>
                            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center shadow-inner z-10">
                                <Mic size={32} />
                            </div>
                        </div>
                        <div className="text-3xl font-black text-gray-900 mb-2 font-mono tracking-tighter">
                            00:{timeLeft.toString().padStart(2, '0')}
                        </div>
                        <p className="text-sm font-semibold text-red-500 animate-pulse uppercase tracking-widest mb-8">Recording...</p>

                        <button
                            onClick={stopRecording}
                            className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold max-w-xs shadow-lg shadow-gray-200 active:scale-95 transition-transform"
                        >
                            Stop & Analyze
                        </button>
                    </div>
                ) : isAnalyzing ? (
                    <div className="flex flex-col items-center justify-center p-12 bg-white rounded-[2rem] shadow-sm border border-gray-100 w-full max-w-sm">
                        <Loader2 size={40} className="text-green-600 animate-spin mb-6" />
                        <div className="text-lg font-bold text-gray-900">Processing Signature</div>
                        <p className="text-sm text-gray-500 mt-2 text-center">Isolating frequencies and comparing with pest acoustic models...</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4 w-full max-w-sm">
                        <button
                            onClick={startRecording}
                            className="bg-green-700 hover:bg-green-800 text-white py-5 rounded-[2rem] shadow-xl shadow-green-700/20 flex items-center justify-center gap-3 font-bold text-lg transition-transform active:scale-95 relative overflow-hidden"
                        >
                            <Mic size={24} />
                            Start Active Scan
                        </button>

                        <button
                            onClick={pickDocument}
                            className="bg-white border-2 border-gray-100 text-gray-700 py-5 rounded-[2rem] shadow-sm hover:bg-gray-50 flex items-center justify-center gap-3 font-bold transition-transform active:scale-95"
                        >
                            <FileAudio size={22} className="text-gray-400" />
                            Upload Reference Audio
                        </button>
                        <input
                            type="file"
                            accept="audio/*"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                        />
                    </div>
                )}

                {result && (
                    <div className="mt-8 w-full max-w-sm flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4">
                        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
                            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Analysis Result</h2>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl">
                                    <span className="font-semibold text-gray-600">Signal Detection</span>
                                    <span className={`font-black px-4 py-1.5 rounded-full text-xs tracking-wider ${result.pest_detected ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                        {result.pest_detected ? "POSITIVE" : "CLEAR"}
                                    </span>
                                </div>

                                {result.pest_detected && (
                                    <div className="flex justify-between items-center px-2">
                                        <span className="font-semibold text-gray-500">Pest Signature</span>
                                        <span className="text-gray-900 font-bold">{result.pest_type}</span>
                                    </div>
                                )}

                                <div className="flex justify-between items-center px-2 pb-2">
                                    <span className="font-semibold text-gray-500">AI Confidence</span>
                                    <span className="text-gray-900 font-bold">{(result.confidence * 100).toFixed(1)}%</span>
                                </div>
                            </div>
                        </div>

                        {result.pest_detected && (
                            <div className="bg-amber-50 p-6 rounded-[2rem] shadow-sm border border-amber-200/60 mb-6 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-200 rounded-full blur-2xl opacity-20 -mr-8 -mt-8"></div>
                                <h3 className="text-base font-bold text-amber-900 mb-3 flex items-center gap-2">
                                    <ShieldAlert size={18} className="text-amber-600" />
                                    Recommended Action
                                </h3>
                                <p className="text-amber-800 text-sm leading-relaxed font-medium">
                                    {dynamicAdvice === "Consulting Krishi AI Agronomist on this pattern..." ? (
                                        <span className="flex items-center gap-2">
                                            <Loader2 size={14} className="animate-spin inline" />
                                            {dynamicAdvice}
                                        </span>
                                    ) : (
                                        dynamicAdvice || getPestAdvice(result.pest_type)
                                    )}
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AcousticScannerScreen;
