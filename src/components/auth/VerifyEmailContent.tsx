'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FiMail, FiArrowLeft } from 'react-icons/fi';
import { Roboto } from 'next/font/google';
import { supabase } from '@/lib/supabaseClient';

const roboto = Roboto({ 
  weight: ['400', '900'],
  subsets: ['latin']
});

export default function VerifyEmailContent() {
  const [email, setEmail] = useState<string>('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    // Get email from URL in client-side only
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
  }, []);

  const handleResendEmail = async () => {
    if (!email) return;
    
    setResendLoading(true);
    setError(null);
    setResendSuccess(false);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;
      setResendSuccess(true);
    } catch (error) {
      console.error('Error resending verification email:', error);
      setError(
        error instanceof Error 
          ? error.message 
          : 'Failed to resend verification email'
      );
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[420px] mx-auto">
      <div className="p-8">
        <div className="flex items-center mb-6">
          <Link 
            href="/auth/signup" 
            className="flex items-center text-black hover:text-gray-700 transition-colors"
          >
            <FiArrowLeft className="w-5 h-5 mr-2" />
            <span className={`${roboto.className} text-sm`}>Back to Sign Up</span>
          </Link>
        </div>

        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex justify-center mb-8"
        >
          <div className="w-20 h-20 bg-black bg-opacity-5 rounded-full flex items-center justify-center">
            <FiMail className="w-10 h-10 text-black" />
          </div>
        </motion.div>

        <h1 className={`${roboto.className} text-[32px] font-normal text-black mb-4 text-center`}>
          Check Your Email
        </h1>
        
        {email ? (
          <p className={`${roboto.className} text-black text-[15px] mb-8 text-center`}>
            We've sent a verification link to{' '}
            <span className="font-semibold">{email}</span>. Click the link to verify your email address and complete your registration.
          </p>
        ) : (
          <p className={`${roboto.className} text-black text-[15px] mb-8 text-center`}>
            Please check your email for the verification link to complete your registration.
          </p>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm">
            {error}
          </div>
        )}

        {resendSuccess && (
          <div className="mb-6 p-4 bg-green-50 border border-green-100 text-green-600 rounded-lg text-sm">
            Verification email has been resent successfully.
          </div>
        )}

        <div className="space-y-4 text-center">
          <button
            onClick={handleResendEmail}
            disabled={resendLoading || !email}
            className={`${roboto.className} text-black hover:text-gray-700 transition-colors text-[15px] underline disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {resendLoading ? 'Sending...' : 'Resend verification email'}
          </button>

          <p className={`${roboto.className} text-black text-[15px]`}>
            Already verified?{' '}
            <Link href="/auth/signin" className="underline hover:text-gray-700 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
} 