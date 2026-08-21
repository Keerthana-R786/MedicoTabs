import React, { useCallback, useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const SPLASH_HOLD_MS = 2400;
const SESSION_KEY = 'medicotabs-splash-seen';
const LETTERS = 'MedicoTabs'.split('');

type SplashScreenProps = {
  onComplete: () => void;
  oncePerSession?: boolean;
};

const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  oncePerSession = true,
}) => {
  const prefersReduced = useReducedMotion();
  const [imgReady, setImgReady] = useState(false);

  const finish = useCallback(() => {
    if (oncePerSession) sessionStorage.setItem(SESSION_KEY, '1');
    onComplete();
  }, [oncePerSession, onComplete]);

  useEffect(() => {
    if (oncePerSession && sessionStorage.getItem(SESSION_KEY) === '1') {
      finish();
      return;
    }

    const img = new Image();
    img.src = '/landing-hero.jpg';
    if (img.complete) setImgReady(true);
    else {
      img.onload = () => setImgReady(true);
      img.onerror = () => setImgReady(true);
    }
  }, [finish, oncePerSession]);

  useEffect(() => {
    if (!imgReady) return;
    if (oncePerSession && sessionStorage.getItem(SESSION_KEY) === '1') return;

    const hold = prefersReduced ? 450 : SPLASH_HOLD_MS;
    const timer = window.setTimeout(finish, hold);
    return () => window.clearTimeout(timer);
  }, [imgReady, prefersReduced, finish, oncePerSession]);

  return (
    <motion.div
      className="splash-screen fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden"
      style={{ backgroundColor: '#061816' }}
      role="status"
      aria-live="polite"
      aria-label="Loading MedicoTabs"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: prefersReduced ? 0.15 : 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="absolute inset-0 overflow-hidden" aria-hidden>
        <motion.img
          src="/landing-hero.jpg"
          alt=""
          className="landing-hero-img absolute inset-0 w-full h-full object-cover"
          initial={{ scale: 1.04, opacity: 0 }}
          animate={{ scale: imgReady ? 1.1 : 1.04, opacity: imgReady ? 1 : 0 }}
          transition={{
            opacity: { duration: 0.4 },
            scale: { duration: prefersReduced ? 0 : 2.5, ease: [0.22, 0.1, 0.25, 1] },
          }}
          onLoad={() => setImgReady(true)}
        />
        <div className="splash-scrim" />
      </div>

      <div className="splash-mark relative z-10 flex flex-col items-center px-6 text-center">
        <p className="splash-wordmark" aria-label="MedicoTabs">
          {LETTERS.map((letter, i) => (
            <span
              key={`${letter}-${i}`}
              className="splash-letter"
              style={{ animationDelay: `${0.08 + i * 0.055}s` }}
            >
              {letter}
            </span>
          ))}
        </p>

        <p className="splash-tagline splash-tagline--bold mt-5">
          The referral that never goes dark
        </p>

        <div className="splash-bar splash-bar--on-hero mt-8" aria-hidden>
          <span className="splash-bar__fill" />
        </div>
      </div>
    </motion.div>
  );
};

export default SplashScreen;
