'use client';

import { useState } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';
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
          We've sent password reset instructions to{' '}
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
      
      <div className="mt-8 text-center">
        <p className={`${roboto.className} text-[#64748B] text-[15px]`}>
          Don't have an account?{' '}
          <Link href="/auth/signup" className="text-black hover:text-[#4F46E5] font-medium">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}