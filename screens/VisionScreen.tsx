
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [mode, setMode] = useState<VisionMode>('diagnosis');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const requestCameraPermission = async () => {
    // Check if browser supports camera API
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setHasPermission(false);
      setErrorMessage('Your browser does not support camera access. Please use Chrome, Firefox, or Safari on HTTPS/localhost.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1080 }, height: { ideal: 1080 } }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setHasPermission(true);
      setErrorMessage('');
    } catch (err: any) {
      setHasPermission(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage('Camera access denied. Please enable camera permissions in your browser settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorMessage('No camera detected on this device.');
      } else if (err.name === 'NotReadableError') {
        setErrorMessage('Camera is already in use by another application.');
      } else if (err.name === 'NotSupportedError') {
        setErrorMessage('Camera access requires HTTPS or localhost.');
      } else {
        setErrorMessage(`Camera error: ${err.message || 'Unknown error'}`);
      }
      console.error('Camera permission error:', err);
    }
  };

  useEffect(() => {
    requestCameraPermission();

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

  const handleGalleryUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = e.target?.result as string;
        navigateTo('vision-result', { image: imageData, mode });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="relative h-full bg-black flex flex-col overflow-hidden">
      <canvas ref={canvasRef} className="hidden" />
      {hasPermission === false ? (
        <div className="flex-1 flex flex-col items-center justify-center text-white p-10 text-center">
          <Info size={48} className="mb-4 text-red-400" />
          <p className="text-lg font-bold mb-2">Camera Access Required</p>
          <p className="text-sm opacity-80 mt-2 mb-6 max-w-xs leading-relaxed">
            {errorMessage || 'Enable camera access to diagnose your crops.'}
          </p>
          <button
            onClick={requestCameraPermission}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-sm flex items-center gap-2"
          >
            <CameraIcon size={18} /> Grant Camera Access
          </button>
          <p className="text-xs opacity-40 mt-4">
            Tap the button above and allow camera permissions when prompted
          </p>
        </div>
      ) : (
        <video ref={videoRef} autoPlay playsInline className="flex-1 w-full h-full object-cover opacity-90" />
      )}

      {/* Mode Selector Overlay */}
      <div className="absolute top-24 left-1/2 -translate-x-1/2 flex bg-black/40 backdrop-blur-xl p-1.5 rounded-2xl border border-white/10 z-20">
        <button
          onClick={() => setMode('diagnosis')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${mode === 'diagnosis' ? 'bg-green-600 text-white shadow-lg' : 'text-gray-400'
            }`}
        >
          <Microscope size={14} /> Diagnosis
        </button>
        <button
          onClick={() => setMode('grading')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${mode === 'grading' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400'
            }`}
        >
          <ShieldCheck size={14} /> QC
        </button>
        <button
          onClick={() => setMode('verify-qr')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${mode === 'verify-qr' ? 'bg-amber-600 text-white shadow-lg' : 'text-gray-400'
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
          <div className={`w-72 h-72 border-2 ${mode === 'verify-qr' ? 'border-amber-500/30' :
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
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleGalleryUpload}
          className="hidden"
        />

        <div className="flex items-center gap-6">
          {/* Gallery Upload Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-16 h-16 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center active:scale-90 transition-all border-2 border-white/40"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </button>

          {/* Camera Capture Button */}
          <button
            onClick={handleCapture}
            className="w-24 h-24 bg-white rounded-full flex items-center justify-center active:scale-90 transition-all p-1.5 shadow-[0_0_40px_rgba(255,255,255,0.2)]"
          >
            <div className="w-full h-full bg-white rounded-full border-[3px] border-black flex items-center justify-center">
              <CameraIcon size={36} className="text-black" />
            </div>
          </button>
        </div>

        <p className="text-xs text-white/60 font-medium">Tap camera or choose from gallery</p>
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
