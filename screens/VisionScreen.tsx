import React, { useRef, useEffect, useState } from 'react';
import { Screen, VisionMode } from '../types';
import { ArrowLeft, Zap, Image as ImageIcon, ScanLine, X, Leaf, Sparkles, Crosshair, Camera, AlertCircle, RefreshCw, Loader2, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCameraFSM } from '../src/hooks/useCameraFSM';

interface VisionScreenProps {
  navigateTo: (screen: Screen, data?: any) => void;
  t: any;
}

const VisionScreen: React.FC<VisionScreenProps> = ({ navigateTo, t }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [flash, setFlash] = useState(false);
  const [isScanning, setIsScanning] = useState(true);
  const [cropType, setCropType] = useState('');
  const [growthStage, setGrowthStage] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [detailsOpen, setDetailsOpen] = useState(false);

  // ── Camera Permission & Hardware Finite State Machine (FSM) ───────────────
  // Strict states: IDLE -> REQUESTING_PERMISSION -> GRANTED -> INITIALIZING_HARDWARE -> Active (or DENIED)
  const { fsmState, stream, error, retry } = useCameraFSM(true);

  // Bind media stream to video element when hardware initializes
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(e => console.warn('[VisionScreen] Video play error:', e));
    }
  }, [stream]);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      setIsScanning(false);
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const size = Math.min(video.videoWidth || 640, video.videoHeight || 640);
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(
          video,
          (video.videoWidth - size) / 2,
          (video.videoHeight - size) / 2,
          size,
          size,
          0,
          0,
          size,
          size
        );
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setTimeout(() => {
          navigateTo('vision-result', { image: dataUrl, mode: 'diagnosis', cropType, growthStage, symptoms });
        }, 300);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          navigateTo('vision-result', { image: ev.target.result as string, mode: 'diagnosis', cropType, growthStage, symptoms });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="relative h-[100dvh] bg-black flex flex-col items-center justify-between text-white overflow-hidden font-sans">
      <canvas ref={canvasRef} className="hidden" />
      <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleFileUpload} />

      {/* Video Feed & State Layers */}
      <div className="absolute inset-0 z-0">
        {fsmState === 'REQUESTING_PERMISSION' && (
          <div className="flex flex-col items-center justify-center h-full gap-5 p-8 text-center bg-[#020B06]">
            <div className="relative w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center border border-white/10">
              <Loader2 size={36} className="text-[#00FF87] animate-spin" />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg mb-1">Requesting Camera Permission</h3>
              <p className="text-gray-400 text-sm max-w-xs">Please allow camera access in the prompt to scan your crops for disease.</p>
            </div>
          </div>
        )}

        {fsmState === 'INITIALIZING_HARDWARE' && (
          <div className="flex flex-col items-center justify-center h-full gap-5 p-8 text-center bg-[#020B06]">
            <div className="relative w-20 h-20 rounded-3xl bg-emerald-950/40 flex items-center justify-center border border-[#00FF87]/30">
              <div className="w-10 h-10 rounded-full border-2 border-t-transparent border-[#00FF87] animate-spin" />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg mb-1">Starting Camera Sensor</h3>
              <p className="text-gray-400 text-sm max-w-xs">Initializing video stream and autofocus...</p>
            </div>
          </div>
        )}

        {fsmState === 'DENIED' && (
          <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center bg-[#020B06]">
            <div className="w-20 h-20 rounded-3xl bg-red-950/30 flex items-center justify-center border border-red-500/20 mb-2">
              <AlertCircle size={36} className="text-red-400" />
            </div>
            <h3 className="text-white font-bold text-lg">Camera Access Restricted</h3>
            <p className="text-gray-400 text-sm max-w-xs">
              {error || 'Camera permission was denied. You can retry or upload a photo from your gallery.'}
            </p>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => retry()}
                className="px-5 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl text-white font-bold flex items-center gap-2 active:scale-95 transition-all text-sm"
              >
                <RefreshCw size={16} />
                Try Again
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-3 bg-[#00BB78] hover:bg-[#00d68a] rounded-2xl text-white font-bold shadow-lg shadow-[#00BB78]/20 active:scale-95 transition-all text-sm"
              >
                Upload from Gallery
              </button>
            </div>
          </div>
        )}

        {/* Live Video (shown when stream is active) */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover scale-105 transition-opacity duration-300 ${
            stream ? 'opacity-100' : 'opacity-0'
          }`}
        />
      </div>

      {/* Overlays */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        <div className="absolute top-0 w-full h-40 bg-gradient-to-b from-black/80 via-black/40 to-transparent" />
        <div className="absolute bottom-0 w-full h-64 bg-gradient-to-t from-black via-black/80 to-transparent" />
      </div>

      {/* Header UI */}
      <div className="relative z-20 w-full flex justify-between items-start p-4 pt-10 pointer-events-auto">
        <button
          onClick={() => navigateTo('home')}
          className="w-12 h-12 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 flex items-center justify-center hover:bg-white/10 active:scale-90 transition-all"
        >
          <ArrowLeft size={22} className="text-white" />
        </button>

        <div className="flex flex-col items-center gap-1.5 mt-1">
          <div className="px-4 py-1.5 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 flex items-center gap-2">
            <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }}>
              <div className="w-2 h-2 rounded-full bg-[#00FF87] shadow-[0_0_10px_#00FF87]" />
            </motion.div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#00FF87]">
              {fsmState === 'INITIALIZING_HARDWARE' ? 'Initializing...' : 'AI Scanner'}
            </span>
          </div>
        </div>

        <button
          onClick={() => setFlash(!flash)}
          className={`w-12 h-12 rounded-2xl backdrop-blur-xl border flex items-center justify-center active:scale-90 transition-all ${
            flash ? 'bg-yellow-400/20 border-yellow-400/50 text-yellow-400' : 'bg-black/40 border-white/10 text-white'
          }`}
        >
          <Zap size={20} strokeWidth={2} className={flash ? 'fill-yellow-400' : ''} />
        </button>
      </div>

      {/* Center Targeting Reticle */}
      <div className="relative z-10 flex-1 w-full flex items-center justify-center pointer-events-none">
        {isScanning && stream && (
          <div className="relative w-[min(62vw,240px)] h-[min(62vw,240px)]">
            {/* Corner brackets */}
            <div className="absolute -top-1 -left-1 w-12 h-12 border-t-4 border-l-4 border-[#00FF87] rounded-tl-3xl opacity-80" />
            <div className="absolute -top-1 -right-1 w-12 h-12 border-t-4 border-r-4 border-[#00FF87] rounded-tr-3xl opacity-80" />
            <div className="absolute -bottom-1 -left-1 w-12 h-12 border-b-4 border-l-4 border-[#00FF87] rounded-bl-3xl opacity-80" />
            <div className="absolute -bottom-1 -right-1 w-12 h-12 border-b-4 border-r-4 border-[#00FF87] rounded-br-3xl opacity-80" />

            {/* Scanning Laser */}
            <motion.div
              animate={{ y: [0, 236, 0] }}
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
      <div className="relative z-20 text-center mb-3 pointer-events-auto px-5 w-full max-w-lg">
        <h2 className="text-xl font-black text-white mb-1 tracking-tight">Scan for crop issues</h2>
        <p className="text-xs font-medium text-white/70">Use a clear close-up in daylight. AI results are screening guidance.</p>
        <button type="button" onClick={() => setDetailsOpen(open => !open)} className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90">
          {detailsOpen ? 'Hide crop details' : 'Add crop details (optional)'}
          <ChevronDown size={14} className={detailsOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
        </button>
      </div>

      {detailsOpen && <div className="absolute z-30 bottom-36 left-4 right-4 max-h-[35dvh] overflow-y-auto rounded-2xl border border-white/15 bg-[#07130e]/95 p-3 shadow-2xl backdrop-blur-xl">
          <label className="text-left">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-white/60 mb-1">Crop (optional)</span>
            <input
              value={cropType}
              onChange={event => setCropType(event.target.value)}
              placeholder="e.g. tomato, rice"
              maxLength={80}
              className="w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2.5 text-sm text-white placeholder:text-white/40 outline-none focus:border-emerald-400"
            />
          </label>
          <label className="text-left">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-white/60 mb-1">Growth stage</span>
            <select
              value={growthStage}
              onChange={event => setGrowthStage(event.target.value)}
              className="w-full rounded-xl border border-white/15 bg-[#101914] px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-400"
            >
              <option value="">Not sure</option>
              <option value="Seedling">Seedling</option>
              <option value="Vegetative">Vegetative</option>
              <option value="Flowering">Flowering</option>
              <option value="Fruiting or grain filling">Fruiting / grain filling</option>
              <option value="Maturity or harvest">Maturity / harvest</option>
            </select>
          </label>
          <label className="col-span-2 text-left">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-white/60 mb-1">What do you see?</span>
            <input
              value={symptoms}
              onChange={event => setSymptoms(event.target.value)}
              placeholder="Spots, curling, insects, when it started…"
              maxLength={500}
              className="w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2.5 text-sm text-white placeholder:text-white/40 outline-none focus:border-emerald-400"
            />
          </label>
      </div>}

      {/* Bottom Controls Panel */}
      <div className="relative z-20 w-full px-8 pb-8 pt-4 flex items-center justify-between">
        {/* Upload Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center gap-2 group active:scale-90 transition-transform"
        >
          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white/80 group-hover:bg-white/20">
            <ImageIcon size={24} strokeWidth={1.5} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Upload</span>
        </button>

        {/* Shutter Button with Radar Ripple */}
        <div className="relative flex justify-center items-center">
          {stream && (
            <>
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
            </>
          )}
          <button
            onClick={handleCapture}
            disabled={!stream}
            className={`relative w-24 h-24 rounded-full border-4 border-white/20 p-1.5 flex items-center justify-center active:scale-90 transition-all bg-black/20 backdrop-blur-xl ${
              !stream ? 'opacity-40 cursor-not-allowed' : ''
            }`}
          >
            <div className="w-full h-full rounded-full bg-gradient-to-br from-[#00FF87] to-[#00BB78] flex items-center justify-center shadow-[0_0_40px_rgba(0,255,135,0.4)]">
              <ScanLine size={32} className="text-[#001A11]" />
            </div>
          </button>
        </div>

        {/* Cancel Button */}
        <button
          onClick={() => navigateTo('home')}
          className="flex flex-col items-center gap-2 group active:scale-90 transition-transform"
        >
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
