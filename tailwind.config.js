/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{ts,tsx}",
    "./screens/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        emerald: { 50:"#ECFDF5",100:"#D1FAE5",300:"#6EE7B7",500:"#10B981",600:"#059669",700:"#047857",900:"#064E3B" },
        harvest: { 50:"#FFFBEB",200:"#FDE68A",400:"#FBBF24",500:"#F59E0B",600:"#D97706",700:"#B45309" },
        sunset:  { 50:"#FFF7ED",200:"#FED7AA",400:"#FB923C",500:"#F97316",600:"#EA580C",700:"#C2410C" },
        deepsky: { 50:"#EFF6FF",200:"#BFDBFE",400:"#60A5FA",500:"#3B82F6",600:"#2563EB",800:"#1E40AF",950:"#172554" },
        soil:    { 500:"#8B5E3C",700:"#5C3D21" },
        night:   { 800:"#0B1F17",900:"#07130E",950:"#030A07" },
      },
      backgroundImage: {
        "aurora-green": "linear-gradient(135deg,#064E3B 0%,#059669 45%,#10B981 100%)",
        "harvest-glow": "linear-gradient(135deg,#F59E0B 0%,#F97316 100%)",
        "sunset-field": "linear-gradient(160deg,#172554 0%,#047857 55%,#F59E0B 130%)",
        "glass-card":   "linear-gradient(135deg,rgba(255,255,255,0.14) 0%,rgba(255,255,255,0.04) 100%)",
      },
      boxShadow: {
        glow: "0 0 24px rgba(16,185,129,0.35)",
        "glow-gold": "0 0 24px rgba(245,158,11,0.35)",
        "3xl": "0 35px 60px -15px rgba(0,0,0,0.35)",
      },
      fontFamily: {
        display: ["'Outfit'","'Noto Sans'","sans-serif"],
        body: ["'Inter'","'Noto Sans'","sans-serif"],
      },
      keyframes: {
        float:       { "0%,100%":{transform:"translateY(0)"},"50%":{transform:"translateY(-10px)"} },
        shimmer:     { "0%":{backgroundPosition:"-500px 0"},"100%":{backgroundPosition:"500px 0"} },
        "pulse-ring":{ "0%":{transform:"scale(0.8)",opacity:"0.8"},"100%":{transform:"scale(2.2)",opacity:"0"} },
        "wave-bar":  { "0%,100%":{transform:"scaleY(0.3)"},"50%":{transform:"scaleY(1)"} },
        aurora:      { "0%":{transform:"translateX(-10%) rotate(0deg)"},"50%":{transform:"translateX(10%) rotate(4deg)"},"100%":{transform:"translateX(-10%) rotate(0deg)"} },
      },
      animation: {
        float: "float 5s ease-in-out infinite",
        shimmer: "shimmer 1.6s linear infinite",
        "pulse-ring": "pulse-ring 1.8s cubic-bezier(0.2,0.8,0.4,1) infinite",
        "wave-bar": "wave-bar 1.1s ease-in-out infinite",
        aurora: "aurora 14s ease-in-out infinite",
      },
    },
  },
  plugins: [],
  safelist: [
    'animate-ping',
    'animate-spin',
    'animate-pulse',
    'animate-bounce',
    'overflow-y-auto',
    'overflow-hidden',
    'h-full',
    'min-h-full',
    { pattern: /^(bg|text|border|ring)-(emerald|green|amber|sky|purple|pink|red|blue)-([\d]+)$/ },
  ],
};
