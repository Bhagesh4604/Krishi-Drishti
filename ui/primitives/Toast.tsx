import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";
import { toastVariants } from "../animations/variants";

export type ToastKind = "success" | "warning" | "info";
export interface ToastData { id: string; kind: ToastKind; message: string }

const STYLE: Record<ToastKind, { ring: string; icon: ReactNode }> = {
  success: { ring: "border-emerald-400/40", icon: <CheckCircle2 className="text-emerald-400" size={18} /> },
  warning: { ring: "border-harvest-400/40", icon: <AlertTriangle className="text-harvest-400" size={18} /> },
  info:    { ring: "border-deepsky-400/40", icon: <Info className="text-deepsky-400" size={18} /> },
};

export default function ToastStack({
  toasts, onDismiss,
}: { toasts: ToastData[]; onDismiss: (id: string) => void }) {
  return (
    <div className="pointer-events-none fixed bottom-24 right-4 z-[90] flex w-80 flex-col gap-2 md:bottom-6">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            variants={toastVariants}
            initial="hidden" animate="show" exit="exit"
            className={`glass pointer-events-auto flex items-center gap-3 !rounded-2xl px-4 py-3 ${STYLE[t.kind].ring}`}
          >
            {STYLE[t.kind].icon}
            <p className="flex-1 text-sm text-white/90">{t.message}</p>
            <button onClick={() => onDismiss(t.id)} className="text-white/40 hover:text-white">
              <X size={15} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
