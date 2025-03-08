'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { getSupabaseClient } from '@/lib/supabaseClient';
import Navbar from '@/components/ui/Navbar';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format, formatDistanceToNow, isAfter, isBefore, isPast } from 'date-fns';
import { Auction, AuctionWithDetails, Bid, Service } from '@/types/auction';
import { User } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

type AuctionRow = Database['public']['Tables']['auctions']['Row'];
type ServiceRow = Database['public']['Tables']['services']['Row'];
type BidRow = Database['public']['Tables']['bids']['Row'];
type UserRow = Database['public']['Tables']['users']['Row'];

export default function AuctionDetailPage({ params }: { params: { id: string } }) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [auction, setAuction] = useState<AuctionWithDetails | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [provider, setProvider] = useState<User | null>(null);
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

        if (auctionError) {
          throw auctionError;
        }
        
        const typedAuctionData = auctionData as AuctionRow;
        const auction: AuctionWithDetails = {
          id: typedAuctionData.id,
          service_id: typedAuctionData.service_id,
          provider_id: typedAuctionData.provider_id,
          auction_start: typedAuctionData.auction_start,
          auction_end: typedAuctionData.auction_end,
          starting_price: typedAuctionData.starting_price,
          current_price: typedAuctionData.current_price,
          current_winner_id: typedAuctionData.current_winner_id,
          created_at: typedAuctionData.created_at
        };
        setAuction(auction);

        // Fetch service details
        const { data: serviceData, error: serviceError } = await supabase
          .from('services')
          .select('*')
          .eq('id', typedAuctionData.service_id)
          .single();

        if (serviceError) {
          throw serviceError;
        }
        
        const typedServiceData = serviceData as ServiceRow;
        const service: Service = {
          id: typedServiceData.id,
          name: typedServiceData.name,
          description: typedServiceData.description,
          price: typedServiceData.price,
          duration: typedServiceData.duration,
          provider_id: typedServiceData.provider_id,
          service_type: typedServiceData.service_type,
          created_at: typedServiceData.created_at
        };
        setService(service);

        // Fetch provider details
        const { data: providerData, error: providerError } = await supabase
          .from('users')
          .select('*')
          .eq('id', typedAuctionData.provider_id)
          .single();

        if (providerError) {
          throw providerError;
        }
        
        const typedProviderData = providerData as UserRow;
        setProvider({
          id: typedProviderData.id,
          email: typedProviderData.email || '',
          app_metadata: typedProviderData.app_metadata || {},
          user_metadata: typedProviderData.user_metadata || {},
          aud: typedProviderData.aud || '',
          created_at: typedProviderData.created_at || ''
        });

        // Fetch bids for this auction
        const { data: bidsData, error: bidsError } = await supabase
          .from('bids')
          .select(`
            *,
            users:user_id(*)
          `)
          .eq('auction_id', params.id)
          .order('amount', { ascending: false });

        if (bidsError) {
          throw bidsError;
        }
        
        const typedBidsData = (bidsData || []) as unknown as Array<{
          id: string;
          auction_id: string;
          user_id: string;
          amount: number;
          created_at: string;
          users: {
            id: string;
            user_metadata: {
              first_name?: string;
              last_name?: string;
              user_type?: string;
            } | null;
          };
        }>;

        setBids(typedBidsData.map(row => ({
          id: row.id,
          auction_id: row.auction_id,
          user_id: row.user_id,
          amount: row.amount,
          created_at: row.created_at,
          users: {
            id: row.users.id,
            user_metadata: row.users.user_metadata || {}
          }
        } as Bid)));

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

  // Set up real-time subscriptions for auction and bids updates
  useEffect(() => {
    if (!params.id) return;

    const supabase = getSupabaseClient();
    if (!supabase) return;

    // Function to update auction data
    const fetchLatestAuction = async () => {
      const { data, error } = await supabase
        .from('auctions')
        .select('*')
        .eq('id', params.id)
        .single();

      if (!error && data) {
        const typedData = data as AuctionRow;
        setAuction({
          id: typedData.id,
          service_id: typedData.service_id,
          provider_id: typedData.provider_id,
          auction_start: typedData.auction_start,
          auction_end: typedData.auction_end,
          starting_price: typedData.starting_price,
          current_price: typedData.current_price,
          current_winner_id: typedData.current_winner_id,
          created_at: typedData.created_at
        });
      }
    };

    // Function to update bids data
    const fetchLatestBids = async () => {
      const { data, error } = await supabase
        .from('bids')
        .select(`
          *,
          users:user_id(*)
        `)
        .eq('auction_id', params.id)
        .order('amount', { ascending: false });

      if (!error && data) {
        const typedData = (data || []) as unknown as Array<{
          id: string;
          auction_id: string;
          user_id: string;
          amount: number;
          created_at: string;
          users: {
            id: string;
            user_metadata: {
              first_name?: string;
              last_name?: string;
              user_type?: string;
            } | null;
          };
        }>;

        setBids(typedData.map(row => ({
          id: row.id,
          auction_id: row.auction_id,
          user_id: row.user_id,
          amount: row.amount,
          created_at: row.created_at,
          users: {
            id: row.users.id,
            user_metadata: row.users.user_metadata || {}
          }
        } as Bid)));
      }
    };

    // Subscribe to changes in the auction
    const auctionSubscription = supabase
      .channel(`auction:${params.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'auctions', filter: `id=eq.${params.id}` }, () => {
        fetchLatestAuction();
      })
      .subscribe();

    // Subscribe to changes in bids for this auction
    const bidsSubscription = supabase
      .channel(`bids:${params.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bids', filter: `auction_id=eq.${params.id}` }, () => {
        fetchLatestBids();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(auctionSubscription);
      supabase.removeChannel(bidsSubscription);
    };
  }, [params.id]);

  // Update time left countdown
  useEffect(() => {
    if (!auction) return;

    const status = getAuctionStatus(auction);
    
    if (status === 'active') {
      const interval = setInterval(() => {
        const now = new Date();
        const endTime = new Date(auction.auction_end);
        
        if (isAfter(now, endTime)) {
          setTimeLeft('Auction ended');
          clearInterval(interval);
        } else {
          setTimeLeft(formatDistanceToNow(endTime, { addSuffix: false }));
        }
      }, 1000);
      
      return () => clearInterval(interval);
    } else if (status === 'scheduled') {
      const interval = setInterval(() => {
        const now = new Date();
        const startTime = new Date(auction.auction_start);
        
        if (isAfter(now, startTime)) {
          window.location.reload(); // Refresh when auction starts
          clearInterval(interval);
        } else {
          setTimeLeft(formatDistanceToNow(startTime, { addSuffix: false }));
        }
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [auction]);

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

      if (bidError) {
        throw bidError;
      }

      // Update the auction's current price and winner
      const { error: auctionError } = await supabase
        .from('auctions')
        .update({
          current_price: bidAmountNum,
          current_winner_id: user.id,
        })
        .eq('id', auction.id);

      if (auctionError) {
        throw auctionError;
      }

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error && !auction) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <h2 className="text-xl font-semibold text-red-600 mb-2">Error</h2>
            <p className="text-gray-700">{error}</p>
            <Link href="/auctions" className="mt-4 inline-block bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700">
              Back to Auctions
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const auctionStatus = getAuctionStatus(auction);
  const isUserHighestBidder = user && auction && auction.current_winner_id === user.id;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link href="/auctions" className="text-blue-600 hover:text-blue-800 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Auctions
          </Link>
        </div>
        
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          {/* Auction header with status */}
          <div className="p-6 bg-gray-50 border-b">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-900">{service?.name}</h1>
              <div>
                <span className={`inline-block px-3 py-1 text-sm font-semibold rounded-full ${
                  auctionStatus === 'active' 
                    ? 'bg-green-100 text-green-800' 
                    : auctionStatus === 'scheduled' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {auctionStatus === 'active'
                    ? 'Active Auction'
                    : auctionStatus === 'scheduled'
                    ? 'Upcoming Auction'
                    : 'Auction Ended'}
                </span>
              </div>
            </div>
            
            {/* Countdown timer */}
            {auctionStatus !== 'completed' && (
              <div className="mt-2 text-sm text-gray-500">
                {auctionStatus === 'active' ? 'Ends in: ' : 'Starts in: '}
                <span className="font-semibold text-blue-600">{timeLeft}</span>
              </div>
            )}
          </div>
          
          <div className="md:flex">
            {/* Left column: Service and provider details */}
            <div className="md:w-2/3 p-6">
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-2">Service Details</h2>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="mb-4">
                    <span className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 capitalize">
                      {service?.service_type}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 mb-4">{service?.description}</p>
                  
                  <div className="flex flex-wrap gap-6 mb-2">
                    <div>
                      <p className="text-sm text-gray-500">Regular Price</p>
                      <p className="text-xl font-semibold">${service?.price}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Duration</p>
                      <p className="text-xl font-semibold">{service?.duration} min</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-2">Appointment Details</h2>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Date</p>
                      <p className="font-semibold">{format(new Date(auction?.auction_start || ''), 'PPPP')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Time</p>
                      <p className="font-semibold">{format(new Date(auction?.auction_start || ''), 'p')}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h2 className="text-lg font-semibold mb-2">Provider</h2>
                <div className="bg-gray-50 rounded-lg p-4 flex items-center">
                  <div className="w-12 h-12 bg-gray-300 rounded-full mr-4 flex items-center justify-center">
                    <span className="text-gray-600 text-lg">
                      {provider?.user_metadata?.first_name?.[0]}
                      {provider?.user_metadata?.last_name?.[0]}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold">
                      {provider?.user_metadata?.first_name} {provider?.user_metadata?.last_name}
                    </p>
                    <p className="text-sm text-gray-500 capitalize">
                      {provider?.user_metadata?.user_type?.replace('_', ' ')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right column: Auction details and bidding */}
            <div className="md:w-1/3 p-6 bg-gray-50 border-t md:border-t-0 md:border-l">
              <h2 className="text-lg font-semibold mb-4">Auction Details</h2>
              
              <div className="space-y-4 mb-6">
                <div>
                  <p className="text-sm text-gray-500">Starting Price</p>
                  <p className="text-xl font-semibold">${auction?.starting_price}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Current Highest Bid</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {auction?.current_price ? `$${auction.current_price}` : 'No bids yet'}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Your Status</p>
                  {!user ? (
                    <p className="font-medium text-gray-700">
                      <Link href="/auth/signin" className="text-blue-600 hover:text-blue-800">
                        Sign in
                      </Link>{' '}
                      to place a bid
                    </p>
                  ) : isUserHighestBidder ? (
                    <p className="font-medium text-green-600">You are the highest bidder! 🎉</p>
                  ) : (
                    <p className="font-medium text-yellow-600">
                      {bids.some(bid => bid.user_id === user.id) 
                        ? 'You have been outbid'
                        : 'You have not placed a bid yet'}
                    </p>
                  )}
                </div>
                
                {auctionStatus === 'active' && user && (
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-2">Place Your Bid</h3>
                    
                    {error && (
                      <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
                        {error}
                      </div>
                    )}
                    
                    {successMessage && (
                      <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded text-sm">
                        {successMessage}
                      </div>
                    )}
                    
                    <div className="flex items-center mb-4">
                      <span className="mr-2 text-lg">$</span>
                      <input
                        type="number"
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                        min={auction?.current_price ? auction.current_price + 1 : auction?.starting_price}
                        step="1"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <button
                      onClick={handlePlaceBid}
                      disabled={bidLoading}
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                      {bidLoading ? 'Placing Bid...' : 'Place Bid'}
                    </button>
                    
                    <p className="mt-2 text-xs text-gray-500">
                      By placing a bid, you agree to pay this amount if you win the auction.
                    </p>
                  </div>
                )}
                
                {auctionStatus === 'completed' && (
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-2">Auction Results</h3>
                    {auction?.current_winner_id ? (
                      <div>
                        <p className="text-sm">
                          This auction has ended with a winning bid of{' '}
                          <span className="font-semibold">${auction.current_price}</span>
                        </p>
                        {isUserHighestBidder && (
                          <p className="mt-2 text-green-600 font-semibold">
                            Congratulations! You won this auction.
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm">This auction ended with no bids.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Bid history section */}
          <div className="p-6 border-t">
            <h2 className="text-lg font-semibold mb-4">Bid History</h2>
            
            {bids.length === 0 ? (
              <p className="text-gray-500">No bids have been placed yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Bidder
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Bid Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {bids.map((bid, index) => (
                      <tr key={bid.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="text-sm font-medium text-gray-900">
                              {index === 0 && auctionStatus === 'completed' ? (
                                <span className="flex items-center">
                                  {bid.users?.user_metadata?.first_name} {bid.users?.user_metadata?.last_name}
                                  <span className="ml-2 text-yellow-500">👑</span>
                                </span>
                              ) : (
                                <span>
                                  {bid.users?.user_metadata?.first_name} {bid.users?.user_metadata?.last_name}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">${bid.amount}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {format(new Date(bid.created_at), 'PPp')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {index === 0 && auctionStatus !== 'completed' ? (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              Highest Bid
                            </span>
                          ) : index === 0 && auctionStatus === 'completed' ? (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              Winner
                            </span>
                          ) : (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                              Outbid
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}