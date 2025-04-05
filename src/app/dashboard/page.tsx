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

        {/* Content based on active tab */}
        <div className="bg-white shadow rounded-lg p-4 sm:p-6">
          {activeTab === 'appointments' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Your Appointments</h2>
                <Link 
                  href="/services" 
                  className="bg-blue-600 text-white py-2 px-4 rounded-md text-sm hover:bg-blue-700"
                >
                  Book New Appointment
                </Link>
              </div>
              
              {appointments.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-gray-500">You don't have any appointments yet.</p>
                  <Link 
                    href="/services" 
                    className="mt-4 inline-block bg-blue-600 text-white py-2 px-4 rounded-md text-sm hover:bg-blue-700"
                  >
                    Browse Services
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Service
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Provider
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date & Time
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {appointments.map((appointment) => (
                        <tr key={appointment.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{appointment.services?.name || 'Unknown Service'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {appointment.provider?.first_name} {appointment.provider?.last_name}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {new Date(appointment.start_time).toLocaleDateString()} at{' '}
                              {new Date(appointment.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              appointment.status === 'confirmed' 
                                ? 'bg-green-100 text-green-800' 
                                : appointment.status === 'pending' 
                                ? 'bg-yellow-100 text-yellow-800' 
                                : appointment.status === 'cancelled' 
                                ? 'bg-red-100 text-red-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <button className="text-blue-600 hover:text-blue-800">View Details</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'auctions' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Your Auction Bids</h2>
                <Link 
                  href="/auctions" 
                  className="bg-blue-600 text-white py-2 px-4 rounded-md text-sm hover:bg-blue-700"
                >
                  View Active Auctions
                </Link>
              </div>
              
              {bids.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-gray-500">You haven't placed any bids yet.</p>
                  <Link 
                    href="/auctions" 
                    className="mt-4 inline-block bg-blue-600 text-white py-2 px-4 rounded-md text-sm hover:bg-blue-700"
                  >
                    Browse Auctions
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Service
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Provider
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Your Bid
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Current Price
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {bids.map((bid) => (
                        <tr key={bid.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {bid.auctions?.services?.name || 'Unknown Service'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {bid.auctions?.provider?.first_name} {bid.auctions?.provider?.last_name}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              ${(bid.amount / 100).toFixed(2)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              ${bid.auctions?.current_price ? (bid.auctions.current_price / 100).toFixed(2) : 'N/A'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              bid.auctions?.current_winner_id === user.id
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {bid.auctions?.current_winner_id === user.id ? 'Winning' : 'Outbid'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <Link href={`/auctions/${bid.auction_id}`} className="text-blue-600 hover:text-blue-800">
                              View Auction
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'profile' && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Your Profile</h2>
              
              {profileData ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Personal Information</h3>
                      <div className="mt-2 border rounded-md p-4">
                        <div className="mb-2">
                          <span className="text-sm text-gray-500">Name:</span>
                          <p className="text-sm font-medium">
                            {profileData.first_name} {profileData.last_name}
                          </p>
                        </div>
                        <div className="mb-2">
                          <span className="text-sm text-gray-500">Email:</span>
                          <p className="text-sm font-medium">{profileData.email}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">Phone:</span>
                          <p className="text-sm font-medium">{profileData.phone_number || 'Not provided'}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Account Settings</h3>
                      <div className="mt-2 border rounded-md p-4">
                        <div className="mb-2">
                          <span className="text-sm text-gray-500">Account Type:</span>
                          <p className="text-sm font-medium capitalize">
                            {profileData.user_type.replace('_', ' ')}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">Member Since:</span>
                          <p className="text-sm font-medium">
                            {new Date(profileData.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t pt-6 flex justify-end">
                    <button className="bg-blue-600 text-white py-2 px-4 rounded-md text-sm hover:bg-blue-700">
                      Edit Profile
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="mt-2 text-gray-500">Loading profile data...</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}