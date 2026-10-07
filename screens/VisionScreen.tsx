import React, { useRef, useEffect, useState } from 'react';
import { Screen, VisionMode } from '../types';
import { ArrowLeft, Zap, Image as ImageIcon, ScanLine, X, Leaf, Sparkles, Crosshair, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface VisionScreenProps {
  navigateTo: (screen: Screen, data?: any) => void;
  t: any;
}

const VisionScreen: React.FC<VisionScreenProps> = ({ navigateTo, t }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [flash, setFlash] = useState(false);
  const [isScanning, setIsScanning] = useState(true);

  // Camera Setup
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setHasPermission(true);
      } catch (err) {
        console.error("Camera Error:", err);
        setHasPermission(false);
      }
    };
    startCamera();
    return () => {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      // Create flash effect
      setIsScanning(false);
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const size = Math.min(video.videoWidth, video.videoHeight);
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, (video.videoWidth - size) / 2, (video.videoHeight - size) / 2, size, size, 0, 0, size, size);
        setTimeout(() => {
          navigateTo('vision-result', { image: canvas.toDataURL('image/jpeg', 0.8), mode: 'diagnosis' });
        }, 500);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          navigateTo('vision-result', { image: ev.target.result as string, mode: 'diagnosis' });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="relative h-[100dvh] bg-black flex flex-col items-center justify-between text-white overflow-hidden font-sans">
      <canvas ref={canvasRef} className="hidden" />
      <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleFileUpload} />

      {/* Video Feed Layer */}
      <div className="absolute inset-0 z-0">
        {hasPermission === false ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center bg-[#020B06]">
            <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center border border-white/10 mb-4">
              <Camera size={32} className="text-white/40" />
            </div>
            <span className="text-gray-400 font-medium">Camera access is restricted.</span>
            <button onClick={() => fileInputRef.current?.click()} className="px-6 py-3 bg-[#00BB78] rounded-2xl text-white font-bold shadow-lg shadow-[#00BB78]/20">
              Upload from Gallery
            </button>
          </div>
        ) : (
          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-105" />
        )}
      </div>

      {/* Overlays */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        {/* Top Gradient */}
        <div className="absolute top-0 w-full h-40 bg-gradient-to-b from-black/80 via-black/40 to-transparent" />
        {/* Bottom Gradient */}
        <div className="absolute bottom-0 w-full h-64 bg-gradient-to-t from-black via-black/80 to-transparent" />
      </div>

      {/* Header UI */}
      <div className="relative z-20 w-full flex justify-between items-start p-5 pt-12 pointer-events-auto">
        <button onClick={() => navigateTo('home')} className="w-12 h-12 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 flex items-center justify-center hover:bg-white/10 active:scale-90 transition-all">
          <ArrowLeft size={22} className="text-white" />
        </button>

        <div className="flex flex-col items-center gap-1.5 mt-1">
          <div className="px-4 py-1.5 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 flex items-center gap-2">
            <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }}>
              <div className="w-2 h-2 rounded-full bg-[#00FF87] shadow-[0_0_10px_#00FF87]" />
            </motion.div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#00FF87]">AI Scanner</span>
          </div>
        </div>

        <button onClick={() => setFlash(!flash)} className={`w-12 h-12 rounded-2xl backdrop-blur-xl border flex items-center justify-center active:scale-90 transition-all ${flash ? 'bg-yellow-400/20 border-yellow-400/50 text-yellow-400' : 'bg-black/40 border-white/10 text-white'}`}>
          <Zap size={20} strokeWidth={2} className={flash ? 'fill-yellow-400' : ''} />
        </button>
      </div>

      {/* Center Targeting Reticle */}
      <div className="relative z-10 flex-1 w-full flex items-center justify-center pointer-events-none">
        {isScanning && (
          <div className="relative w-[280px] h-[280px]">
            {/* Corner brackets */}
            <div className="absolute -top-1 -left-1 w-12 h-12 border-t-4 border-l-4 border-[#00FF87] rounded-tl-3xl opacity-80" />
            <div className="absolute -top-1 -right-1 w-12 h-12 border-t-4 border-r-4 border-[#00FF87] rounded-tr-3xl opacity-80" />
            <div className="absolute -bottom-1 -left-1 w-12 h-12 border-b-4 border-l-4 border-[#00FF87] rounded-bl-3xl opacity-80" />
            <div className="absolute -bottom-1 -right-1 w-12 h-12 border-b-4 border-r-4 border-[#00FF87] rounded-br-3xl opacity-80" />
            
            {/* Scanning Laser */}
            <motion.div 
              animate={{ y: [0, 276, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              className="absolute left-0 right-0 h-1 bg-[#00FF87] shadow-[0_0_20px_#00FF87]"
            />
            
            {/* Center Crosshair */}
            <div className="absolute inset-0 flex items-center justify-center opacity-30">
              <Crosshair size={40} className="text-[#00FF87]" strokeWidth={1} />
            </div>
            
            {/* Scanning Box pulse */}
            <motion.div 
              animate={{ opacity: [0, 0.1, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 bg-[#00FF87]"
            />
          </div>
        )}
      </div>

      {/* Helper Text */}
      <div className="relative z-20 text-center mb-8 pointer-events-none px-6">
        <h2 className="text-xl font-black text-white mb-2 tracking-tight">Scan Crop Disease</h2>
        <p className="text-sm font-medium text-white/60">Position the affected leaf or fruit<br/>within the frame to analyze.</p>
      </div>

      {/* Bottom Controls Panel */}
      <div className="relative z-20 w-full px-8 pb-12 pt-6 flex items-center justify-between">
        
        {/* Upload Button */}
        <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-2 group active:scale-90 transition-transform">
          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white/80 group-hover:bg-white/20">
            <ImageIcon size={24} strokeWidth={1.5} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Upload</span>
        </button>

        {/* Shutter Button with Radar Ripple */}
        <div className="relative flex justify-center items-center">
          <motion.div 
            animate={{ scale: [1, 1.5], opacity: [0.5, 0] }} 
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
            className="absolute w-20 h-20 rounded-full border border-[#00FF87]"
          />
          <motion.div 
            animate={{ scale: [1, 1.8], opacity: [0.3, 0] }} 
            transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', delay: 0.4 }}
            className="absolute w-20 h-20 rounded-full border border-[#00BB78]"
          />
          <button 
            onClick={handleCapture}
            className="relative w-24 h-24 rounded-full border-4 border-white/20 p-1.5 flex items-center justify-center active:scale-90 transition-all bg-black/20 backdrop-blur-xl"
          >
            <div className="w-full h-full rounded-full bg-gradient-to-br from-[#00FF87] to-[#00BB78] flex items-center justify-center shadow-[0_0_40px_rgba(0,255,135,0.4)]">
              <ScanLine size={32} className="text-[#001A11]" />
            </div>
          </button>
        </div>

        {/* Cancel Button */}
        <button onClick={() => navigateTo('home')} className="flex flex-col items-center gap-2 group active:scale-90 transition-transform">
          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white/80 group-hover:bg-[#FF3B30]/20 group-hover:text-[#FF3B30] group-hover:border-[#FF3B30]/50 transition-all">
            <X size={24} strokeWidth={1.5} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Cancel</span>
        </button>

      </div>
      
      {/* Screen Flash Overlay on Capture */}
      <AnimatePresence>
        {!isScanning && (
          <motion.div 
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 bg-white z-50 pointer-events-none"
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default VisionScreen;
