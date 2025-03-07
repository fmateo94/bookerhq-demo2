'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
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
        setError('Failed to load auctions. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchAuctions();

    // Set up a real-time subscription for auction updates
    const auctionSubscription = supabase
      .channel('public:auctions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'auctions' }, (payload) => {
        // Refresh auctions when there's a change
        fetchAuctions();
      })
      .subscribe();

    return () => {
      // Clean up subscription on unmount
      supabase.removeChannel(auctionSubscription);
    };
  }, []);

  // Filter auctions based on current filter settings
  const filteredAuctions = auctions.filter((auction) => {
    // Filter by service type
    if (filter.serviceType !== 'all' && auction.services?.service_type !== filter.serviceType) {
      return false;
    }
    
    // Filter by status
    const now = new Date();
    let auctionStatus = 'scheduled';
    
    if (isPast(new Date(auction.auction_end))) {
      auctionStatus = 'completed';
    } else if (!isPast(new Date(auction.auction_start))) {
      auctionStatus = 'scheduled';
    } else {
      auctionStatus = 'active';
    }
    
    if (filter.status !== 'all' && auctionStatus !== filter.status) {
      return false;
    }
    
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Auction Slots</h1>
          <p className="mt-2 text-gray-600">
            Bid on premium time slots with our top stylists and artists. The highest bidder wins the appointment!
          </p>
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
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="status"
                value={filter.status}
                onChange={(e) => setFilter({ ...filter, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Auctions</option>
                <option value="scheduled">Upcoming Auctions</option>
                <option value="completed">Completed Auctions</option>
              </select>
            </div>
          </div>
        </div>
        
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading auctions...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12 bg-white shadow rounded-lg">
            <h2 className="text-xl font-semibold text-red-600 mb-2">Error</h2>
            <p className="text-gray-700">{error}</p>
          </div>
        ) : filteredAuctions.length === 0 ? (
          <div className="text-center py-12 bg-white shadow rounded-lg">
            <h2 className="text-xl font-semibold text-gray-700">No auctions found</h2>
            <p className="mt-2 text-gray-600">
              {filter.status === 'active' 
                ? 'There are no active auctions at the moment. Check back soon or browse scheduled auctions.'
                : 'Try adjusting your filters to see more auctions.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAuctions.map((auction) => {
              const now = new Date();
              const auctionStart = new Date(auction.auction_start);
              const auctionEnd = new Date(auction.auction_end);
              
              let status = 'scheduled';
              if (isPast(auctionEnd)) {
                status = 'completed';
              } else if (!isPast(auctionStart)) {
                status = 'scheduled';
              } else {
                status = 'active';
              }
              
              const totalBids = auction.bids?.length || 0;
              
              return (
                <div key={auction.id} className="bg-white shadow rounded-lg overflow-hidden">
                  {/* Status badge */}
                  <div className="relative">
                    <div className="h-48 bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-400 text-2xl">
                        {auction.services?.service_type === 'haircut' ? '✂️' : '🎨'}
                      </span>
                    </div>
                    <div className="absolute top-4 right-4">
                      <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                        status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : status === 'scheduled' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {status === 'active' 
                          ? 'Active' 
                          : status === 'scheduled' 
                          ? 'Upcoming' 
                          : 'Completed'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <h3 className="text-lg font-semibold mb-2">{auction.services?.name}</h3>
                    
                    <div className="text-sm text-gray-600 mb-2">
                      <span>With </span>
                      <span className="font-medium">
                        {auction.provider?.first_name} {auction.provider?.last_name}
                      </span>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">Appointment:</span>
                        <span className="font-medium">
                          {format(new Date(auction.start_time), 'PPP')} at {format(new Date(auction.start_time), 'p')}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">Duration:</span>
                        <span className="font-medium">{auction.services?.duration} min</span>
                      </div>
                      
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">Starting Price:</span>
                        <span className="font-medium">${auction.starting_price}</span>
                      </div>
                      
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">Current Bid:</span>
                        <span className="font-medium">
                          {auction.current_price 
                            ? `$${auction.current_price}` 
                            : 'No bids yet'}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">Total Bids:</span>
                        <span className="font-medium">{totalBids}</span>
                      </div>
                      
                      {status === 'active' && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-500">Ends in:</span>
                          <span className="font-medium text-red-600">
                            {formatDistanceToNow(auctionEnd, { addSuffix: true })}
                          </span>
                        </div>
                      )}
                      
                      {status === 'scheduled' && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-500">Starts in:</span>
                          <span className="font-medium text-blue-600">
                            {formatDistanceToNow(auctionStart, { addSuffix: true })}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex justify-end">
                      <Link
                        href={`/auctions/${auction.id}`}
                        className={`py-2 px-4 rounded-md text-sm font-medium ${
                          status === 'active'
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : status === 'scheduled'
                            ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {status === 'active'
                          ? 'Place Bid'
                          : status === 'scheduled'
                          ? 'View Details'
                          : 'View Results'}
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}