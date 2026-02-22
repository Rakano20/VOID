import { motion } from "motion/react";
import { useEffect, useState } from "react";

export default function Intro({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 1000),
      setTimeout(() => setPhase(2), 3000),
      setTimeout(() => onComplete(), 4500),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050505] overflow-hidden">
      <div className="atmosphere absolute inset-0" />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ 
          opacity: phase === 1 ? 1 : phase === 2 ? 0 : 0,
          scale: phase === 1 ? 1 : 1.1,
          filter: phase === 2 ? "blur(20px)" : "blur(0px)"
        }}
        transition={{ duration: 1.5, ease: "easeInOut" }}
        className="relative z-10"
      >
        <h1 className="text-8xl md:text-[12rem] font-serif italic tracking-tighter text-white/90">
          VOID
        </h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: phase === 1 ? 0.5 : 0 }}
          transition={{ delay: 0.5 }}
          className="text-center font-mono text-xs tracking-[0.5em] uppercase mt-4"
        >
          Intelligence Reimagined
        </motion.p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: phase === 2 ? 1 : 0 }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <div className="w-px h-32 bg-gradient-to-b from-transparent via-white/20 to-transparent" />
      </motion.div>
    </div>
  );
}
