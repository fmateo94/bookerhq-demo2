'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { getSupabaseClient } from '@/lib/supabaseClient';
import Navbar from '@/components/ui/Navbar';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Dashboard() {
  const { user, isLoading } = useAuth();
  const [profileData, setProfileData] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [bids, setBids] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('appointments');
  const router = useRouter();

  useEffect(() => {
    // Redirect if not logged in
    if (!isLoading && !user) {
      router.push('/auth/signin');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user) {
      const supabase = getSupabaseClient();
      if (!supabase) return;

      // Fetch user profile
      const fetchProfile = async () => {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
        } else {
          setProfileData(data);
        }
      };

      // Fetch appointments
      const fetchAppointments = async () => {
        const { data, error } = await supabase
          .from('appointments')
          .select(`
            *,
            services:service_id(*),
            provider:provider_id(*)
          `)
          .eq('customer_id', user.id)
          .order('start_time', { ascending: true });

        if (error) {
          console.error('Error fetching appointments:', error);
        } else {
          setAppointments(data || []);
        }
      };

      // Fetch bids
      const fetchBids = async () => {
        const { data, error } = await supabase
          .from('bids')
          .select(`
            *,
            auctions:auction_id(
              *,
              services:service_id(*),
              provider:provider_id(*)
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching bids:', error);
        } else {
          setBids(data || []);
        }
      };

      fetchProfile();
      fetchAppointments();
      fetchBids();
    }
  }, [user]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Profile header */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-4 py-5 sm:px-6">
            <h1 className="text-lg font-semibold">Welcome back, {profileData?.first_name}</h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage your appointments, auctions, and account settings.
            </p>
          </div>
        </div>

        {/* Rest of the dashboard code... */}
        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('appointments')}
              className={`${
                activeTab === 'appointments'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Appointments
            </button>
            <button
              onClick={() => setActiveTab('auctions')}
              className={`${
                activeTab === 'auctions'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              My Bids
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`${
                activeTab === 'profile'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Profile
            </button>
          </nav>
        </div>

        {/* Tab content remains the same... */}
      </main>
    </div>
  );
}