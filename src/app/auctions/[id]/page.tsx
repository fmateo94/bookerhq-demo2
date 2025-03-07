'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { getSupabaseClient } from '@/lib/supabaseClient';
import Navbar from '@/components/ui/Navbar';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format, formatDistanceToNow, isAfter, isBefore, isPast } from 'date-fns';
import { AuctionWithDetails, Service, Bid } from '@/types/auction';
import { User } from '@supabase/supabase-js';

type ProviderData = {
  id: string;
  user_metadata?: {
    first_name?: string;
    last_name?: string;
  };
};

type AuctionData = {
  id: string;
  service_id: string;
  provider_id: string;
  auction_start: string;
  auction_end: string;
  starting_price: number;
  current_price: number | null;
  current_winner_id: string | null;
  created_at: string;
};

type ServiceData = {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  provider_id: string;
  service_type: 'haircut' | 'tattoo';
  created_at: string;
};

const formatProviderName = (provider: ProviderData | null): string => {
  if (!provider?.user_metadata?.first_name) return 'Loading...';
  
  const firstName = provider.user_metadata.first_name;
  const lastName = provider.user_metadata.last_name;
  
  return lastName ? `${firstName} ${lastName}` : firstName;
};

const formatStatus = (status: string | null): string => {
  if (!status) return 'Unknown';
  return status.charAt(0).toUpperCase() + status.slice(1);
};

