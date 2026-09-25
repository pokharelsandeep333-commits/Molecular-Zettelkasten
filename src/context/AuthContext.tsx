"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, onIdTokenChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { isAllowedEmail } from '@/lib/allowedEmails';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  authError: string | null;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, authError: null, logout: async () => {} });

export const useAuth = () => useContext(AuthContext);

// Mirror the ID token into the httpOnly cookie /api/raw uses for <img>/<iframe> loads.
async function syncSessionCookie(user: User | null) {
  try {
    if (user) {
      const token = await user.getIdToken();
      await fetch('/api/session', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    } else {
      await fetch('/api/session', { method: 'DELETE' });
    }
  } catch (error) {
    console.error('Session cookie sync failed:', error);
  }
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const logout = useCallback(async () => {
    try {
      // Don't leave private chats or note history behind on a shared device.
      try {
        for (const key of ['mz_chat_sessions', 'arc_active_note', 'arc_recent_files']) {
          window.localStorage.removeItem(key);
        }
      } catch {
        // Storage unavailable; nothing cached to clear.
      }
      await auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }, [router]);

  // Fires on sign-in, sign-out and every hourly token refresh.
  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onIdTokenChanged(auth, async (nextUser) => {
      if (nextUser && !isAllowedEmail(nextUser.email)) {
        setAuthError('Access denied: this account is not authorized for this vault.');
        await auth.signOut();
        return; // signOut re-fires this listener with null
      }
      if (nextUser) setAuthError(null);
      await syncSessionCookie(nextUser);
      setUser(nextUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Route guard, kept separate so navigation does not re-subscribe the auth listener.
  useEffect(() => {
    if (loading) return;
    if (!user && pathname !== '/login') router.replace('/login');
    else if (user && pathname === '/login') router.replace('/');
  }, [user, loading, pathname, router]);

  return (
    <AuthContext.Provider value={{ user, loading, authError, logout }}>
      {loading ? (
        <div className="min-h-dvh bg-[#02050C] flex items-center justify-center" role="status" aria-label="Loading">
          <div className="w-16 h-16 border-4 border-surface-container border-t-electric-cyan rounded-full animate-spin"></div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};
