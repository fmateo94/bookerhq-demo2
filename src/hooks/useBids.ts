import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { BidWithDetails } from '@/types/bids';
import { Tables } from '@/types/supabase'; // Import base Supabase types

// Define the expected shape of the raw data from Supabase query
type RawBidData = Tables<'bids'> & {
  slots: (Tables<'slots'> & {
    services: Tables<'services'> | null;
    profiles: Tables<'profiles'> | null;
  }) | null;
};

const CACHE_KEY = 'bids_cache';
const CACHE_TIME = 1 * 60 * 1000; // 1 minute

const processBids = (bidsData: RawBidData[]): BidWithDetails[] => {
  return bidsData.map(bid => {
    const slot = bid.slots;
    const service = slot?.services;
    const provider = slot?.profiles;

    // Safely access properties
    const providerName = provider ? `${provider.first_name || ''} ${provider.last_name || ''}`.trim() : `Provider #${slot?.provider_id}`;
    const slotTime = slot?.start_time ? new Date(slot.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Unknown time';
    const slotDate = slot?.start_time ? new Date(slot.start_time).toLocaleDateString() : 'Unknown date';
    
    return {
      id: bid.id,
      slot_id: bid.slot_id!,
      bid_amount: bid.bid_amount!,
      created_at: bid.created_at,
      status: bid.status || undefined,
      tenant_id: bid.tenant_id || undefined,
      service_id: slot?.service_id,
      provider_id: slot?.provider_id,
      profile_provider_id: bid.profile_provider_id || undefined,
      customer_id: bid.customer_id || undefined,
      start_time: slot?.start_time,
      end_time: slot?.end_time,
      is_auction: slot?.is_auction,
      min_price: slot?.min_price,
      service_name: service?.name || `Service #${slot?.service_id}`,
      provider_name: providerName,
      slot_time: slotTime,
      slot_date: slotDate,
      owner_type: bid.owner_type!,
      parent_bid_id: bid.parent_bid_id || undefined,
    };
  });
};

const fetchBidsFromSupabase = async (userId: string, profileId: string | undefined, userType: string | null) => {
  const supabase = getSupabaseClient();
  if (!supabase || !userId) throw new Error('Supabase client not initialized or userId missing');
  if (!userType) throw new Error('User type is unknown');

  console.log(`fetchBidsFromSupabase: Fetching for userType: ${userType}, userId: ${userId}, profileId: ${profileId}`);

  let query = supabase
    .from('bids')
    .select(`
      *,
      slots!inner (*, services (*), profiles (*))
    `);

  if (userType === 'customer') {
    console.log(`fetchBidsFromSupabase: Applying customer filter: customer_id.eq.${userId}`);
    query = query.eq('customer_id', userId);
  } else if (profileId && ['barber', 'tattoo_artist', 'admin'].includes(userType)) {
    // Providers/Admins see bids for slots they own
    console.log(`fetchBidsFromSupabase: Applying provider filter: slots.provider_id.eq.${profileId}`);
    // Filter based on the provider_id within the nested slots table
    query = query.eq('slots.provider_id', profileId);
  } else {
    console.error(`fetchBidsFromSupabase: Invalid state for bid query - userType: ${userType}, profileId: ${profileId}`);
    return []; // Return empty for unhandled cases
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('fetchBidsFromSupabase: Error fetching bids:', error);
    throw error;
  }
  console.log('fetchBidsFromSupabase: Raw bids data:', data);
  return data || []; // Ensure return is always an array
};

const getBidsFromCache = (): BidWithDetails[] | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error('Error reading bids from cache:', error);
    return null;
  }
};

const setBidsCache = (bids: BidWithDetails[]) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(bids));
  } catch (error) {
    console.error('Error setting bids cache:', error);
  }
};

export const useBids = (
  userId: string,
  profileId: string | undefined,
  userType: string | null 
): UseQueryResult<BidWithDetails[], Error> => {
  console.log(`useBids called with userId: ${userId}, profileId: ${profileId}, userType: ${userType}`);

  return useQuery({
    queryKey: ['bids', userId, profileId, userType], // Add userType to key
    queryFn: async () => {
      if (!userId || !userType) {
        console.log('useBids: Skipping fetch, missing userId or userType');
        return [];
      }
      // For providers/admins, profileId might be needed depending on exact logic, 
      // but the fetch function now handles the logic based on userType.
      // The enabled flag below ensures we wait for necessary info.
      
      // Fetching logic moved inside fetchBidsFromSupabase
      try {
        console.log('useBids: Fetching bids from Supabase...');
        const data = await fetchBidsFromSupabase(userId, profileId, userType);
        console.log('useBids: Raw data from Supabase:', data);
        const processedBids = processBids(data || []); // Ensure data is array
        console.log('useBids: Processed bids:', processedBids);
        
        setBidsCache(processedBids);
        
        return processedBids;
      } catch (error) {
        console.error('useBids: Error fetching from Supabase:', error);
        // On failure, try to get cached data
        const cachedData = getBidsFromCache();
        if (cachedData) {
          console.log('useBids: Using cached bids data:', cachedData);
          return cachedData;
        }
        console.error("useBids: Failed to fetch bids and no cache available.");
        return []; // Return empty array on error
      }
    },
    // Enable query only when userType is known. For providers/admins, profileId might also be needed
    // depending on whether fetchBidsFromSupabase strictly requires it for their logic.
    // Let's assume for now it's only strictly required for provider types.
    enabled: !!userId && !!userType && (userType !== 'barber' && userType !== 'tattoo_artist' || !!profileId),
    staleTime: CACHE_TIME,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    keepPreviousData: true
  });
}; 