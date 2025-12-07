import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from "framer-motion";

const phrases = [
  'Aguarde um momento...',
  'Estamos buscando seus dados...',
  'Seu dashboard está pronto...'
];

const LoaderOne = () => {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseIndex((prevIndex) => (prevIndex + 1) % phrases.length);
    }, 2667); // ~8 segundos / 3 frases = 2667ms por frase

    return () => clearInterval(interval);
  }, []);

  // Animação do progresso circular
  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 360) {
          return 0;
        }
        return prev + 3.6; // 360 / 100 para completar em ~8 segundos
      });
    }, 80);

    return () => clearInterval(progressInterval);
  }, []);

  const circumference = 2 * Math.PI * 45; // raio = 45
  const strokeDashoffset = circumference - (progress / 360) * circumference;

  return (
    <div className="flex flex-col items-center justify-center gap-8">
      {/* Círculo de progresso com componente central */}
      <div className="relative w-40 h-40 flex items-center justify-center">
        {/* SVG com círculo de progresso */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 100 100"
        >
          {/* Círculo de fundo */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="2"
          />
          
          {/* Círculo de progresso */}
          <motion.circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#3b82f6"
            strokeWidth="3"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{
              transform: 'rotate(-90deg)',
              transformOrigin: '50px 50px',
              transition: 'stroke-dashoffset 0.08s linear'
            }}
          />
        </svg>

        {/* Conteúdo central */}
        <div className="flex flex-col items-center justify-center gap-6 relative z-10">
          {/* Loader com 3 bolinhas */}
          <div className="flex items-center justify-center gap-1">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className="h-3 w-3 rounded-full bg-blue-500"
                initial={{ x: 0 }}
                animate={{
                  x: [0, 10, 0],
                  opacity: [0.5, 1, 0.5],
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </div>

          {/* Percentual de progresso */}
          <motion.div
            className="text-2xl font-bold text-blue-600"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{
              duration: 0.5,
              repeat: Infinity,
              repeatDelay: 2.167
            }}
          >
            {Math.round((progress / 360) * 100)}%
          </motion.div>
        </div>
      </div>

      {/* Mensagens animadas */}
      <AnimatePresence mode="wait">
        <motion.div
          key={phraseIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.5 }}
          className="h-8 flex items-center"
        >
          <p className="text-lg font-semibold text-gray-800 text-center whitespace-nowrap">
            {phrases[phraseIndex]}
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

export default LoaderOne