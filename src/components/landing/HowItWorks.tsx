import { useEffect, useRef, useState } from 'react';
import { MapPin, Radio, Banknote, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const steps = [
  {
    icon: MapPin,
    title: 'Select Your Risk',
    description: 'Choose from 8 risk categories — earthquake, flood, drought, crop yield, extreme heat, flight delay, shipping disruption, and cyber outage. Pin your location and set your trigger.',
    accent: 'primary',
  },
  {
    icon: Radio,
    title: 'We Monitor 24/7',
    description: 'Oracle feeds from USGS, NASA, and NOAA continuously verify real-world conditions against your policy parameters.',
    accent: 'warning',
  },
  {
    icon: Banknote,
    title: 'Automatic Payout',
    description: 'When the trigger threshold is met, your C2FLR payout is sent automatically via smart contract. No claims. No delays.',
    accent: 'accent',
  },
];

export default function HowItWorks() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.2 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="how-it-works" className="py-24" ref={ref}>
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={visible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-primary font-medium mb-3">
            How It Works
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold font-serif">
            Protection in three steps
          </h2>
          <p className="mt-4 text-muted-foreground max-w-lg mx-auto">
            No claims adjusters. No waiting periods. Just math, oracles, and smart contracts.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 relative">
          {/* Connection lines (desktop) */}
          <div className="hidden md:block absolute top-[4.5rem] left-[calc(16.67%+2rem)] right-[calc(16.67%+2rem)] h-px">
            <div className="h-full bg-gradient-to-r from-primary via-warning to-accent opacity-30" />
          </div>

          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 30 }}
              animate={visible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: i * 0.15 }}
              className="relative group"
            >
              <div className="glass rounded-xl p-6 hover:bg-card/80 transition-all duration-300 h-full">
                {/* Step number */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`
                    h-14 w-14 rounded-xl flex items-center justify-center relative
                    ${step.accent === 'primary' ? 'bg-primary/10 border border-primary/20' : ''}
                    ${step.accent === 'warning' ? 'bg-warning/10 border border-warning/20' : ''}
                    ${step.accent === 'accent' ? 'bg-accent/10 border border-accent/20' : ''}
                  `}>
                    <step.icon className={`h-6 w-6 ${
                      step.accent === 'primary' ? 'text-primary' :
                      step.accent === 'warning' ? 'text-warning' :
                      'text-accent'
                    }`} />
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">
                    STEP {String(i + 1).padStart(2, '0')}
                  </span>
                </div>

                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>

                {i < steps.length - 1 && (
                  <div className="md:hidden flex justify-center mt-4">
                    <ArrowRight className="h-4 w-4 text-muted-foreground/50 rotate-90" />
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}