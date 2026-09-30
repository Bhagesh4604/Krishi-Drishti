import type { Variants, Transition } from "framer-motion";

/* ── Shared spring transition ─────────────────────────────────────── */
export const springSoft: Transition = {
  type: "spring", stiffness: 120, damping: 18, mass: 0.9,
};

/* ── Page routing transitions ─────────────────────────────────────── */
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 24, scale: 0.985, filter: "blur(6px)" },
  animate: {
    opacity: 1, y: 0, scale: 1, filter: "blur(0px)",
    transition: { ...springSoft, duration: 0.45 },
  },
  exit: {
    opacity: 0, y: -18, scale: 0.99, filter: "blur(4px)",
    transition: { duration: 0.22, ease: "easeIn" },
  },
};

/* ── Staggered container — reveals children one-by-one ────────────── */
export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.08 } },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 26, scale: 0.96 },
  show:   { opacity: 1, y: 0, scale: 1, transition: springSoft },
};

/* ── Widget card entrance (used by GlassCard / widgets) ───────────── */
export const widgetRise: Variants = {
  hidden: { opacity: 0, y: 40, rotateX: 8 },
  show:   { opacity: 1, y: 0, rotateX: 0, transition: { ...springSoft, duration: 0.55 } },
};

/* ── Data-feed list items (news, alerts) ──────────────────────────── */
export const feedItem: Variants = {
  hidden: { opacity: 0, x: -32 },
  show:   { opacity: 1, x: 0, transition: springSoft },
  exit:   { opacity: 0, x: 32, transition: { duration: 0.18 } },
};

/* ── Toast notifications ──────────────────────────────────────────── */
export const toastVariants: Variants = {
  hidden: { opacity: 0, y: 40, scale: 0.9 },
  show:   { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 380, damping: 26 } },
  exit:   { opacity: 0, y: 20, scale: 0.92, transition: { duration: 0.18 } },
};

/* ── FAB pop-in ───────────────────────────────────────────────────── */
export const fabVariants: Variants = {
  hidden: { opacity: 0, scale: 0.3, rotate: -90 },
  show:   { opacity: 1, scale: 1, rotate: 0, transition: { type: "spring", stiffness: 300, damping: 18 } },
};

/* ── Sidebar slide ────────────────────────────────────────────────── */
export const sidebarVariants: Variants = {
  expanded:  { width: 248, transition: springSoft },
  collapsed: { width: 76, transition: springSoft },
};

export const springyHover = { scale: 1.04, y: -4 } as const;
