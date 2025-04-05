'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabaseClient';
import Navbar from '@/components/ui/Navbar';
import { Service, Profile } from '@/types/service';
import { useTenant } from '@/contexts/TenantContext';

export default function ServiceDetailPage() {
  const params = useParams() as { tenantId: string; serviceId: string };
  const tenant = useTenant();
  const [service, setService] = useState<Service | null>(null);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!params.serviceId || !tenant.id) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const supabase = getSupabaseClient();
        console.log('Supabase client:', !!supabase);
        if (!supabase) throw new Error('Supabase client not initialized');

        console.log('Fetching service:', params.serviceId);
        // Fetch service details
        const { data: serviceData, error: serviceError } = await supabase
          .from('services')
          .select(`
            id,
            name,
            description,
            duration,
            base_price,
            service_type,
            tenant_id
          `)
          .eq('id', params.serviceId)
          .eq('tenant_id', tenant.id)
          .single();

        console.log('Service data:', serviceData);
        console.log('Service error:', serviceError);

        if (serviceError) {
          console.error('Service fetch error:', serviceError);
          throw new Error(`Failed to fetch service: ${serviceError.message}`);
        }
        if (!serviceData) throw new Error('Service not found');
        
        setService(serviceData);

        console.log('Fetching staff for tenant:', tenant.id);
        // Fetch staff who provide this service
        const { data: staffData, error: staffError } = await supabase
          .from('profiles')
          .select(`
            id,
            first_name,
            last_name,
            user_type,
            instagram_handle,
            bio,
            avatar_url
          `)
          .eq('tenant_id', tenant.id)
          .eq('user_type', serviceData.service_type === 'haircut' ? 'barber' : 'tattoo_artist')
          .order('first_name');

        console.log('Staff data:', staffData);
        console.log('Staff error:', staffError);

        if (staffError) {
          console.error('Staff fetch error:', staffError);
          throw new Error(`Failed to fetch staff: ${staffError.message}`);
        }
        setStaff(staffData || []);
      } catch (error) {
        console.error('Error details:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to load service information. Please try again later.';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [tenant.id, params.serviceId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading service information...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <p className="text-red-600">{error || 'Service not found'}</p>
            <Link
              href={`/${params.tenantId}/services`}
              className="mt-4 inline-block text-blue-600 hover:text-blue-800"
            >
              ← Back to services
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-6">
          <Link href={`/${params.tenantId}/services`} className="hover:text-gray-700">
            All services
          </Link>
          <span>/</span>
          <span className="capitalize">{service.service_type}</span>
        </nav>

        {/* Service Details */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{service.name}</h1>
          <div className="mt-2 flex items-center space-x-4 text-gray-500">
            <span>Price varies</span>
            <span>•</span>
            <span>{service.duration} min</span>
          </div>
          <p className="mt-4 text-gray-600">{service.description}</p>
        </div>

        {/* Staff Section */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Staff</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {staff.map((member) => (
              <Link
                key={member.id}
                href={`/${params.tenantId}/booking?serviceId=${service.id}&providerId=${member.id}`}
                className="block bg-white border rounded-lg hover:border-gray-300 transition-colors"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {member.first_name} {member.last_name}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {member.user_type === 'tattoo_artist' ? 'Tattoo Artist' : 'Barber'}
                      </p>
                      {member.instagram_handle && (
                        <p className="text-sm text-gray-500 mt-1">
                          @{member.instagram_handle}
                        </p>
                      )}
                    </div>
                    <span className="text-lg font-semibold">${(service.base_price / 100).toFixed(2)}</span>
                  </div>
                  {member.bio && (
                    <p className="mt-4 text-sm text-gray-600">{member.bio}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
} 