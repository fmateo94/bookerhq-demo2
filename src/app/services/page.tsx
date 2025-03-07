'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';
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
        const supabase = getSupabaseClient();
        if (!supabase) {
          throw new Error('Supabase client not initialized');
        }

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
        {/* Content remains the same... */}
      </main>
    </div>
  );
}