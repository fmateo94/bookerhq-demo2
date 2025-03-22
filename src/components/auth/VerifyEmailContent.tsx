'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FiMail, FiArrowLeft } from 'react-icons/fi';

export default function VerifyEmailContent() {
  const [email, setEmail] = useState<string>('');
  
  useEffect(() => {
    // Get email from URL in client-side only
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
  }, []);

  return (
    <div className="w-full max-w-[480px] mx-auto">
      <div className="bg-white rounded-[20px] shadow-[0px_4px_12px_rgba(0,0,0,0.1)] p-8">
        <div className="flex items-center mb-6">
          <Link 
            href="/auth/signup" 
            className="flex items-center text-[#64748B] hover:text-[#334155] transition-colors"
          >
            <FiArrowLeft className="w-5 h-5 mr-2" />
            <span className="text-sm font-medium">Back to Sign Up</span>
          </Link>
        </div>

        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex justify-center mb-8"
        >
          <div className="w-20 h-20 bg-[#EEF2FF] rounded-full flex items-center justify-center">
            <FiMail className="w-10 h-10 text-[#6366F1]" />
          </div>
        </motion.div>

        <h1 className="text-[32px] font-bold text-[#0F172A] mb-4 text-center">
          Check Your Email
        </h1>
        
        {email ? (
          <p className="text-[#64748B] text-lg mb-8 text-center">
            We've sent a verification link to{' '}
            <span className="font-semibold text-[#334155]">{email}</span>. Click the link to verify your email address and complete your registration.
          </p>
        ) : (
          <p className="text-[#64748B] text-lg mb-8 text-center">
            Please check your email for the verification link to complete your registration.
          </p>
        )}

        <div className="space-y-4 text-center">
          <p className="text-[#64748B]">
            Didn't receive the email? Check your spam folder or{' '}
            <Link href="/auth/signup" className="text-[#6366F1] hover:text-[#4F46E5] font-medium">
              try signing up again
            </Link>
          </p>

          <p className="text-[#64748B]">
            Already verified?{' '}
            <Link href="/auth/signin" className="text-[#6366F1] hover:text-[#4F46E5] font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
} 