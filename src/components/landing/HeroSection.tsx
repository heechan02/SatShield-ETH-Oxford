import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import ParticleWave from './ParticleWave';
import { motion } from 'framer-motion';
import { Suspense } from 'react';
export default function HeroSection() {
  return <section className="relative min-h-screen flex items-end justify-center overflow-hidden pb-20">
      {/* Particle wave background */}
      <Suspense fallback={null}>
        <ParticleWave />
      </Suspense>

      {/* Content — centered, bottom-weighted like the reference */}
      <motion.div initial={{
      opacity: 0,
      y: 30
    }} animate={{
      opacity: 1,
      y: 0
    }} transition={{
      duration: 1,
      ease: 'easeOut',
      delay: 0.3
    }} className="relative z-10 text-center max-w-3xl mx-auto px-4 space-y-8">
        {/* Badge pill */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-card/60 backdrop-blur border border-border/50 text-xs font-mono uppercase tracking-widest text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-primary" />
            Beta Release
          </div>
        </div>

        {/* Heading — large serif, light weight like the template */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-light leading-[1.05] tracking-tight font-serif">
          Insurance that pays{' '}
          <em className="italic font-light">instantly</em>
        </h1>

        {/* Subtitle — monospace, light */}
        <p className="text-sm font-mono font-light text-muted-foreground max-w-md mx-auto leading-relaxed tracking-wide">
          Through oracle-driven parametric coverage
          <br />
          that pays out automatically on-chain
        </p>

        {/* Single chamfered CTA */}
        <div className="flex justify-center pt-2">
          <Button asChild variant="chamfered" size="lg" className="text-sm px-10 h-14 font-mono uppercase tracking-[0.25em] border border-primary bg-transparent text-primary hover:bg-primary/10 hover:text-primary glow-primary font-normal">
            <Link to="/dashboard">
              [Launch App]
            </Link>
          </Button>
        </div>

        {/* Trust indicators */}
        <div className="flex items-center justify-center gap-6 pt-4 text-[11px] font-mono font-light text-muted-foreground tracking-wider">
          <span className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
            Audited Contracts
          </span>
          <span className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
            Non-Custodial
          </span>
          <span className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
            On-chain Payouts
          </span>
        </div>
      </motion.div>

      {/* Bottom fade gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent z-[5] pointer-events-none" />
    </section>;
}