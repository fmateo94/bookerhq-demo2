'use client';

import Link from 'next/link';
import SignUpForm from '@/components/auth/SignUpForm';
import { Manrope } from 'next/font/google';
import { Suspense } from 'react';

const manrope = Manrope({ subsets: ['latin'] });

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="w-full max-w-md px-8 py-10 bg-white shadow-lg rounded-lg">
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-6">
          Create Account
        </h1>
        <Suspense fallback={<div className="text-center py-4">Loading form...</div>}>
          <SignUpForm />
        </Suspense>
        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/auth/signin" className="font-medium text-blue-600 hover:text-blue-500">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}