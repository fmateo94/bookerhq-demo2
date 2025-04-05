'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabaseClient';
import Navbar from '@/components/ui/Navbar';
import { Service, Profile } from '@/types/service';
import { useTenant } from '@/contexts/TenantContext';

type StaffMember = Profile & {
  services: Service[];
};

export default function StaffPage() {
  const { tenantId } = useParams();
  const tenant = useTenant();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('all'); // 'all', 'barber', or 'tattoo_artist'

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const supabase = getSupabaseClient();
        if (!supabase) throw new Error('Supabase client not initialized');

        // Fetch staff with their services for this tenant
        const { data: staffData, error: staffError } = await supabase
          .from('profiles')
          .select(`
            *,
            services (*)
          `)
          .eq('tenant_id', tenant.id)
          .in('user_type', ['barber', 'tattoo_artist']);

        if (staffError) throw staffError;
        setStaff(staffData || []);
      } catch (error) {
        console.error('Error fetching staff:', error);
        setError('Failed to load staff members. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [tenant.id]);

  const filteredStaff = staff.filter(member => 
    filter === 'all' || member.user_type === filter
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Our Staff</h1>
          <Link
            href={`/${tenantId}`}
            className="text-blue-600 hover:text-blue-800"
          >
            ← Back
          </Link>
        </div>

        {/* Staff Type Filter */}
        <div className="mb-6">
          <div className="flex space-x-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-full ${
                filter === 'all'
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              All Staff
            </button>
            <button
              onClick={() => setFilter('barber')}
              className={`px-4 py-2 rounded-full ${
                filter === 'barber'
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Barbers
            </button>
            <button
              onClick={() => setFilter('tattoo_artist')}
              className={`px-4 py-2 rounded-full ${
                filter === 'tattoo_artist'
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Tattoo Artists
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading staff...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600">{error}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStaff.map((member) => (
              <div key={member.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                {member.avatar_url && (
                  <div className="h-64 bg-gray-200">
                    <img
                      src={member.avatar_url}
                      alt={`${member.first_name} ${member.last_name}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                <div className="p-6">
                  <div className="mb-2">
                    <span className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 capitalize">
                      {member.user_type === 'tattoo_artist' ? 'Tattoo Artist' : 'Barber'}
                    </span>
                  </div>
                  
                  <h3 className="text-xl font-semibold mb-2">
                    {member.first_name} {member.last_name}
                  </h3>
                  
                  {member.instagram_handle && (
                    <p className="text-gray-500 text-sm mb-4">
                      @{member.instagram_handle}
                    </p>
                  )}
                  
                  {member.bio && (
                    <p className="text-gray-600 mb-6">{member.bio}</p>
                  )}

                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Available Services:</h4>
                    <div className="space-y-2">
                      {member.services.map(service => (
                        <Link
                          key={service.id}
                          href={`/${tenantId}/booking?serviceId=${service.id}&providerId=${member.id}`}
                          className="block p-3 border rounded-lg hover:border-gray-300 transition-colors"
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{service.name}</span>
                            <span className="text-gray-500">${(service.base_price / 100).toFixed(2)}</span>
                          </div>
                          <div className="text-sm text-gray-500">
                            {service.duration} minutes
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
} 