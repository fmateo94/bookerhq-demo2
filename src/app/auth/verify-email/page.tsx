import type { Metadata } from 'next';
import VerifyEmailContent from '@/components/auth/VerifyEmailContent';

export const metadata: Metadata = {
  title: 'Verify Email - Booker',
  description: 'Verify your email address to complete your registration.',
};

export const dynamic = 'error';
export const dynamicParams = false;
export const revalidate = false;

export default function VerifyEmailPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center">
      <VerifyEmailContent />
    </main>
  );
} 