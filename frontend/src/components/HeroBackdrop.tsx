import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

type HeroBackdropProps = {
  className?: string;
  /** fill = landing hero, auth = login/signup, app = dashboard shell */
  variant?: 'fill' | 'auth' | 'app';
};

const HeroBackdrop: React.FC<HeroBackdropProps> = ({
  className = '',
  variant = 'fill',
}) => {
  const prefersReduced = useReducedMotion();

  const mediaClass =
    variant === 'auth'
      ? `auth-hero__media landing-hero-media ${className}`
      : variant === 'app'
        ? `app-hero__media landing-hero-media ${className}`
        : `absolute inset-0 landing-hero-media overflow-hidden ${className}`;

  // Dashboard: slow looping zoom so it stays visible while working
  // Landing/auth: one-shot ken-burns zoom-in
  const isApp = variant === 'app';

  return (
    <div className={mediaClass} aria-hidden>
      <motion.img
        src="/landing-hero.jpg"
        alt=""
        className="landing-hero-img absolute inset-0 w-full h-full object-cover"
        initial={prefersReduced ? { scale: 1.06 } : { scale: 1.02 }}
        animate={
          prefersReduced
            ? { scale: 1.06 }
            : isApp
              ? { scale: [1.02, 1.14, 1.02] }
              : { scale: 1.14 }
        }
        transition={
          prefersReduced
            ? { duration: 0 }
            : isApp
              ? {
                  duration: 26,
                  ease: 'easeInOut',
                  repeat: Infinity,
                  repeatType: 'mirror',
                }
              : {
                  duration: 22,
                  ease: [0.22, 0.1, 0.25, 1],
                  delay: 0.15,
                }
        }
      />
      <div className="hero-scrim" />
    </div>
  );
};

export default HeroBackdrop;
