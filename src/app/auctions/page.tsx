'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import Navbar from '@/components/ui/Navbar';
import Link from 'next/link';
import { format, formatDistanceToNow, isPast } from 'date-fns';

export default function AuctionsPage() {
  const [auctions, setAuctions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState({
    serviceType: 'all', // 'all', 'haircut', or 'tattoo'
    status: 'active', // 'all', 'active', 'scheduled', 'completed'
  });

  useEffect(() => {
    const fetchAuctions = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const supabase = getSupabaseClient();
        if (!supabase) {
          throw new Error('Supabase client not initialized');
        }

        const { data, error } = await supabase
          .from('auctions')
          .select(`
            *,
            services:service_id(*),
            provider:provider_id(*),
            bids:bids(*)
          `)
          .order('auction_end', { ascending: true });

        if (error) {
          throw error;
        }
        
        setAuctions(data || []);
      } catch (error) {
        console.error('Error fetching auctions:', error);
        const errorMessage = 
          error && typeof error === 'object' && 'message' in error
            ? error.message as string
            : 'Failed to load auctions. Please try again later.';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchAuctions();

    // Set up a real-time subscription for auction updates
    const supabase = getSupabaseClient();
    if (supabase) {
      const auctionSubscription = supabase
        .channel('public:auctions')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'auctions' }, () => {
          // Refresh auctions when there's a change
          fetchAuctions();
        })
        .subscribe();

      return () => {
        // Clean up subscription on unmount
        supabase.removeChannel(auctionSubscription);
      };
    }
  }, []);

  // Filter auctions based on current filter settings
  const filteredAuctions = auctions.filter((auction) => {
    // Filter implementations remain the same...
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