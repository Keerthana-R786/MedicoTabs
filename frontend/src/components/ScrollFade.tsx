import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

type ScrollFadeProps = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  once?: boolean;
  as?: 'div' | 'li';
};

const ScrollFade: React.FC<ScrollFadeProps> = ({
  children,
  className = '',
  delay = 0,
  y = 28,
  once = true,
  as = 'div',
}) => {
  const prefersReduced = useReducedMotion();
  const MotionTag = as === 'li' ? motion.li : motion.div;
  const StaticTag = as === 'li' ? 'li' : 'div';

  if (prefersReduced) {
    return <StaticTag className={className}>{children}</StaticTag>;
  }

  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, amount: 0.22, margin: '0px 0px -8% 0px' }}
      transition={{
        duration: 0.75,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </MotionTag>
  );
};

export default ScrollFade;
