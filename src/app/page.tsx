'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import Navbar from '@/components/ui/Navbar';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      <Navbar />
      
      {/* Hero Section */}
      <div className="relative bg-white overflow-hidden">
        {/* Hero content remains the same... */}
      </div>

      {/* Features Section */}
      <div className="py-12 bg-white">
        {/* Features content remains the same... */}
      </div>

      {/* CTA Section */}
      <div className="bg-blue-700">
        {/* CTA content remains the same... */}
      </div>
    </main>
  );
}