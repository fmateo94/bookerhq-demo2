'use client';

import Link from 'next/link';
import SignInForm from '@/components/auth/SignInForm';
import { Comfortaa } from 'next/font/google';
import { Suspense } from 'react';

const comfortaa = Comfortaa({ subsets: ['latin'] });

export default function SignInPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="w-full max-w-md px-8 py-10 bg-white shadow-lg rounded-lg">
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-6">
          Sign In
        </h1>
        <Suspense fallback={<div className="text-center py-4">Loading form...</div>}>
          <SignInForm />
        </Suspense>
        <p className="mt-6 text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <Link href="/auth/signup" className="font-medium text-blue-600 hover:text-blue-500">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}