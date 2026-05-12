import { motion } from "motion/react";
import { Cpu, Terminal, ExternalLink, Box, Zap } from "lucide-react";

// --- PROJECT DATA (Add or remove cards here) ---
const PROJECTS = [
  {
    id: 'online-flasher',
    title: 'Online Flasher',
    description: 'Flash Tech Talkies projects firmwares directly with high-speed Web Serial integration.',
    footerPointers: ['Multiple projects', 'Cross-platform', 'v2.0'],
    icon: <Zap className="w-5 h-5" />,
    url: "https://github.com/techtalkies/online-flasher"
  },
  {
    id: 'rsvp-oled',
    title: 'RSVP OLED',
    description: 'An RSVP based ereader that displays on an OLED and runs on an ESP32 for ultra-fast reading.',
    footerPointers: ['ESP32', 'OLED Driver', 'C++'],
    icon: <Cpu className="w-5 h-5" />,
    url: "https://github.com/techtalkies/rsvp-oled"
  },
];

// --- MODULAR COMPONENTS ---
const Card = ({ title, description, footerPointers, icon, url }: typeof PROJECTS[0]) => (
  <motion.a
    href={url}
    target="_blank"
    rel="noopener noreferrer"
    initial={{ opacity: 0, scale: 0.95 }}
    whileInView={{ opacity: 1, scale: 1 }}
    whileHover={{ y: -5 }}
    transition={{ duration: 0.3 }}
    className="relative group bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col h-full hover:border-zinc-700 hover:bg-zinc-900/80 transition-all shadow-xl cursor-pointer overflow-hidden"
  >
    {/* Subtle Glow Effect */}
    <div className="absolute -inset-px bg-gradient-to-tr from-indigo-500/10 to-emerald-500/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />

    <div className="relative z-10">
      <div className="flex items-center justify-between mb-6">
        <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-100 group-hover:text-white group-hover:bg-zinc-700 transition-colors">
          {icon}
        </div>
        <ExternalLink className="w-5 h-5 text-zinc-600 group-hover:text-white transition-colors" />
      </div>

      <h3 className="text-xl font-bold mb-3 text-white tracking-tight">
        {title}
      </h3>
      
      <p className="text-zinc-400 text-sm leading-relaxed mb-8 flex-grow">
        {description}
      </p>
    </div>

    <div className="relative z-10 mt-auto pt-6 border-t border-zinc-800/50 flex flex-wrap gap-2">
      {footerPointers.map((pointer, i) => (
        <span 
          key={i} 
          className="text-[10px] font-mono uppercase tracking-wider px-2 py-1 bg-zinc-950 text-zinc-500 border border-zinc-800 rounded-md"
        >
          {pointer}
        </span>
      ))}
    </div>
  </motion.a>
);

export default function App() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-indigo-500/30">
      {/* Navigation */}
      <nav className="border-b border-zinc-900 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Box className="w-6 h-6 text-indigo-500" />
            <span className="font-mono text-sm tracking-tighter font-bold uppercase">Labs.System</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#" className="text-xs font-medium text-zinc-400 hover:text-white transition-colors">PROJECTS</a>
            <a href="#" className="text-xs font-medium text-zinc-400 hover:text-white transition-colors">RESOURCES</a>
            <Terminal className="w-4 h-4 text-zinc-600 hover:text-white transition-colors cursor-pointer" />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-24">
        <header className="mb-20 text-center md:text-left">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter mb-4 text-white">
              Tech Talkies <span className="text-zinc-700">Explorations</span>
            </h1>
            <p className="text-zinc-500 max-w-xl text-lg font-medium">
              A curated directory of hardware experiments, firmware tools, and 
              embedded interface systems.
            </p>
          </motion.div>
        </header>

        {/* Modular Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {PROJECTS.map((project) => (
            <Card key={project.id} {...project} />
          ))}
        </div>
      </main>

      {/* Background Accent */}
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-indigo-600/5 blur-[120px] -z-10 rounded-full" />
      <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-emerald-600/5 blur-[120px] -z-10 rounded-full" />
    </div>
  );
}
