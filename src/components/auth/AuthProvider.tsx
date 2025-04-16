'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseClient();

    if (!supabase) {
      setIsLoading(false);
      return;
    }

    // Get session from storage
    const getSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
        }
        
        setSession(data?.session || null);
        setUser(data?.session?.user || null);
      } catch (err) {
        console.error('Failed to get auth session:', err);
      } finally {
        setIsLoading(false);
      }
    };

    getSession();

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user || null);
        setIsLoading(false);
      }
    );

    // Cleanup on unmount
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      console.log('AuthProvider: Starting sign out...');
      const supabase = getSupabaseClient();
      if (supabase) {
        const { error } = await supabase.auth.signOut();
        
        // Check if the error is specifically AuthSessionMissingError
        const isSessionMissingError = error && error.name === 'AuthSessionMissingError';

        if (error && !isSessionMissingError) {
          // If it's a different error, log and re-throw it
          console.error('AuthProvider: Error signing out:', error);
          throw error;
        } else if (isSessionMissingError) {
          // If it's the session missing error, just log it
          console.warn('AuthProvider: Sign out attempted but session was already missing.', error);
        } else {
          // No error
          console.log('AuthProvider: Sign out successful via Supabase.');
        }

        // Always clear local state regardless of session missing error
        console.log('AuthProvider: Clearing local user/session state.');
        setUser(null);
        setSession(null);
      }
    } catch (error) {
      // Catch errors re-thrown from the check above or other unexpected errors
      if (error.name !== 'AuthSessionMissingError') { // Avoid double logging if already handled
         console.error('AuthProvider: Unexpected error during sign out:', error);
      }
      // Even if there was an error, ensure local state is cleared as a fallback
      setUser(null);
      setSession(null);
      // Optional: Re-throw if you need calling components (like Navbar) to know about critical errors
      // throw error;
    }
  };

  const value = {
    user,
    session,
    isLoading,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;