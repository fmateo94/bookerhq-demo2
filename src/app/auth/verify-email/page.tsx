import type { Metadata } from 'next';
import VerifyEmailContent from '@/components/auth/VerifyEmailContent';
import Navbar from '@/components/ui/Navbar';

export const metadata: Metadata = {
  title: 'Verify Email - Booker',
  description: 'Verify your email address to complete your registration.',
};

export const dynamic = 'error';
export const dynamicParams = false;
export const revalidate = false;

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-[#F8F9FF]">
      <Navbar />
      <main className="flex flex-col items-center justify-center px-4 py-12">
        <VerifyEmailContent />
      </main>
    </div>
  );
} 