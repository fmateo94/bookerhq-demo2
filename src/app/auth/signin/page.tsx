'use client';

export const dynamic = 'force-dynamic';

import SignInForm from '@/components/auth/SignInForm';
import { Manrope } from 'next/font/google';

const manrope = Manrope({ subsets: ['latin'] });

export default function SignInPage() {
  return (
    <div className="min-h-screen flex bg-white">
      {/* Form */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-[420px]">
          <h1 className={`${manrope.className} text-[36px] font-normal text-black mb-2 text-center tracking-[-0.015em]`}>
            Sign In
          </h1>
          <p className="text-[#64748B] text-center mb-10 text-[15px]">
            Sign in to continue to your account
          </p>
          <SignInForm />
        </div>
      </div>
    </div>
  );
}