'use client';

import { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { useRouter, useSearchParams } from 'next/navigation';
import { FiMail, FiEye, FiEyeOff } from 'react-icons/fi';
import { Roboto } from 'next/font/google';

const roboto = Roboto({ weight: ['400', '900'], subsets: ['latin'] });

export default function SignInForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const errorParam = searchParams.get('error');

  // Set initial error state from URL parameter if present
  useEffect(() => {
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
    }
  }, [errorParam]);

  // Handle URL fragments for authentication
  useEffect(() => {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') return;

    // Look for authentication tokens in hash or fragment parameter
    const hasUrlHash = window.location.hash && window.location.hash.includes('access_token');
    const fragmentParam = searchParams.get('fragment');
    
    if (fragmentParam || hasUrlHash) {
      console.log('Found authentication token data, attempting to process...');
      
      // If we have a fragment parameter, reconstruct the hash
      if (fragmentParam && !hasUrlHash) {
        console.log('Reconstructing hash from fragment parameter');
        // Reconstruct the hash and reset the URL
        const decodedFragment = decodeURIComponent(fragmentParam);
        window.history.replaceState(
          null, 
          '', 
          `${window.location.pathname}#${decodedFragment}`
        );
        // Return early, the hash change will trigger this effect again
        return;
      }
      
      const handleHashParams = async () => {
        try {
          setLoading(true);
          const supabase = getSupabaseClient();
          if (!supabase) {
            throw new Error('Supabase client not initialized');
          }
          
          // Extract tokens directly from the hash
          let accessToken, refreshToken;
          
          if (hasUrlHash) {
            // Parse hash parameters manually to ensure we get everything
            const hashParams = new URLSearchParams(window.location.hash.substring(1));
            accessToken = hashParams.get('access_token');
            refreshToken = hashParams.get('refresh_token');
            
            console.log('Extracted tokens from URL hash');
          }
          
          if (!accessToken) {
            throw new Error('No access token found in URL hash');
          }
          
          console.log('Setting session with access token');
          
          // Explicitly set the session with the tokens
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });
          
          if (sessionError) {
            console.error('Error setting session:', sessionError);
            throw sessionError;
          }
          
          if (!sessionData.session) {
            throw new Error('Failed to create session from tokens');
          }
          
          console.log('Session successfully created');
          
          // Get user information
          const { data: userData, error: userError } = await supabase.auth.getUser();
          
          if (userError) {
            console.error('Error getting user after setting session:', userError);
            throw userError;
          }
          
          if (!userData?.user) {
            throw new Error('No user data returned after authentication');
          }
          
          console.log('Successfully authenticated user');
          
          // Clear the hash from the URL
          window.history.replaceState(
            null, 
            '', 
            window.location.pathname + window.location.search
          );
          
          // Redirect based on user type
          if (userData.user.user_metadata?.user_type === 'tenant') {
            router.push('/auth/create-business');
          } else {
            router.push('/dashboard');
          }
        } catch (error) {
          console.error('Error processing authentication:', error);
          setError('Authentication failed. Please try signing in again.');
        } finally {
          setLoading(false);
        }
      };
      
      handleHashParams();
    }
  }, [router, searchParams]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (data?.user) {
        router.push('/dashboard');
        router.refresh();
      }
    } catch (error) {
      const errorMessage = 
        error && typeof error === 'object' && 'message' in error
          ? error.message as string
          : 'An error occurred during sign in';
      
      setError(errorMessage);
      console.error('Error signing in:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        throw error;
      }

      setResetEmailSent(true);
    } catch (error) {
      const errorMessage = 
        error && typeof error === 'object' && 'message' in error
          ? error.message as string
          : 'An error occurred while sending reset email';
      
      setError(errorMessage);
      console.error('Error sending reset email:', error);
    } finally {
      setLoading(false);
    }
  };

  if (resetEmailSent) {
    return (
      <div className="text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-[#EEF2FF] rounded-full flex items-center justify-center mx-auto">
            <FiMail className="w-8 h-8 text-[#6366F1]" />
          </div>
        </div>

        <h2 className={`${roboto.className} text-[24px] font-semibold mb-4`}>
          Check Your Email
        </h2>
        
        <p className="text-[#64748B] mb-6 text-[15px]">
          We&apos;ve sent password reset instructions to{' '}
          <span className="font-medium">{email}</span>
        </p>

        <button
          onClick={() => {
            setShowForgotPassword(false);
            setResetEmailSent(false);
          }}
          className="text-[#6366F1] hover:text-[#4F46E5] font-medium text-[15px]"
        >
          Back to Sign In
        </button>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-6 p-4 bg-[#FEF2F2] border border-[#FEE2E2] text-[#B91C1C] rounded-lg text-[14px]">
          {error}
        </div>
      )}
      
      <form onSubmit={showForgotPassword ? handleForgotPassword : handleSignIn} className="space-y-6">
        <div>
          <div className="relative">
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={`${roboto.className} block w-full px-4 py-[14px] bg-white border-2 border-black rounded-lg text-[15px] placeholder-[#64748B] focus:outline-none focus:border-black`}
              placeholder="Email"
            />
          </div>
        </div>
        
        {!showForgotPassword && (
          <div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={`${roboto.className} block w-full px-4 py-[14px] bg-white border-2 border-black rounded-lg text-[15px] placeholder-[#64748B] focus:outline-none focus:border-black`}
                placeholder="Password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center"
              >
                {showPassword ? (
                  <FiEyeOff className="h-5 w-5 text-black" />
                ) : (
                  <FiEye className="h-5 w-5 text-black" />
                )}
              </button>
            </div>
            <div className="flex justify-end mt-2">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className={`${roboto.className} text-[14px] text-black hover:text-[#4F46E5]`}
              >
                Forgot Password?
              </button>
            </div>
          </div>
        )}
        
        <button
          type="submit"
          disabled={loading}
          className={`${roboto.className} w-full bg-black text-white py-[14px] px-4 rounded-lg font-black text-[13px] tracking-[0.04em] uppercase hover:bg-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 disabled:opacity-50 transition-colors`}
        >
          {loading
            ? showForgotPassword
              ? 'Sending Reset Email...'
              : 'Signing in...'
            : showForgotPassword
              ? 'Send Reset Email'
              : 'Log in'
          }
        </button>
      </form>
    </div>
  );
}