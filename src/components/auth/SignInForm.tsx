'use client';

import { useState } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';

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
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
            <FiMail className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <h2 className="text-2xl font-medium mb-4">Check Your Email</h2>
        
        <p className="text-[#64748B] mb-6">
          We've sent password reset instructions to{' '}
          <span className="font-medium">{email}</span>
        </p>

        <button
          onClick={() => {
            setShowForgotPassword(false);
            setResetEmailSent(false);
          }}
          className="text-[#3B82F6] hover:text-blue-700 font-medium"
        >
          Back to Sign In
        </button>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm">
          {error}
        </div>
      )}
      
      <form onSubmit={showForgotPassword ? handleForgotPassword : handleSignIn}>
        <div className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm text-[#475569] mb-1.5">
              Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiMail className="h-5 w-5 text-[#94A3B8]" />
              </div>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="block w-full pl-10 pr-3 py-2.5 border border-[#E2E8F0] rounded-lg text-[#1E293B] text-sm focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6]"
                placeholder="Enter your email"
              />
            </div>
          </div>
          
          {!showForgotPassword && (
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="password" className="block text-sm text-[#475569]">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-xs text-[#3B82F6] hover:text-blue-700"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiLock className="h-5 w-5 text-[#94A3B8]" />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="block w-full pl-10 pr-10 py-2.5 border border-[#E2E8F0] rounded-lg text-[#1E293B] text-sm focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6]"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <FiEyeOff className="h-5 w-5 text-[#94A3B8]" />
                  ) : (
                    <FiEye className="h-5 w-5 text-[#94A3B8]" />
                  )}
                </button>
              </div>
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#3B82F6] text-white py-2.5 px-4 rounded-lg text-sm font-medium hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors mt-6"
          >
            {loading
              ? showForgotPassword
                ? 'Sending Reset Email...'
                : 'Signing in...'
              : showForgotPassword
                ? 'Send Reset Email'
                : 'Sign In'
            }
          </button>
        </div>
      </form>
      
      {!showForgotPassword && (
        <div className="mt-6 text-center">
          <p className="text-sm text-[#64748B]">
            Don't have an account?{' '}
            <Link href="/auth/signup" className="text-[#3B82F6] hover:text-blue-700 font-medium">
              Sign Up
            </Link>
          </p>
        </div>
      )}
      
      {showForgotPassword && (
        <div className="mt-6 text-center">
          <button
            onClick={() => setShowForgotPassword(false)}
            className="text-sm text-[#3B82F6] hover:text-blue-700 font-medium"
          >
            Back to Sign In
          </button>
        </div>
      )}
    </div>
  );
}