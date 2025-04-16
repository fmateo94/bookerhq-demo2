import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { BookingWithDetails } from '@/types/bookings';
import { Tables } from '@/types/supabase'; // Import base Supabase types

// Define the expected shape of the raw data from Supabase query
type RawBookingData = Tables<'bookings'> & {
  slots: Tables<'slots'> | null;
  services: Tables<'services'> | null;
  profiles: Tables<'profiles'> | null; // Assuming profiles is joined via bookings_provider_profile_id_fkey
  customers: Tables<'customers'> | null;
};

const CACHE_KEY = 'bookings_cache';
const CACHE_TIME = 5 * 60 * 1000; // 5 minutes

const processBookings = (bookingsData: RawBookingData[]): BookingWithDetails[] => {
  return bookingsData.map(booking => {
    const slot = booking.slots;
    const service = booking.services;
    const provider = booking.profiles;
    const customer = booking.customers;

    return {
      id: booking.id,
      slot_id: booking.slot_id!,
      customer_id: booking.customer_id || undefined,
      service_id: booking.service_id!,
      provider_profile_id: booking.provider_profile_id || undefined,
      status: booking.status || undefined,
      created_at: booking.created_at,
      price_paid: booking.price_paid || undefined,
      tenant_id: booking.tenant_id || undefined,
      slot_date: slot?.start_time ? new Date(slot.start_time).toLocaleDateString() : 'Unknown date',
      slot_time: slot?.start_time ? new Date(slot.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Unknown time',
      service_name: service?.name || `Service #${booking.service_id}`,
      provider_name: provider ? `${provider.first_name || ''} ${provider.last_name || ''}`.trim() : `Provider #${booking.provider_profile_id}`,
      customer_name: customer ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() : `Customer #${booking.customer_id}`,
      customer_phone: customer?.phone_number || undefined
    };
  });
};

const fetchBookingsFromSupabase = async (userId: string, userType: string | null, tenantId?: string) => {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase client not initialized');
  if (!userId || !userType) throw new Error('User ID or User Type missing');

  console.log(`fetchBookingsFromSupabase: Fetching for userType: ${userType}, userId: ${userId}, tenantId: ${tenantId}`);

  let query = supabase
    .from('bookings')
    .select(`
      *,
      slots (*),
      services (*),
      profiles!bookings_provider_id_fkey (*),
      customers (*)
    `);

  // Filter bookings based on user type
  if (userType === 'customer') {
    console.log('fetchBookingsFromSupabase: Applying customer filter');
    query = query.eq('customer_id', userId);
  } else if (['barber', 'tattoo_artist'].includes(userType)) {
    // For specific providers, we need their profile ID. 
    // This assumes the calling component passes the correct user ID (which is the profile ID for providers in this context)
    // Let's re-fetch profile ID here for safety, or ensure it's passed correctly.
    // Fetching profile ID based on auth user ID:
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId) // Assuming userId passed is the auth user ID
        .single();
    
    if (profileError || !profile) {
        console.error('fetchBookingsFromSupabase: Could not get profile ID for provider', profileError);
        throw new Error('Provider profile not found');
    }
    console.log(`fetchBookingsFromSupabase: Applying provider filter for profile ID: ${profile.id}`);
    query = query.eq('provider_profile_id', profile.id);
  } else if (userType === 'admin') {
    // For admin, fetch all bookings (potentially filter by tenant_id if applicable)
    console.log('fetchBookingsFromSupabase: Applying admin view (all bookings)');
    // Add tenant filtering for admin users
    if (tenantId) {
      console.log(`fetchBookingsFromSupabase: Filtering admin view by tenant_id: ${tenantId}`);
      query = query.eq('tenant_id', tenantId);
    }
  } else {
     console.warn(`fetchBookingsFromSupabase: Unknown userType: ${userType}, returning no bookings.`);
     return []; // Return empty if user type is unknown/unhandled
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  
  if (error) {
     console.error('fetchBookingsFromSupabase: Error fetching bookings:', error);
     throw error;
  }
  console.log('fetchBookingsFromSupabase: Fetched bookings data:', data);
  return data || []; // Ensure return is always an array
};

const getBookingsFromCache = (): BookingWithDetails[] | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error('Error reading from cache:', error);
    return null;
  }
};

const setBookingsCache = (bookings: BookingWithDetails[]) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(bookings));
  } catch (error) {
    console.error('Error setting cache:', error);
  }
};

export const useBookings = (userId: string, userType: string | null, tenantId?: string): UseQueryResult<BookingWithDetails[], Error> => {
  return useQuery({
    queryKey: ['bookings', userId, userType, tenantId],
    queryFn: async () => {
       if (!userId || !userType) {
        console.log('useBookings: Skipping fetch, missing userId or userType');
        return [];
      }
      // Fetching logic now happens inside fetchBookingsFromSupabase based on type
      try {
        const data = await fetchBookingsFromSupabase(userId, userType, tenantId);
        const processedBookings = processBookings(data);
        
        // Update cache with fresh data
        setBookingsCache(processedBookings);
        
        return processedBookings;
      } catch (error) {
        // On failure, try to get cached data
        const cachedData = getBookingsFromCache();
        if (cachedData) {
          console.log('Using cached bookings data');
          return cachedData;
        }
        throw error;
      }
    },
    enabled: !!userId && !!userType,
    staleTime: CACHE_TIME,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    keepPreviousData: true
  });
}; 