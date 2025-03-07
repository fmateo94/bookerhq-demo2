'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Navbar from '@/components/ui/Navbar';
import Link from 'next/link';

export default function ServicesPage() {
  const [services, setServices] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    serviceType: 'all', // 'all', 'haircut', or 'tattoo'
    provider: 'all',
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      try {
        // Fetch all providers (barbers and tattoo artists)
        const { data: providersData, error: providersError } = await supabase
          .from('users')
          .select('*')
          .in('user_type', ['barber', 'tattoo_artist']);

        if (providersError) {
          throw providersError;
        }
        
        setProviders(providersData || []);

        // Fetch all services with provider details
        const { data: servicesData, error: servicesError } = await supabase
          .from('services')
          .select(`
            *,
            provider:provider_id(*)
          `);

        if (servicesError) {
          throw servicesError;
        }
        
        setServices(servicesData || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter services based on current filter settings
  const filteredServices = services.filter((service) => {
    // Filter by service type
    if (filter.serviceType !== 'all' && service.service_type !== filter.serviceType) {
      return false;
    }
    
    // Filter by provider
    if (filter.provider !== 'all' && service.provider_id !== filter.provider) {
      return false;
    }
    
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Services</h1>
          <p className="mt-2 text-gray-600">Browse and book haircuts and tattoo sessions from our talented professionals.</p>
        </div>
        
        {/* Filters */}
        <div className="bg-white shadow rounded-lg p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label htmlFor="serviceType" className="block text-sm font-medium text-gray-700 mb-1">
                Service Type
              </label>
              <select
                id="serviceType"
                value={filter.serviceType}
                onChange={(e) => setFilter({ ...filter, serviceType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Services</option>
                <option value="haircut">Haircuts</option>
                <option value="tattoo">Tattoos</option>
              </select>
            </div>
            
            <div className="flex-1">
              <label htmlFor="provider" className="block text-sm font-medium text-gray-700 mb-1">
                Provider
              </label>
              <select
                id="provider"
                value={filter.provider}
                onChange={(e) => setFilter({ ...filter, provider: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Providers</option>
                {providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.first_name} {provider.last_name} ({provider.user_type === 'barber' ? 'Barber' : 'Tattoo Artist'})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading services...</p>
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="text-center py-12 bg-white shadow rounded-lg">
            <h2 className="text-xl font-semibold text-gray-700">No services found</h2>
            <p className="mt-2 text-gray-600">Try adjusting your filters or check back later for more options.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServices.map((service) => (
              <div key={service.id} className="bg-white shadow rounded-lg overflow-hidden">
                {/* Service image placeholder */}
                <div className="h-48 bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-400 text-2xl">
                    {service.service_type === 'haircut' ? '✂️' : '🎨'}
                  </span>
                </div>
                
                <div className="p-4">
                  <div className="mb-2">
                    <span className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 capitalize">
                      {service.service_type}
                    </span>
                  </div>
                  
                  <h3 className="text-lg font-semibold mb-1">{service.name}</h3>
                  
                  <div className="text-sm text-gray-600 mb-2">
                    <span>By </span>
                    <span className="font-medium">
                      {service.provider?.first_name} {service.provider?.last_name}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-500 mb-4 line-clamp-2">{service.description}</p>
                  
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <span className="text-lg font-semibold text-gray-900">${service.price}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Duration: {service.duration} min</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <Link
                      href={`/services/${service.id}`}
                      className="bg-blue-600 text-white py-2 px-4 rounded-md text-sm hover:bg-blue-700"
                    >
                      Book Now
                    </Link>
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