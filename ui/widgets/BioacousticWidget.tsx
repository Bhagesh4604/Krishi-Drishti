import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { UploadCloud, AudioWaveform, Bug, Loader2, CheckCircle2 } from "lucide-react";
import GlassCard from "../primitives/GlassCard";

export interface PestDetectionResult {
  species: string; confidence: number; severity: "low" | "medium" | "high";
}

interface Props {
  /** Wire this to your Python bioacoustic service, e.g. POST /bioacoustic/analyze */
  onAnalyze?: (file: File) => Promise<PestDetectionResult>;
}

const SEVERITY_STYLE = {
  low:    "text-emerald-300 bg-emerald-500/15 ring-emerald-400/30",
  medium: "text-harvest-300 bg-harvest-500/15 ring-harvest-400/30",
  high:   "text-sunset-300 bg-sunset-500/15 ring-sunset-400/30",
} as const;

/** Animated equaliser bars shown while audio is being analysed. */
function WaveformViz({ active }: { active: boolean }) {
  return (
    <div className="flex h-16 items-end justify-center gap-1" aria-hidden>
      {Array.from({ length: 24 }).map((_, i) => (
        <motion.span
          key={i}
          className="w-1.5 rounded-full bg-gradient-to-t from-emerald-500 via-harvest-400 to-sunset-400"
          animate={active ? { height: ["18%", `${30 + ((i * 37) % 70)}%`, "26%"] } : { height: "14%" }}
          transition={{ duration: 0.9 + (i % 5) * 0.12, repeat: active ? Infinity : 0, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

export default function BioacousticWidget({ onAnalyze }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PestDetectionResult | null>(null);
  const [dragOver, setDragOver] = useState(false);

  async function handleFiles(list: FileList | null) {
    const f = list?.[0];
    if (!f || !/\.(wav|mp3|m4a)$/i.test(f.name)) return;
    setFile(f); setResult(null); setBusy(true);
    try {
      // Demo fallback if no backend wired — replace with real API call
      const res = onAnalyze
        ? await onAnalyze(f)
        : await new Promise<PestDetectionResult>((r) =>
            setTimeout(() => r({ species: "Helicoverpa armigera (Pod Borer)", confidence: 0.87, severity: "high" }), 2200));
      setResult(res);
    } finally {
      setBusy(false);
    }
  }

  return (
    <GlassCard title="Bioacoustic Pest Detection" subtitle="Upload field recordings (.wav) for AI insect analysis" accent="harvest">
      <input ref={inputRef} type="file" accept=".wav,.mp3,.m4a,audio/*" hidden
        onChange={(e) => handleFiles(e.target.files)} />

      {/* Drop zone */}
      <motion.button
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        whileTap={{ scale: 0.97 }}
        className={`w-full rounded-2xl border-2 border-dashed px-4 py-6 text-center transition-colors
          ${dragOver ? "border-harvest-400 bg-harvest-500/10" : "border-white/15 bg-black/20 hover:border-emerald-400/50"}`}
      >
        <motion.span
          animate={busy ? { y: [0, -6, 0] } : { y: [0, 4, 0] }}
          transition={{ duration: busy ? 0.7 : 2.4, repeat: Infinity, ease: "easeInOut" }}
          className="inline-grid h-12 w-12 place-items-center rounded-2xl bg-harvest-glow text-night-900 shadow-glow-gold"
        >
          {busy ? <Loader2 className="animate-spin" size={22} /> : <UploadCloud size={22} />}
        </motion.span>
        <p className="mt-3 font-display font-bold text-white">
          {busy ? "Analysing soundscape…" : file ? file.name : "Drop .wav here or tap to record"}
        </p>
        <p className="text-xs text-white/50">Cricket · moth · borer calls detected by CNN classifier</p>
      </motion.button>

      <div className="mt-4">
        <WaveformViz active={busy || !!result} />
      </div>

      {/* Result card */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }} transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className={`mt-4 flex items-center gap-3 rounded-2xl px-4 py-3 ring-1 ${SEVERITY_STYLE[result.severity]}`}
          >
            {busy ? <AudioWaveform size={20} /> : <CheckCircle2 size={20} />}
            <div className="flex-1">
              <p className="flex items-center gap-2 font-semibold">
                <Bug size={15} />{result.species}
              </p>
              <p className="text-xs opacity-80">Confidence {(result.confidence * 100).toFixed(0)}% · Severity: {result.severity}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}
