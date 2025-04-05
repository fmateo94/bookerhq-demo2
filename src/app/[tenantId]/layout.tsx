'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { TenantProvider } from '@/contexts/TenantContext';
import { Tenant } from '@/types/service';

export default function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { tenantId } = useParams();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTenant = async () => {
      console.log('Fetching tenant data for:', tenantId);
      
      try {
        const supabase = getSupabaseClient();
        if (!supabase) throw new Error('Supabase client not initialized');

        const { data: tenantData, error: tenantError } = await supabase
          .from('tenants')
          .select('*')
          .eq('slug', tenantId)
          .single();

        console.log('Tenant data:', tenantData);
        console.log('Tenant error:', tenantError);

        if (tenantError) throw tenantError;
        if (!tenantData) throw new Error('Tenant not found');

        setTenant(tenantData);
      } catch (error) {
        console.error('Error fetching tenant:', error);
        setError('Failed to load tenant information. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    if (tenantId) {
      fetchTenant();
    }
  }, [tenantId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{error || 'Tenant not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <TenantProvider tenant={tenant}>
      {children}
    </TenantProvider>
  );
} 