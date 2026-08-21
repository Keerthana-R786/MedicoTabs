import React, { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Stethoscope, Radar, Route, ShieldCheck } from 'lucide-react';
import SplashScreen from '@/components/SplashScreen';
import HeroBackdrop from '@/components/HeroBackdrop';
import ScrollFade from '@/components/ScrollFade';

const SPLASH_SESSION_KEY = 'medicotabs-splash-seen';

const FEATURES = [
  {
    icon: Radar,
    step: '01',
    title: 'Flight-style tracking',
    body: 'See where each referral sits — ordered, accepted, scheduled, completed — without digging through inboxes.',
  },
  {
    icon: Route,
    step: '02',
    title: 'Lifecycle clarity',
    body: 'Primary doctors, specialists, and coordinators share one continuous path from intent to visit.',
  },
  {
    icon: ShieldCheck,
    step: '03',
    title: 'HITL approvals',
    body: 'Human review stays in the loop when judgment matters — nothing auto-closes without accountability.',
  },
] as const;

const Landing: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [showSplash, setShowSplash] = useState(
    () => typeof sessionStorage === 'undefined' || sessionStorage.getItem(SPLASH_SESSION_KEY) !== '1'
  );
  const handleSplashComplete = useCallback(() => setShowSplash(false), []);

  return (
    <AnimatePresence mode="wait">
      {showSplash ? (
        <SplashScreen key="splash" onComplete={handleSplashComplete} />
      ) : (
        <motion.div
          key="landing"
          className="landing-page min-h-screen bg-base-200 text-base-800"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Minimal top nav — brand + CTAs only */}
          <header className="absolute top-0 inset-x-0 z-20">
            <div className="mx-auto max-w-6xl px-5 sm:px-8 h-16 flex items-center justify-between">
              <Link
                to="/"
                className="flex items-center gap-2.5 transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white rounded-lg"
              >
                <span className="w-9 h-9 rounded-xl bg-primary-800 flex items-center justify-center shrink-0">
                  <Stethoscope className="w-5 h-5 text-white" aria-hidden />
                </span>
                <span className="hero-type-nav text-[1.05rem]">MedicoTabs</span>
              </Link>
              <nav className="flex items-center gap-2 sm:gap-3" aria-label="Account">
                {isAuthenticated ? (
                  <Link to="/dashboard" className="landing-btn landing-btn--solid landing-btn--sm">
                    Open Dashboard
                  </Link>
                ) : (
                  <>
                    <Link to="/login" className="landing-btn landing-btn--ghost-nav">
                      Sign In
                    </Link>
                    <Link to="/signup" className="landing-btn landing-btn--solid landing-btn--sm">
                      Create Account
                    </Link>
                  </>
                )}
              </nav>
            </div>
          </header>

          {/* Hero — one composition, full-bleed visual */}
          <section className="relative min-h-[100svh] flex items-end sm:items-center overflow-hidden">
            <HeroBackdrop />

            <div className="relative z-10 w-full mx-auto max-w-6xl px-5 sm:px-8 pb-16 pt-28 sm:py-24">
              <div className="max-w-xl">
                <p className="landing-reveal landing-reveal-1 hero-type-brand text-4xl sm:text-5xl md:text-[3.75rem] leading-[1.05]">
                  MedicoTabs
                </p>
                <h1 className="landing-reveal landing-reveal-2 hero-type-headline mt-5 text-2xl sm:text-3xl md:text-[2.2rem] leading-snug">
                  The referral that never goes dark.
                </h1>
                <p className="landing-reveal landing-reveal-3 hero-type-body mt-5 text-base sm:text-lg leading-relaxed max-w-md">
                  Follow every handoff from order to visit — so primary care, specialists, and coordinators stay aligned.
                </p>
                <div className="landing-reveal landing-reveal-4 mt-9 flex flex-wrap items-center gap-3">
                  {isAuthenticated ? (
                    <Link to="/dashboard" className="landing-btn landing-btn--solid">
                      Open Dashboard
                    </Link>
                  ) : (
                    <>
                      <Link to="/login" className="landing-btn landing-btn--solid">
                        Sign In
                      </Link>
                      <Link to="/signup" className="landing-btn landing-btn--outline">
                        Create Account
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* How it helps — one purpose */}
          <section className="landing-below relative overflow-hidden">
            <div className="landing-below__wash" aria-hidden />
            <div className="relative mx-auto max-w-6xl px-5 sm:px-8 py-20 sm:py-28">
              <ScrollFade className="max-w-2xl">
                <p className="landing-eyebrow">How it works</p>
                <h2 className="landing-section-title mt-3">
                  Visibility across the full referral lifecycle
                </h2>
                <p className="landing-section-lede mt-4">
                  MedicoTabs tracks status like a flight board, surfaces human-in-the-loop approvals, and keeps care teams from losing the thread.
                </p>
              </ScrollFade>

              <ul className="landing-feature-list mt-14 sm:mt-16 list-none">
                {FEATURES.map(({ icon: Icon, step, title, body }, i) => (
                  <ScrollFade key={title} as="li" className="landing-feature" delay={0.08 + i * 0.12} y={36}>
                    <div className="landing-feature__rail" aria-hidden>
                      <span className="landing-feature__icon">
                        <Icon className="w-5 h-5" aria-hidden />
                      </span>
                      <span className="landing-feature__line" />
                    </div>
                    <div className="landing-feature__copy min-w-0">
                      <span className="landing-feature__step">{step}</span>
                      <h3 className="landing-feature__title">{title}</h3>
                      <p className="landing-feature__body">{body}</p>
                    </div>
                  </ScrollFade>
                ))}
              </ul>
            </div>
          </section>

          {/* Final CTA */}
          <section className="relative pb-16 sm:pb-24">
            <div className="mx-auto max-w-6xl px-5 sm:px-8">
              <ScrollFade y={32} delay={0.05}>
                <div className="landing-cta">
                  <div className="landing-cta__glow" aria-hidden />
                  <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
                    <div className="max-w-xl">
                      <p className="landing-eyebrow landing-eyebrow--on-cta">Get started</p>
                      <h2 className="landing-cta__title mt-3">
                        Ready to keep referrals in view?
                      </h2>
                      <p className="landing-cta__lede mt-3">
                        {isAuthenticated
                          ? 'Continue to your workspace to manage referrals and patients.'
                          : 'Sign in to your workspace or create an account to get started.'}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3 shrink-0">
                      {isAuthenticated ? (
                        <Link to="/dashboard" className="landing-btn landing-btn--solid landing-btn--on-light">
                          Open Dashboard
                        </Link>
                      ) : (
                        <>
                          <Link to="/login" className="landing-btn landing-btn--solid landing-btn--on-light">
                            Sign In
                          </Link>
                          <Link to="/signup" className="landing-btn landing-btn--muted">
                            Create Account
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </ScrollFade>
            </div>
          </section>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Landing;
