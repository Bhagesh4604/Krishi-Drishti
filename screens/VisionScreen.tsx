import React, { useRef, useEffect, useState } from 'react';
import { Screen, VisionMode } from '../types';
import { ArrowLeft, Zap, Camera as CameraIcon, Image as ImageIcon, ScanLine, X } from 'lucide-react';

interface VisionScreenProps {
  navigateTo: (screen: Screen, data?: any) => void;
  t: any;
}

const VisionScreen: React.FC<VisionScreenProps> = ({ navigateTo, t }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [imageDetails, setImageDetails] = useState<string | null>(null); // To show preview if file uploaded

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
      const video = videoRef.current;
      const canvas = canvasRef.current;
      // Capture square
      const size = Math.min(video.videoWidth, video.videoHeight);
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, (video.videoWidth - size) / 2, (video.videoHeight - size) / 2, size, size, 0, 0, size, size);
        navigateTo('vision-result', { image: canvas.toDataURL('image/jpeg', 0.8), mode: 'diagnosis' });
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
    <div className="relative h-full bg-black flex flex-col items-center justify-between text-white overflow-hidden font-sans">
      <canvas ref={canvasRef} className="hidden" />
      <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleFileUpload} />

      {/* Video Feed Layer */}
      <div className="absolute inset-0 z-0">
        {hasPermission === false ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center bg-gray-900">
            <span className="text-gray-400">Camera permission denied.</span>
            <button onClick={() => fileInputRef.current?.click()} className="text-green-400 font-bold underline">Upload Image</button>
          </div>
        ) : (
          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
        )}
      </div>

      {/* Deep Green Gradient Overlay (Top) */}
      <div className="absolute top-0 left-0 w-full h-1/3 bg-gradient-to-b from-green-950/90 via-green-900/60 to-transparent z-10 pointer-events-none" />

      {/* Custom Scan Overlay (SVG Mask for "Medical Scanner" Look) */}
      <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
        {/* The dark overlay with a "Soft Rect" hole */}
        <svg className="absolute w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <mask id="scan-mask">
              <rect width="100%" height="100%" fill="white" />
              <rect x="15%" y="25%" width="70%" height="45%" rx="40" fill="black" />
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="rgba(10, 40, 20, 0.75)" mask="url(#scan-mask)" />

          {/* Animated Scanner Bar */}
          <rect x="15%" y="25%" width="70%" height="2" fill="#4ade80" className="animate-scan-line opacity-80" />
        </svg>

        {/* Decorative Corners */}
        <div className="w-[70%] h-[45%] border border-white/20 rounded-[42px] absolute pointer-events-none">
          {/* Corners */}
          <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-3xl" />
          <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-3xl" />
          <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-3xl" />
          <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-3xl" />
        </div>

        <div className="absolute top-[20%] text-center">
          <div className="bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20 inline-flex items-center gap-2">
            <ScanLine size={14} className="text-green-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-green-100">AI Plant Doctor</span>
          </div>
        </div>
      </div>

      {/* UI Controls Layer */}
      <div className="relative z-20 w-full flex flex-col h-full justify-between p-6 pt-12">

        {/* Header */}
        <div className="flex justify-between items-center">
          <button onClick={() => navigateTo('home')} className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/20 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <button className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/20 transition-colors">
            <Zap size={20} strokeWidth={1.5} className={hasPermission ? "text-yellow-400 fill-yellow-400/20" : "text-gray-400"} />
          </button>
        </div>

        {/* Bottom Actions */}
        <div className="flex flex-col items-center gap-8 mb-6">
          <p className="text-white/80 text-sm font-medium text-center max-w-[200px] leading-relaxed">
            Scan leaves, fruits, or stems to detect diseases instantly.
          </p>

          <div className="flex items-center justify-center gap-8 w-full px-4">
            {/* Gallery Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="w-12 h-12 rounded-full border border-white/30 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                <ImageIcon size={20} />
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">Upload</span>
            </button>

            {/* Shutter Button */}
            <button
              onClick={handleCapture}
              className="w-20 h-20 rounded-full border-4 border-white/30 p-1 flex items-center justify-center active:scale-95 transition-transform"
            >
              <div className="w-full h-full bg-white rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.4)]">
                <div className="w-14 h-14 bg-green-500 rounded-full border-4 border-white"></div>
              </div>
            </button>

            {/* History / Info Button */}
            <button className="flex flex-col items-center gap-2 group">
              <div className="w-12 h-12 rounded-full border border-white/30 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                <X size={20} />
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">Cancel</span>
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scan-line {
          0% { y: 25%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { y: 70%; opacity: 0; }
        }
        .animate-scan-line {
          animation: scan-line 3s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
      `}</style>
    </div>
  );
};

export default VisionScreen;
