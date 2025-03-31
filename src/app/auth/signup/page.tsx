'use client';

import SignUpForm from '@/components/auth/SignUpForm';
import { Manrope } from 'next/font/google';

const manrope = Manrope({ subsets: ['latin'] });

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex bg-white">
      {/* Form */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-[420px]">
          <h1 className={`${manrope.className} text-[36px] font-normal text-black mb-2 text-center tracking-[-0.015em]`}>
            Register
          </h1>
          <p className="text-[#64748B] text-center mb-10 text-[15px]">
            Create your account to get started
          </p>
          <SignUpForm />
        </div>
      </div>
    </div>
  );
}