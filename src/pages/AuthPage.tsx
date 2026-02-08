import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Shield, Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { z } from 'zod';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

export default function AuthPage() {
  const { user, isLoading: authLoading, signIn, signUp } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string; confirm?: string }>({});

  // Redirect authenticated users
  if (!authLoading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  const validate = (): boolean => {
    const errors: typeof fieldErrors = {};

    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) errors.email = emailResult.error.errors[0].message;

    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) errors.password = passwordResult.error.errors[0].message;

    if (mode === 'signup' && password !== confirmPassword) {
      errors.confirm = 'Passwords do not match';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);

    if (mode === 'signin') {
      const { error } = await signIn(email, password);
      if (error) {
        toast({ title: 'Sign In Failed', description: error, variant: 'destructive' });
      }
    } else {
      const { error } = await signUp(email, password);
      if (error) {
        toast({ title: 'Sign Up Failed', description: error, variant: 'destructive' });
      } else {
        toast({
          title: '🎉 Account Created!',
          description: 'Check your email for a confirmation link to complete sign up.',
        });
      }
    }

    setIsSubmitting(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <div className="absolute inset-0 grid-pattern opacity-30" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="relative inline-block mb-4">
            <Shield className="h-12 w-12 text-primary mx-auto" />
            <div className="absolute inset-0 blur-xl bg-primary/30" />
          </div>
          <h1 className="text-2xl font-bold font-serif">
            Flare<span className="text-primary">Shield</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Oracle-powered parametric insurance on Flare
          </p>
        </div>

        <Card className="glass">
          <CardHeader className="pb-4">
            {/* Mode toggle */}
            <div className="flex rounded-lg bg-secondary/50 p-1">
              <button
                onClick={() => { setMode('signin'); setFieldErrors({}); }}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                  mode === 'signin'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => { setMode('signup'); setFieldErrors({}); }}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                  mode === 'signup'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Sign Up
              </button>
            </div>
          </CardHeader>

          <CardContent>
            <AnimatePresence mode="wait">
              <motion.form
                key={mode}
                initial={{ opacity: 0, x: mode === 'signin' ? -10 : 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: mode === 'signin' ? 10 : -10 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setFieldErrors((p) => ({ ...p, email: undefined })); }}
                      className="pl-10 bg-secondary/50"
                      autoComplete="email"
                    />
                  </div>
                  {fieldErrors.email && (
                    <p className="text-xs text-destructive">{fieldErrors.email}</p>
                  )}
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setFieldErrors((p) => ({ ...p, password: undefined })); }}
                      className="pl-10 bg-secondary/50"
                      autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                    />
                  </div>
                  {fieldErrors.password && (
                    <p className="text-xs text-destructive">{fieldErrors.password}</p>
                  )}
                </div>

                {/* Confirm password (signup only) */}
                {mode === 'signup' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2"
                  >
                    <Label htmlFor="confirm-password" className="text-sm">
                      Confirm Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="confirm-password"
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => { setConfirmPassword(e.target.value); setFieldErrors((p) => ({ ...p, confirm: undefined })); }}
                        className="pl-10 bg-secondary/50"
                        autoComplete="new-password"
                      />
                    </div>
                    {fieldErrors.confirm && (
                      <p className="text-xs text-destructive">{fieldErrors.confirm}</p>
                    )}
                  </motion.div>
                )}

                {/* Submit */}
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-11 glow-primary"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      {mode === 'signin' ? 'Sign In' : 'Create Account'}
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>

                {/* Switch mode text */}
                <p className="text-xs text-center text-muted-foreground">
                  {mode === 'signin' ? (
                    <>
                      Don't have an account?{' '}
                      <button type="button" onClick={() => setMode('signup')} className="text-primary hover:underline">
                        Sign up
                      </button>
                    </>
                  ) : (
                    <>
                      Already have an account?{' '}
                      <button type="button" onClick={() => setMode('signin')} className="text-primary hover:underline">
                        Sign in
                      </button>
                    </>
                  )}
                </p>
              </motion.form>
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Bottom info */}
        <div className="mt-6 text-center">
          <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
            <div className="h-1.5 w-1.5 rounded-full bg-accent" />
            Secured on Flare Network · Coston2 Testnet
          </div>
        </div>
      </motion.div>
    </div>
  );
}
