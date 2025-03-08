'use client';

export const dynamic = 'force-dynamic';

import SignUpForm from '@/components/auth/SignUpForm';
import Navbar from '@/components/ui/Navbar';

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <SignUpForm />
      </div>
    </div>
  );
}