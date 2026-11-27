"use client";

import React, { useState } from 'react';
import { signInWithEmailAndPassword, signInWithPopup, signInWithRedirect, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { Atom, ArrowRight, Eye, EyeOff, LockKeyhole } from 'lucide-react';

const googleProvider = new GoogleAuthProvider();

// Firebase error codes -> messages that do not leak whether an account exists.
function describeAuthError(err: unknown, fallback: string): string {
  const code = (err as { code?: string })?.code || '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-email':
      return 'Invalid email or password.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a few minutes and try again.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Sign-in was cancelled.';
    default:
      return fallback;
  }
}

// Google "G" SVG icon
const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5">
    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
  </svg>
);

export default function Login() {
  const { authError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) { setError('Sign-in is unavailable. Contact the vault administrator.'); return; }
    setError(null);
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: unknown) {
      setError(describeAuthError(err, 'Failed to sign in.'));
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!auth) { setError('Sign-in is unavailable. Contact the vault administrator.'); return; }
    setError(null);
    setIsGoogleLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      // Mobile browsers often block popups; a full-page redirect still works there.
      if ((err as { code?: string })?.code === 'auth/popup-blocked') {
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectError) {
          setError(describeAuthError(redirectError, 'Google sign-in failed.'));
          setIsGoogleLoading(false);
          return;
        }
      }
      setError(describeAuthError(err, 'Google sign-in failed.'));
      setIsGoogleLoading(false);
    }
  };

  return (
    <main className="access-page">
      <header className="access-header">
        <div className="wordmark"><Atom aria-hidden="true" /><span>Molecular Zettelkasten</span></div>
        <span className="privacy-label"><LockKeyhole size={14} aria-hidden="true" /> Private vault</span>
      </header>

      <div className="access-layout">
        <section className="study-cover" aria-labelledby="cover-title">
          <div className="cover-image" />
          <div className="cover-copy">
            <h1 id="cover-title">Molecular<br /><em>Zettelkasten</em></h1>
            <p>A personal knowledge base for connected notes and research.</p>
          </div>
        </section>

        <section className="access-form-panel" aria-labelledby="login-title">
          <div className="access-form-inner">
            <h2 id="login-title">Welcome back.</h2>
            <p className="form-intro">Sign in to your research workspace.</p>
            {(error || authError) && <p role="alert" className="form-alert">{error || authError}</p>}
            <button type="button" className="google-button" onClick={handleGoogleLogin} disabled={isGoogleLoading || isLoading}>
              <GoogleIcon /> {isGoogleLoading ? 'Signing in…' : 'Continue with Google'}
            </button>
            <div className="form-divider">or use email</div>
            <form onSubmit={handleLogin} className="flex flex-col gap-5">
              <div>
                <label htmlFor="email">Email address</label>
                <input id="email" type="email" autoComplete="email" inputMode="email" value={email}
                  onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
              </div>
              <div>
                <label htmlFor="password">Password</label>
                <div className="relative">
                  <input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password"
                    value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required />
                  <button type="button" className="password-toggle" aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>
              <button type="submit" className="primary-button" disabled={isLoading || isGoogleLoading}>
                {isLoading ? 'Signing in…' : 'Sign in'} <ArrowRight size={17} aria-hidden="true" />
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
