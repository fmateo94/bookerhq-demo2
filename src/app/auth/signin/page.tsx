'use client';

import SignInForm from '@/components/auth/SignInForm';
import { Comfortaa } from 'next/font/google';

const comfortaa = Comfortaa({ subsets: ['latin'] });

export default function SignInPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-[420px] space-y-8">
        <div className="text-center">
          <h1 className={`${comfortaa.className} text-[36px] font-normal text-black tracking-[-0.015em] mb-2`}>
            Log in
          </h1>
          <p className="text-[15px] text-[#64748B]">
            Sign in to continue to your account
          </p>
        </div>
        <SignInForm />
      </div>
    </div>
  );
}