export default function AuctionDetailPage({ params }: { params: { id: string } }) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [auction, setAuction] = useState<AuctionWithDetails | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [provider, setProvider] = useState<ProviderData | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [bidAmount, setBidAmount] = useState<string>('');
  const [bidLoading, setBidLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const router = useRouter();

  // Function to determine auction status
  const getAuctionStatus = (auction: AuctionWithDetails | null) => {
    if (!auction) return null;
    
    const now = new Date();
    const auctionStart = new Date(auction.auction_start);
    const auctionEnd = new Date(auction.auction_end);
    
    if (isPast(auctionEnd)) {
      return 'completed';
    } else if (!isPast(auctionStart)) {
      return 'scheduled';
    } else {
      return 'active';
    }
  };

  // Update time left
  useEffect(() => {
    if (!auction) return;

    const updateTimeLeft = () => {
      const now = new Date();
      const end = new Date(auction.auction_end);
      
      if (isPast(end)) {
        setTimeLeft('Auction ended');
        return;
      }
      
      setTimeLeft(formatDistanceToNow(end, { addSuffix: true }));
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 1000);
    
    return () => clearInterval(interval);
  }, [auction]);

  useEffect(() => {
    const fetchAuctionData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const supabase = getSupabaseClient();
        if (!supabase) {
          throw new Error('Supabase client not initialized');
        }
        
        // Fetch auction details
        const { data: auctionData, error: auctionError } = await supabase
          .from('auctions')
          .select('*')
          .eq('id', params.id)
          .single();

        if (auctionError) throw auctionError;
        if (!auctionData) throw new Error('Auction not found');
        
        const typedAuctionData = auctionData as AuctionData;
        setAuction(typedAuctionData as unknown as AuctionWithDetails);

        // Fetch service details
        const { data: serviceData, error: serviceError } = await supabase
          .from('services')
          .select('*')
          .eq('id', typedAuctionData.service_id)
          .single();

        if (serviceError) throw serviceError;
        if (!serviceData) throw new Error('Service not found');
        
        const typedServiceData = serviceData as ServiceData;
        setService(typedServiceData as Service);

        // Fetch provider details
        const { data: providerData, error: providerError } = await supabase
          .from('users')
          .select('id, user_metadata')
          .eq('id', typedAuctionData.provider_id)
          .single();

        if (providerError) throw providerError;
        if (!providerData) throw new Error('Provider not found');
        
        setProvider(providerData as ProviderData);

        // Fetch bids for this auction
        const { data: bidsData, error: bidsError } = await supabase
          .from('bids')
          .select(`
            *,
            users:user_id(id, user_metadata)
          `)
          .eq('auction_id', params.id)
          .order('amount', { ascending: false });

        if (bidsError) throw bidsError;
        
        setBids((bidsData || []) as unknown as Bid[]);

        // Set initial bid amount slightly higher than current price
        if (typedAuctionData.current_price) {
          const suggestedBid = Math.ceil(typedAuctionData.current_price * 1.05); // 5% higher
          setBidAmount(suggestedBid.toString());
        } else {
          setBidAmount(typedAuctionData.starting_price.toString());
        }
      } catch (error) {
        console.error('Error fetching auction data:', error);
        const errorMessage = 
          error && typeof error === 'object' && 'message' in error
            ? error.message as string
            : 'Failed to load auction information. Please try again later.';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchAuctionData();
    }
  }, [params.id]);

  // Handle placing a bid
  const handlePlaceBid = async () => {
    if (!user) {
      router.push('/auth/signin');
      return;
    }

    if (!auction || !service || !provider) {
      setError('Auction information is not available.');
      return;
    }

    if (!bidAmount || isNaN(parseFloat(bidAmount))) {
      setError('Please enter a valid bid amount.');
      return;
    }

    const bidAmountNum = parseFloat(bidAmount);
    
    // Validate bid amount
    if (auction.current_price && bidAmountNum <= auction.current_price) {
      setError(`Your bid must be higher than the current bid of $${auction.current_price}.`);
      return;
    }

    if (!auction.current_price && bidAmountNum < auction.starting_price) {
      setError(`Your bid must be at least the starting price of $${auction.starting_price}.`);
      return;
    }

    setBidLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      // Create the bid
      const { data: bidData, error: bidError } = await supabase
        .from('bids')
        .insert([
          {
            auction_id: auction.id,
            user_id: user.id,
            amount: bidAmountNum,
          }
        ])
        .select();

      if (bidError) throw bidError;

      // Update the auction's current price and winner
      const { error: auctionError } = await supabase
        .from('auctions')
        .update({
          current_price: bidAmountNum,
          current_winner_id: user.id,
        })
        .eq('id', auction.id);

      if (auctionError) throw auctionError;

      // Create a notification for the provider
      await supabase
        .from('notifications')
        .insert([
          {
            user_id: provider.id,
            title: 'New Bid Placed',
            message: `${user.user_metadata?.first_name || 'A user'} ${user.user_metadata?.last_name || ''} has placed a bid of $${bidAmountNum} on your auction for ${service.name}.`,
            notification_type: 'auction',
            related_id: auction.id,
          }
        ]);

      // Notify previous highest bidder if they exist
      if (auction.current_winner_id && auction.current_winner_id !== user.id) {
        await supabase
          .from('notifications')
          .insert([
            {
              user_id: auction.current_winner_id,
              title: 'You\'ve Been Outbid',
              message: `Someone has placed a higher bid of $${bidAmountNum} on the auction for ${service.name}.`,
              notification_type: 'auction',
              related_id: auction.id,
            }
          ]);
      }

      setSuccessMessage(`Your bid of $${bidAmountNum} has been placed successfully!`);
      
      // Suggest a higher bid for next time
      const suggestedNextBid = Math.ceil(bidAmountNum * 1.05); // 5% higher
      setBidAmount(suggestedNextBid.toString());
    } catch (error) {
      console.error('Error placing bid:', error);
      const errorMessage = 
        error && typeof error === 'object' && 'message' in error
          ? error.message as string
          : 'There was an error placing your bid. Please try again.';
      setError(errorMessage);
    } finally {
      setBidLoading(false);
    }
  };

  if (loading || isAuthLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!auction || !service || !provider) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-gray-900">Auction not found</h2>
            <p className="mt-2 text-sm text-gray-600">
              The auction you're looking for doesn't exist or has been removed.
            </p>
            <div className="mt-6">
              <Link
                href="/auctions"
                className="text-blue-600 hover:text-blue-800"
              >
                View all auctions
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const status = getAuctionStatus(auction);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Service and Provider Info */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:px-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {service?.name ?? 'Loading...'}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Provided by {formatProviderName(provider)}
            </p>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    status === 'active' ? 'bg-green-100 text-green-800' :
                    status === 'completed' ? 'bg-gray-100 text-gray-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {formatStatus(status)}
                  </span>
                </dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Time Remaining</dt>
                <dd className="mt-1 text-sm text-gray-900">{timeLeft}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Starting Price</dt>
                <dd className="mt-1 text-sm text-gray-900">${auction.starting_price}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Current Price</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {auction.current_price ? `$${auction.current_price}` : 'No bids yet'}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Bidding Section */}
        {status === 'active' && (
          <div className="bg-white shadow sm:rounded-lg mb-6">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Place a Bid</h3>
              {successMessage && (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm text-green-600">{successMessage}</p>
                </div>
              )}
              <div className="mt-4 max-w-xl">
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                  <input
                    type="number"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                    placeholder="0.00"
                    aria-describedby="price-currency"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm" id="price-currency">
                      USD
                    </span>
                  </div>
                </div>
                <button
                  onClick={handlePlaceBid}
                  disabled={bidLoading}
                  className="mt-3 w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {bidLoading ? 'Placing Bid...' : 'Place Bid'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bid History */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Bid History</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              {bids.length} {bids.length === 1 ? 'bid' : 'bids'} placed
            </p>
          </div>
          <div className="border-t border-gray-200">
            <ul role="list" className="divide-y divide-gray-200">
              {bids.map((bid) => (
                <li key={bid.id} className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="text-sm font-medium text-gray-900">
                        {bid.users?.user_metadata?.first_name} {bid.users?.user_metadata?.last_name}
                      </div>
                    </div>
                    <div className="ml-2 flex-shrink-0 flex">
                      <div className="text-sm text-gray-500">
                        ${bid.amount} • {formatDistanceToNow(new Date(bid.created_at), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
              {bids.length === 0 && (
                <li className="px-4 py-4 sm:px-6 text-sm text-gray-500 text-center">
                  No bids placed yet
                </li>
              )}
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}