'use client';

import { useState } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FiMail } from 'react-icons/fi';

export default function SignInForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
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
      <div className="w-full max-w-md mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="flex justify-center mb-6"
          >
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <FiMail className="w-8 h-8 text-blue-600" />
            </div>
          </motion.div>

          <h1 className="text-2xl font-bold mb-4">Check Your Email</h1>
          
          <p className="text-gray-600 mb-6">
            We've sent password reset instructions to{' '}
            <span className="font-medium">{email}</span>.
          </p>

          <button
            onClick={() => {
              setShowForgotPassword(false);
              setResetEmailSent(false);
            }}
            className="text-blue-600 hover:text-blue-800"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-6 text-center">
          {showForgotPassword ? 'Reset Password' : 'Sign In'}
        </h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        
        <form onSubmit={showForgotPassword ? handleForgotPassword : handleSignIn}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="jane@example.com"
            />
          </div>
          
          {!showForgotPassword && (
            <div className="mb-6">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
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
        </form>
        
        <div className="mt-4 text-center space-y-2">
          {!showForgotPassword ? (
            <>
              <button
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Forgot your password?
              </button>
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <Link href="/auth/signup" className="text-blue-600 hover:text-blue-800">
                  Sign Up
                </Link>
              </p>
            </>
          ) : (
            <button
              onClick={() => setShowForgotPassword(false)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Back to Sign In
            </button>
          )}
        </div>
      </div>
    </div>
  );
}