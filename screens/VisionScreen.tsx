
import React, { useRef, useEffect, useState } from 'react';
import { Screen, VisionMode } from '../types';
import { ArrowLeft, Zap, Info, Camera as CameraIcon, ShieldCheck, Microscope, Search } from 'lucide-react';
import { COLORS } from '../constants';

interface VisionScreenProps {
  navigateTo: (screen: Screen, data?: any) => void;
  t: any;
}

const VisionScreen: React.FC<VisionScreenProps> = ({ navigateTo, t }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [mode, setMode] = useState<VisionMode>('diagnosis');

  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment', width: { ideal: 1080 }, height: { ideal: 1080 } } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setHasPermission(true);
      } catch (err) {
        setHasPermission(false);
      }
    }
    startCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const size = Math.min(video.videoWidth, video.videoHeight);
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(
          video,
          (video.videoWidth - size) / 2,
          (video.videoHeight - size) / 2,
          size, size,
          0, 0, size, size
        );
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        navigateTo('vision-result', { image: imageData, mode });
      }
    }
  };

  return (
    <div className="relative h-full bg-black flex flex-col overflow-hidden">
      <canvas ref={canvasRef} className="hidden" />
      {hasPermission === false ? (
        <div className="flex-1 flex flex-col items-center justify-center text-white p-10 text-center">
          <Info size={48} className="mb-4 text-red-400" />
          <p className="text-lg font-bold">Camera Required</p>
          <p className="text-sm opacity-60 mt-2">Enable camera access to diagnose your crops.</p>
        </div>
      ) : (
        <video ref={videoRef} autoPlay playsInline className="flex-1 w-full h-full object-cover opacity-90" />
      )}

      {/* Mode Selector Overlay */}
      <div className="absolute top-24 left-1/2 -translate-x-1/2 flex bg-black/40 backdrop-blur-xl p-1.5 rounded-2xl border border-white/10 z-20">
        <button 
          onClick={() => setMode('diagnosis')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
            mode === 'diagnosis' ? 'bg-green-600 text-white shadow-lg' : 'text-gray-400'
          }`}
        >
          <Microscope size={14} /> Diagnosis
        </button>
        <button 
          onClick={() => setMode('grading')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
            mode === 'grading' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400'
          }`}
        >
          <ShieldCheck size={14} /> QC
        </button>
        <button 
          onClick={() => setMode('verify-qr')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
            mode === 'verify-qr' ? 'bg-amber-600 text-white shadow-lg' : 'text-gray-400'
          }`}
        >
          <Search size={14} /> Verify QR
        </button>
      </div>

      <div className="absolute inset-0 pointer-events-none">
        <div className="bg-gradient-to-b from-black/70 to-transparent p-6 flex justify-between items-center pointer-events-auto">
          <button onClick={() => navigateTo('home')} className="text-white p-2.5 bg-white/10 backdrop-blur-lg rounded-2xl">
            <ArrowLeft size={24} />
          </button>
          <div className="text-white text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-green-400 mb-0.5">Krishi-Drishti AI</p>
            <p className="text-sm font-semibold">
              {mode === 'verify-qr' ? 'Scan QR for Fraud Check' : mode === 'diagnosis' ? t.align_leaf : 'Align Produce for Grading'}
            </p>
          </div>
          <button className="text-white p-2.5 bg-white/10 backdrop-blur-lg rounded-2xl">
            <Zap size={24} />
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className={`w-72 h-72 border-2 ${
            mode === 'verify-qr' ? 'border-amber-500/30' :
            mode === 'diagnosis' ? 'border-green-500/30' : 'border-blue-500/30'
          } rounded-[40px] relative transition-colors`}>
            <div className={`absolute -top-1 -left-1 w-10 h-10 border-t-4 border-l-4 ${mode === 'verify-qr' ? 'border-amber-500' : mode === 'diagnosis' ? 'border-green-500' : 'border-blue-500'} rounded-tl-[30px]`}></div>
            <div className={`absolute -top-1 -right-1 w-10 h-10 border-t-4 border-r-4 ${mode === 'verify-qr' ? 'border-amber-500' : mode === 'diagnosis' ? 'border-green-500' : 'border-blue-500'} rounded-tr-[30px]`}></div>
            <div className={`absolute -bottom-1 -left-1 w-10 h-10 border-b-4 border-l-4 ${mode === 'verify-qr' ? 'border-amber-500' : mode === 'diagnosis' ? 'border-green-500' : 'border-blue-500'} rounded-bl-[30px]`}></div>
            <div className={`absolute -bottom-1 -right-1 w-10 h-10 border-b-4 border-r-4 ${mode === 'verify-qr' ? 'border-amber-500' : mode === 'diagnosis' ? 'border-green-500' : 'border-blue-500'} rounded-br-[30px]`}></div>
            <div className={`absolute top-0 left-0 w-full h-1 ${mode === 'verify-qr' ? 'bg-amber-400/50 shadow-[0_0_20px_rgba(251,191,36,0.6)]' : mode === 'diagnosis' ? 'bg-green-400/50 shadow-[0_0_20px_rgba(74,222,128,0.6)]' : 'bg-blue-400/50 shadow-[0_0_20px_rgba(59,130,246,0.6)]'} animate-scan-line`}></div>
          </div>
        </div>
      </div>

      <div className="bg-black/90 backdrop-blur-2xl px-10 pt-8 pb-14 flex flex-col items-center gap-6">
        <button 
          onClick={handleCapture}
          className="w-24 h-24 bg-white rounded-full flex items-center justify-center active:scale-90 transition-all p-1.5 shadow-[0_0_40px_rgba(255,255,255,0.2)]"
        >
          <div className="w-full h-full bg-white rounded-full border-[3px] border-black flex items-center justify-center">
             <CameraIcon size={36} className="text-black" />
          </div>
        </button>
      </div>

      <style>{`
        @keyframes scan-line {
          0% { top: 0; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .animate-scan-line {
          animation: scan-line 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
      `}</style>
    </div>
  );
};

export default VisionScreen;
