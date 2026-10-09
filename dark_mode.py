import re

filepath = r"c:\Users\bhage\Desktop\Krishi-Drishti\screens\DashboardScreen.tsx"

with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Main Background
content = content.replace("background: 'linear-gradient(180deg, #f4fbf6 0%, #ffffff 32%, #ffffff 100%)'", "background: '#050505'")
content = content.replace("text-gray-800", "text-gray-100")
content = content.replace("text-gray-900", "text-white")
content = content.replace("bg-white", "bg-[#0D0D0D]")
content = content.replace("bg-gray-50", "bg-[#111111]")
content = content.replace("bg-gray-100", "bg-[#1A1A1A]")
content = content.replace("border-gray-100", "border-[#222]")
content = content.replace("border-gray-200", "border-[#333]")
content = content.replace("shadow-orange-100/50", "shadow-emerald-900/20")
content = content.replace("hover:bg-orange-50", "hover:bg-emerald-900/30")
content = content.replace("text-gray-500", "text-gray-400")
content = content.replace("text-gray-700", "text-gray-300")

# 2. Specific styles
content = content.replace("background: '#F5F5F5'", "background: '#111'")
content = content.replace("border: '1px solid #EBEBEB'", "border: '1px solid #222'")
content = content.replace("color: C.dark", "color: '#fff'")
content = content.replace("color: '#001A11'", "color: '#fff'")
content = content.replace("bg-green-50", "bg-emerald-900/30")
content = content.replace("text-green-700", "text-emerald-400")

# 3. Weather Cards
content = content.replace("linear-gradient(140deg,#a7f3d0,#34d399)", "linear-gradient(140deg,#064e3b,#047857)")
content = content.replace("color: '#047857'", "color: '#a7f3d0'")

content = content.replace("linear-gradient(140deg,#bfdbfe,#60a5fa)", "linear-gradient(140deg,#1e3a8a,#1d4ed8)")
content = content.replace("color: '#1d4ed8'", "color: '#bfdbfe'")

content = content.replace("linear-gradient(140deg,#fde68a,#fbbf24)", "linear-gradient(140deg,#78350f,#b45309)")
content = content.replace("color: '#b45309'", "color: '#fde68a'")

content = content.replace("linear-gradient(140deg,#c7d2fe,#818cf8)", "linear-gradient(140deg,#312e81,#4338ca)")
content = content.replace("color: '#4338ca'", "color: '#c7d2fe'")

content = content.replace("glass rounded-[2rem]", "glass-dark rounded-[2rem] border border-white/5 bg-white/5 backdrop-blur-md")

# 4. Aurora Background (Make it darker)
content = content.replace("bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-white/10 via-white/50 to-transparent", "bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-emerald-900/20 via-black/50 to-transparent")

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)

print("Dashboard rewritten to dark mode!")
