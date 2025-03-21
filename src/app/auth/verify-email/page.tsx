export const dynamic = 'force-dynamic';

'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { FiMail } from 'react-icons/fi';

export default function VerifyEmail() {
  const searchParams = useSearchParams();
  const email = searchParams?.get('email') || '';

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
        
        {email ? (
          <p className="text-gray-600 mb-6">
            We've sent a verification link to{' '}
            <span className="font-medium">{email}</span>. Click the link to verify your email address and complete your registration.
          </p>
        ) : (
          <p className="text-gray-600 mb-6">
            Please check your email for the verification link to complete your registration.
          </p>
        )}

        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Didn't receive the email? Check your spam folder or{' '}
            <Link href="/auth/signup" className="text-blue-600 hover:text-blue-800">
              try signing up again
            </Link>
          </p>

          <p className="text-sm text-gray-500">
            Already verified?{' '}
            <Link href="/auth/signin" className="text-blue-600 hover:text-blue-800">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
} 