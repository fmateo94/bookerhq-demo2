'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/ui/Navbar';
import { useTenant } from '@/contexts/TenantContext';

export default function TenantBookingPage() {
  const { tenantId } = useParams();
  const tenant = useTenant(); // Use the tenant context instead of local state

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Business Info */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{tenant.name}</h1>
          <p className="mt-2 text-gray-600">Opening {tenant.opening_hours.saturday.open} • <a href={`tel:${tenant.phone}`} className="text-blue-600">{tenant.phone}</a> • <a href={`mailto:${tenant.email}`} className="text-blue-600">{tenant.email}</a></p>
          <p className="mt-2 text-gray-600">{tenant.description}</p>
          <p className="mt-2 text-gray-600">{tenant.address}</p>
        </div>

        {/* Booking Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link 
            href={`/${tenantId}/services`}
            className="block p-6 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
          >
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Book by Service</h2>
            <p className="text-gray-600">Choose from our range of services and then select your preferred staff member</p>
          </Link>

          <Link 
            href={`/${tenantId}/staff`}
            className="block p-6 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
          >
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Book by Staff</h2>
            <p className="text-gray-600">Choose your preferred staff member and then select from their available services</p>
          </Link>
        </div>

        {/* My Bookings Button */}
        <div className="mt-8">
          <Link
            href={`/${tenantId}/bookings`}
            className="block w-full md:w-auto text-center px-6 py-3 border-2 border-gray-900 rounded-lg text-gray-900 font-medium hover:bg-gray-50 transition-colors"
          >
            My bookings
          </Link>
        </div>
      </main>
    </div>
  );
} 