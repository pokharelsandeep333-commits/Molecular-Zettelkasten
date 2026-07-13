"use client";

import React, { useState } from 'react';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Network } from 'lucide-react';

const googleProvider = new GoogleAuthProvider();

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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      setError(err.message || 'Failed to login');
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setIsGoogleLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed');
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-abyssal-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-glass-surface backdrop-blur-md border border-whisper-border rounded-xl shadow-2xl p-8 flex flex-col items-center">
        <div className="w-12 h-12 rounded-lg bg-electric-cyan/20 border border-electric-cyan flex items-center justify-center mb-6">
          <Network className="text-electric-cyan w-6 h-6" />
        </div>

        <h1 className="text-2xl font-bold text-pure-ink mb-2">Sign In</h1>
        <p className="text-muted-steel text-sm mb-8 text-center">
          Secure access to the Molecular Zettelkasten knowledge graph.
        </p>

        {error && (
          <div className="w-full bg-red-950/40 border border-red-500/50 text-red-300 text-sm p-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Google Sign In */}
        <button
          onClick={handleGoogleLogin}
          disabled={isGoogleLoading || isLoading}
          className="w-full flex items-center justify-center gap-3 bg-surface-container hover:bg-surface-container-high border border-whisper-border hover:border-electric-cyan/40 text-pure-ink font-medium py-3 rounded-lg transition-all active:-translate-y-px disabled:opacity-50 mb-6"
        >
          <GoogleIcon />
          {isGoogleLoading ? 'Signing in...' : 'Continue with Google'}
        </button>

        {/* Divider */}
        <div className="w-full flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-whisper-border"></div>
          <span className="text-muted-steel text-xs font-mono uppercase tracking-widest">or</span>
          <div className="flex-1 h-px bg-whisper-border"></div>
        </div>

        {/* Email + Password */}
        <form onSubmit={handleLogin} className="w-full flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="font-mono text-xs text-muted-steel uppercase tracking-widest">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-surface-container border border-outline focus:border-electric-cyan rounded-lg py-2.5 px-4 text-pure-ink placeholder-muted-steel focus:outline-none focus:ring-1 focus:ring-electric-cyan transition-all text-sm"
              placeholder="operator@system.local"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-mono text-xs text-muted-steel uppercase tracking-widest">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-surface-container border border-outline focus:border-electric-cyan rounded-lg py-2.5 px-4 text-pure-ink placeholder-muted-steel focus:outline-none focus:ring-1 focus:ring-electric-cyan transition-all text-sm"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || isGoogleLoading}
            className="w-full mt-2 bg-electric-cyan hover:bg-cyan-400 text-abyssal-bg font-bold py-3 rounded-lg transition-all active:-translate-y-px disabled:opacity-50"
          >
            {isLoading ? 'Authenticating...' : 'Enter System'}
          </button>
        </form>
      </div>
    </div>
  );
}
