import React, { useState, useEffect } from 'react';
import { Screen, Language, VisionMode } from '../types';
import {
  ArrowLeft,
  Leaf,
  ShieldCheck,
  Droplets,
  Share2,
  ChevronDown,
  ThermometerSun,
  Calendar
} from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { aiService } from '../src/services/api';

interface VisionResultScreenProps {
  navigateTo: (screen: Screen) => void;
  image: string | null;
  mode: VisionMode;
  language: Language;
  t: any;
}

const VisionResultScreen: React.FC<VisionResultScreenProps> = ({ navigateTo, image, mode, language, t }) => {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<any>(null);

  // Helper to convert DataURI to Blob
  const dataURItoBlob = (dataURI: string) => {
    const byteString = atob(dataURI.split(',')[1]);
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
  };

  useEffect(() => {
    const analyzeImage = async () => {
      if (!image) return;

      try {
        setLoading(true);
        // Convert to file
        const blob = dataURItoBlob(image);
        const file = new File([blob], "scan.jpg", { type: "image/jpeg" });

        // Call API
        const data = await aiService.diagnose(file, mode);
        setResult(data);
      } catch (e) {
        console.error("Analysis Failed", e);
        // Fallback or Error state
        setResult({
          diagnosis: "Error Analyzing",
          confidence: 0,
          summary: "Could not connect to AI server.",
          healthScore: 0,
          remedies: []
        });
      } finally {
        setLoading(false);
      }
    };

    analyzeImage();
  }, [image, mode]);

  return (
    <div className="h-full bg-white font-sans relative overflow-y-auto">

      {/* 1. Image Header Section */}
      <div className="relative h-1/2 w-full bg-black rounded-b-[3rem] overflow-hidden shadow-2xl z-0">
        {image && <img src={image} className="w-full h-full object-cover opacity-90" alt="Scanned" />}

        {/* Header Controls */}
        <div className="absolute top-0 left-0 w-full p-6 pt-12 flex justify-between items-center z-10">
          <button
            onClick={() => navigateTo('vision')}
            className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="px-3 py-1 bg-black/40 backdrop-blur-md rounded-full border border-white/10 text-white/80 text-[10px] font-bold uppercase tracking-widest">
            AI Analysis
          </div>
        </div>

        {/* Scanning Overlay (during loading) */}
        {loading && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-20">
            <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-green-400 font-bold tracking-widest text-xs uppercase animate-pulse">Analyzing Plant structure...</p>
          </div>
        )}
      </div>

      {/* 2. Content Card (Overlapping) */}
      {!loading && (
        <div className="relative z-10 -mt-20 px-6 pb-12 w-full animate-in slide-in-from-bottom duration-700">

          {/* Result Summary Card */}
          <div className="bg-white rounded-[2rem] p-6 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] border border-gray-100 mb-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Issue Detected</span>
                </div>
                <h1 className="text-3xl font-black text-gray-800 leading-tight mb-1">{result?.diagnosis}</h1>
                <p className="text-sm font-medium text-gray-400 max-w-[200px]">{result?.summary}</p>
              </div>
              <div className="relative w-16 h-16">
                {/* Circular Progress (CSS only for demo) */}
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="32" cy="32" r="28" stroke="#f3f4f6" strokeWidth="4" fill="transparent" />
                  <circle cx="32" cy="32" r="28" stroke="#ef4444" strokeWidth="4" fill="transparent" strokeDasharray="175.9" strokeDashoffset={175.9 * (1 - (result?.confidence || 0) / 100)} className="transition-all duration-1000 ease-out" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-black text-gray-800">{result?.confidence}%</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-4">
              <div className="bg-green-50 rounded-xl p-3 flex flex-col items-center gap-1">
                <ShieldCheck size={18} className="text-green-600" />
                <span className="text-[10px] font-bold text-gray-500 uppercase">Health</span>
                <span className="text-sm font-black text-green-700">{result?.healthScore}%</span>
              </div>
              <div className="bg-blue-50 rounded-xl p-3 flex flex-col items-center gap-1">
                <Droplets size={18} className="text-blue-500" />
                <span className="text-[10px] font-bold text-gray-500 uppercase">Water</span>
                <span className="text-sm font-black text-blue-700">Normal</span>
              </div>
              <div className="bg-orange-50 rounded-xl p-3 flex flex-col items-center gap-1">
                <ThermometerSun size={18} className="text-orange-500" />
                <span className="text-[10px] font-bold text-gray-500 uppercase">Temp</span>
                <span className="text-sm font-black text-orange-700">High</span>
              </div>
            </div>
          </div>

          {/* Instant Solutions Header */}
          <div className="flex justify-between items-center mb-4 px-2">
            <h2 className="text-lg font-black text-gray-800">Instant Solutions</h2>
            <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg">2 Steps</span>
          </div>

          {/* Remedies List */}
          <div className="space-y-4">
            {result?.remedies.map((remedy: any, idx: number) => (
              <div key={idx} className="bg-white p-5 rounded-[1.5rem] shadow-sm border border-gray-100 flex gap-4 active:scale-98 transition-transform">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${remedy.type === 'organic' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                  <Leaf size={24} fill="currentColor" className="opacity-80" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-gray-800 mb-1">{remedy.title}</h3>
                  <p className="text-xs text-gray-500 font-medium leading-relaxed">{remedy.desc}</p>
                </div>
                <div className="flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center">
                    <ChevronDown size={14} className="text-gray-400" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Complete Action Button */}
          <button
            onClick={() => navigateTo('home')}
            className="w-full mt-8 bg-gray-900 text-white rounded-2xl py-5 font-bold text-sm shadow-xl active:scale-95 transition-transform flex items-center justify-center gap-2"
          >
            <Leaf size={16} /> Save to My Fields
          </button>

        </div>
      )}
    </div>
  );
};

export default VisionResultScreen;
