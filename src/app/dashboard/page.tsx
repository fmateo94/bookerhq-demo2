'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { getSupabaseClient } from '@/lib/supabaseClient';
import Navbar from '@/components/ui/Navbar';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type ProfileData = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
  user_type: string;
  created_at: string;
};

// Updated type definition to handle business bookings view
type BookingWithDetails = {
  id: string;
  user_id?: string;
  customer_id?: string;
  slot_id: string;
  service_id: string;
  provider_profile_id?: string;
  provider_id?: string; // From slots table
  status?: string;
  created_at: string;
  price_paid?: number;
  tenant_id?: string;
  // Joined data from slots
  start_time?: string;
  end_time?: string;
  // Joined data from profiles/customers
  customer_name?: string;
  customer_phone?: string;
  // Other display fields
  service_name?: string;
  provider_name?: string;
  slot_date?: string;
  slot_time?: string;
};

// Updated type definition for business bids view
type BidWithDetails = {
  id: string;
  user_id: string;
  slot_id: string;
  bid_amount: number;
  created_at: string;
  status?: string;
  tenant_id?: string;
  // Joined data from slots
  service_id?: string;
  provider_id?: string;
  start_time?: string;
  end_time?: string;
  is_auction?: boolean;
  min_price?: number;
  // Bid competition info
  current_price?: number;
  is_winning?: boolean;
  // Customer info
  customer_name?: string;
  customer_phone?: string;
  // Service and provider info
  service_name?: string;
  provider_name?: string;
  slot_date?: string;
  slot_time?: string;
};

// Type for customer data fetched from the database
type Customer = {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
};

// Type for service data fetched from the database
type Service = {
  id: string;
  name: string;
};

// Type for provider data fetched from the database
type Profile = {
  id: string;
  first_name: string;
  last_name: string;
  user_id: string;
  phone_number?: string;
};

// Simple DataTable component - Updated with specific types
const DataTable = ({ columns, data }: { 
  columns: Array<{
    name: string;
    selector?: (row: BookingWithDetails | BidWithDetails) => string | JSX.Element;
    sortable?: boolean;
    cell?: (row: BookingWithDetails | BidWithDetails) => JSX.Element;
  }>, 
  data: Array<BookingWithDetails | BidWithDetails> 
}) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr>
            {columns.map((column, i) => (
              <th key={i} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{column.name}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {data.map((row, i) => (
            <tr key={i}>
              {columns.map((column, j) => (
                <td key={j} className="px-6 py-4 whitespace-nowrap">{column.cell ? column.cell(row) : column.selector ? column.selector(row) : ''}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Define simple UI components since the imported ones aren't available
const Button = ({ 
  children, 
  variant, 
  size, 
  asChild, 
  onClick 
}: { 
  children: React.ReactNode; 
  variant?: string; 
  size?: string; 
  asChild?: boolean; 
  onClick?: () => void; 
}) => {
  const className = `
    ${variant === 'destructive' ? 'bg-red-500 hover:bg-red-600 text-white' : 
      variant === 'outline' ? 'border border-gray-300 hover:bg-gray-100' : 
      'bg-blue-500 hover:bg-blue-600 text-white'}
    ${size === 'sm' ? 'px-2 py-1 text-xs' : 'px-4 py-2 text-sm'}
    rounded-md font-medium transition-colors
  `;

  if (asChild) {
    return <div className={className}>{children}</div>;
  }

  return (
    <button className={className} onClick={onClick}>
      {children}
    </button>
  );
};

// Simple table components
const Table = ({ children }: { children: React.ReactNode }) => (
  <table className="min-w-full divide-y divide-gray-200">{children}</table>
);

const TableHeader = ({ children }: { children: React.ReactNode }) => (
  <thead className="bg-gray-50">{children}</thead>
);

const TableBody = ({ children }: { children: React.ReactNode }) => (
  <tbody className="divide-y divide-gray-200">{children}</tbody>
);

const TableRow = ({ children }: { children: React.ReactNode }) => (
  <tr>{children}</tr>
);

const TableHead = ({ children }: { children: React.ReactNode }) => (
  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{children}</th>
);

const TableCell = ({ children }: { children: React.ReactNode }) => (
  <td className="px-6 py-4 whitespace-nowrap">{children}</td>
);

export default function Dashboard() {
  const { user, isLoading } = useAuth();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [bids, setBids] = useState<BidWithDetails[]>([]);
  const [activeTab, setActiveTab] = useState('appointments');
  const router = useRouter();
  
  // Use a ref to store the cancelBooking function that needs access to fetchBookings
  const cancelBookingRef = useRef<(bookingId: string) => Promise<void>>();

  useEffect(() => {
    // Redirect if not logged in
    if (!isLoading && !user) {
      router.push('/auth/signin');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user) {
      const supabase = getSupabaseClient();
      if (!supabase) return;

      // Fetch user profile
      const fetchProfile = async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
        } else {
          setProfileData(data);
        }
      };

      // Fetch all bookings for this business (for admin/business owners)
      const fetchBookings = async () => {
        try {
          // Get basic booking data with slots but without trying the join
          const { data: bookingsData, error: bookingsError } = await supabase
            .from('bookings')
            .select('*, slots(*)')
            .order('created_at', { ascending: false })
            .limit(100);

          if (bookingsError) {
            console.error('Error fetching bookings:', bookingsError);
            return;
          }

          console.log('Raw bookings data:', bookingsData);
          
          // Get a direct query from customers table
          const { data: allCustomers, error: customersError } = await supabase
            .from('customers')
            .select('*');
          
          if (customersError) {
            console.error('Error fetching all customers:', customersError);
          }
          
          console.log('All customers raw data:', JSON.stringify(allCustomers));
          
          // Make a direct map of customers by ID - Updated type
          const customerMap: Record<string, Customer> = {};
          if (allCustomers && allCustomers.length > 0) {
            allCustomers.forEach(c => {
              customerMap[c.id] = c;
            });
            console.log('Customer map built from database with keys:', Object.keys(customerMap));
          }
          
          // Collect service and provider IDs
          const serviceIds = bookingsData
            .map(booking => booking.service_id)
            .filter(Boolean);
            
          const providerIds = bookingsData
            .map(booking => booking.provider_profile_id)
            .filter(Boolean);
            
          // Fetch services
          const { data: servicesData, error: servicesError } = await supabase
            .from('services')
            .select('*');
            
          if (servicesError) {
            console.error('Error fetching services:', servicesError);
          }
          
          // Fetch providers (profiles)
          const { data: providersData, error: providersError } = await supabase
            .from('profiles')
            .select('*');
            
          if (providersError) {
            console.error('Error fetching providers:', providersError);
          }
          
          // Create maps - Updated types
          const serviceMap: Record<string, Service> = {};
          if (servicesData) {
            servicesData.forEach(service => {
              if (service.id) {
                serviceMap[service.id] = service;
              }
            });
          }
          
          const providerMap: Record<string, Profile> = {};
          if (providersData) {
            providersData.forEach(provider => {
              if (provider.id) {
                providerMap[provider.id] = provider;
              }
            });
          }
          
          // Process bookings
          const processedBookings = bookingsData.map(booking => {
            const slot = booking.slots || {};
            
            // Get customer data - Use Customer type
            const customer: Customer | null = booking.customer_id ? customerMap[booking.customer_id] : null;
            console.log(`For booking ${booking.id}, customer_id=${booking.customer_id}, found customer:`, customer);
            
            // Get service data - Use Service type
            const service: Service | null = booking.service_id ? serviceMap[booking.service_id] : null;
            
            // Get provider data - Use Profile type
            const provider: Profile | null = booking.provider_profile_id ? providerMap[booking.provider_profile_id] : null;
            
            // Format customer name from actual customer data
            const customerName = customer
              ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
              : 'Unknown';
            
            const serviceName = service 
              ? service.name 
              : `Service #${booking.service_id?.substring(0, 8) || 'Unknown'}`;
              
            const providerName = provider 
              ? `${provider.first_name || ''} ${provider.last_name || ''}`.trim() 
              : `Provider #${booking.provider_profile_id?.substring(0, 8) || 'Unknown'}`;
            
            // Format date and time
            const startTime = slot.start_time ? new Date(slot.start_time) : null;
            const formattedTime = startTime ? startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A';
            const formattedDate = startTime ? startTime.toLocaleDateString() : 'N/A';
            
            return {
              ...booking,
              customer_name: customerName,
              service_name: serviceName,
              provider_name: providerName,
              slot_date: formattedDate,
              slot_time: formattedTime
            };
          });
          
          console.log('Final processed bookings:', processedBookings);
          setBookings(processedBookings);
        } catch (error) {
          console.error('Error in fetchBookings:', error);
        }
      };

      // Fetch bids based on user role
      const fetchBids = async () => {
        try {
          console.log("Attempting direct bids query");
          
          // Simple direct query with no filters to check if we can access any bids
          const { data: allBids, error: allBidsError } = await supabase
            .from('bids')
            .select('*');
            
          console.log("Direct query of all bids (no filters):", allBids?.length || 0, allBids);
          
          if (allBidsError) {
            console.error("Error with unfiltered bids query:", allBidsError);
            return;
          }
          
          // If we can access bids, use them directly
          if (allBids && allBids.length > 0) {
            console.log("Found bids in the database, processing them");
            
            // Get the slot information for these bids
            const slotIds = allBids.map(bid => bid.slot_id);
            
            const { data: slotsData, error: slotsError } = await supabase
              .from('slots')
              .select('id, start_time, end_time, service_id, provider_id, is_auction, min_price')
              .in('id', slotIds);
              
            if (slotsError) {
              console.error('Error fetching slots for bids:', slotsError);
              // We might still be able to display basic bid info
              const basicBids = allBids.map(bid => ({ ...bid })); // Cast or map to BidWithDetails if needed
              setBids(basicBids as BidWithDetails[]); 
              return;
            }
            
            // Get customer information for better display
            const customerUserIds = allBids
              .map(bid => bid.user_id)
              .filter(id => id); // Remove null/undefined
              
            const { data: bidCustomersData, error: bidCustomersError } = await supabase
              .from('profiles')
              .select('id, user_id, first_name, last_name, phone_number')
              .in('user_id', customerUserIds);
              
            if (bidCustomersError) {
              console.error('Error fetching customer profiles for bids:', bidCustomersError);
            }
            
            // Get service information
            const bidServiceIds = Array.from(new Set([
              ...(slotsData?.map(slot => slot.service_id).filter(Boolean as any) || []),
              // ...allBids.map(bid => bid.service_id).filter(Boolean as any) // bids table doesn't have service_id
            ]));
            
            let bidServicesData: Service[] = []; // Use Service type
            if (bidServiceIds.length > 0) {
              console.log('Fetching bid services with IDs:', bidServiceIds);
              const { data: fetchedServicesData, error: servicesError } = await supabase
                .from('services')
                .select('id, name')
                .in('id', bidServiceIds);
                
              if (servicesError) {
                console.error('Error fetching services:', servicesError);
              } else {
                console.log('Retrieved bid services:', fetchedServicesData?.length || 0);
                bidServicesData = (fetchedServicesData || []) as Service[];
              }
            }
            
            // Get provider information
            const bidProviderIds = Array.from(new Set([
              ...(slotsData?.map(slot => slot.provider_id).filter(Boolean as any) || []),
              // ...allBids.map(bid => bid.provider_id).filter(Boolean as any) // bids table doesn't have provider_id
            ]));
            
            let bidProvidersData: Profile[] = []; // Use Profile type
            if (bidProviderIds.length > 0) {
              console.log('Fetching bid providers with IDs:', bidProviderIds);
              const { data: fetchedProvidersData, error: providersError } = await supabase
                .from('profiles')
                .select('id, user_id, first_name, last_name')
                .in('id', bidProviderIds);
                
              if (providersError) {
                console.error('Error fetching provider profiles:', providersError);
              } else {
                console.log('Retrieved bid providers:', fetchedProvidersData?.length || 0);
                bidProvidersData = (fetchedProvidersData || []) as Profile[];
              }
            }
            
            // Get highest bid for each slot
            const highestBidsBySlot: Record<string, number> = {};
            allBids.forEach(bid => {
              if (!highestBidsBySlot[bid.slot_id] || bid.bid_amount > highestBidsBySlot[bid.slot_id]) {
                highestBidsBySlot[bid.slot_id] = bid.bid_amount;
              }
            });
            
            // Combine all the data
            const combinedBids = allBids.map(bid => {
              const slot = slotsData?.find(slot => slot.id === bid.slot_id);
              const customerProfile = bidCustomersData?.find(c => c.user_id === bid.user_id);
              const service = bidServicesData.find(s => s.id === slot?.service_id);
              const provider = bidProvidersData.find(p => p.id === slot?.provider_id);
              
              const highestBid = highestBidsBySlot[bid.slot_id];
              const isWinning = highestBid && bid.bid_amount >= highestBid;
              
              // Use Profile type for customer info
              const customer: Profile | null = customerProfile || null;
              
              return {
                ...bid,
                service_id: slot?.service_id,
                provider_id: slot?.provider_id,
                is_auction: slot?.is_auction,
                min_price: slot?.min_price,
                start_time: slot?.start_time,
                end_time: slot?.end_time,
                current_price: highestBid,
                is_winning: isWinning,
                service_name: service?.name || `Service #${slot?.service_id}`,
                provider_name: provider ? 
                  `${provider.first_name || ''} ${provider.last_name || ''}`.trim() || 
                  `Provider #${slot?.provider_id}` : 
                  `Provider #${slot?.provider_id}`,
                customer_name: customer ? 
                  `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 
                  'Unknown' : 
                  'Unknown',
                customer_phone: customer?.phone_number,
                slot_time: slot?.start_time ? new Date(slot.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Unknown time',
                slot_date: slot?.start_time ? new Date(slot.start_time).toLocaleDateString() : 'Unknown date',
                status: bid.bid_amount === highestBid ? 'winning' : 'losing'
              } as BidWithDetails; // Ensure the final object matches the type
            });
            
            setBids(combinedBids);
          } else {
            setBids([]); // Set to empty array if no bids found
          }
        } catch (error) {
          console.error('Error in fetchBids:', error);
          setBids([]); // Set to empty on error
        }
      };

      // Define the cancelBooking function with access to fetchBookings
      cancelBookingRef.current = async (bookingId: string) => {
        try {
          const supabase = getSupabaseClient();
          if (!supabase) return;

          const { data, error } = await supabase
            .from('bookings')
            .update({ status: 'cancelled' })
            .eq('id', bookingId);

          if (error) {
            console.error('Error cancelling booking:', error);
            return;
          }
          
          // Refresh bookings after cancellation
          await fetchBookings();
        } catch (error) {
          console.error('Error in handleCancelBooking:', error);
        }
      };

      // Call the data fetching functions
      fetchProfile();
      fetchBookings();
      fetchBids();
    }
  }, [user]);
  
  // Public handler that uses the ref function
  const handleCancelBooking = (bookingId: string) => {
    if (cancelBookingRef.current) {
      cancelBookingRef.current(bookingId);
    } else {
      console.error('Cancel booking function not initialized yet');
    }
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Profile header */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-4 py-5 sm:px-6">
            <h1 className="text-lg font-semibold">Welcome back, {profileData?.first_name}</h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage your appointments, auctions, and account settings.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('appointments')}
              className={`${
                activeTab === 'appointments'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Appointments
            </button>
            <button
              onClick={() => setActiveTab('auctions')}
              className={`${
                activeTab === 'auctions'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <span>My Bids</span>
              {bids.length > 0 && (
                <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                  {bids.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`${
                activeTab === 'profile'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Profile
            </button>
          </nav>
        </div>

        {/* Content based on active tab */}
        <div className="bg-white shadow rounded-lg p-4 sm:p-6">
          {activeTab === 'appointments' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">
                  {profileData?.user_type === 'admin' 
                    ? 'All Business Appointments' 
                    : profileData?.user_type === 'barber' || profileData?.user_type === 'tattoo_artist'
                      ? 'Your Client Appointments'
                      : 'Your Appointments'
                  }
                </h2>
                <Link 
                  href="/services" 
                  className="bg-blue-600 text-white py-2 px-4 rounded-md text-sm hover:bg-blue-700"
                >
                  Book New Appointment
                </Link>
              </div>
              
              {bookings.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-gray-500">
                    {profileData?.user_type === 'admin' 
                      ? 'No appointments found for the business.' 
                      : profileData?.user_type === 'barber' || profileData?.user_type === 'tattoo_artist'
                        ? 'You don\'t have any client appointments yet.'
                        : 'You don\'t have any appointments yet.'
                    }
                  </p>
                  <Link 
                    href="/services" 
                    className="mt-4 inline-block bg-blue-600 text-white py-2 px-4 rounded-md text-sm hover:bg-blue-700"
                  >
                    Browse Services
                  </Link>
                </div>
              ) : (
                <DataTable columns={[
                  { name: 'Date', selector: row => row.slot_date ?? 'N/A', sortable: true },
                  { name: 'Time', selector: row => row.slot_time ?? 'N/A' },
                  { name: 'Service', selector: row => row.service_name ?? 'N/A' },
                  { name: 'Provider', selector: row => row.provider_name ?? 'N/A' },
                  { name: 'Customer', selector: row => row.customer_name ?? 'N/A' },
                  { name: 'Status', selector: row => row.status ?? 'N/A', sortable: true },
                  {
                    name: 'Actions',
                    cell: row => (
                      <div className="flex gap-2">
                        <button className="border border-gray-300 hover:bg-gray-100 px-2 py-1 text-xs rounded-md font-medium transition-colors">
                          <Link href={`/booking/${row.id}`}>View</Link>
                        </button>
                        {row.status === 'pending' && (
                          <button
                            className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 text-xs rounded-md font-medium transition-colors"
                            onClick={() => handleCancelBooking(row.id)}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    ),
                  },
                ]} data={bookings} />
              )}
            </div>
          )}

          {activeTab === 'auctions' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">
                  {profileData?.user_type === 'admin' 
                    ? 'All Auction Bids' 
                    : profileData?.user_type === 'barber' || profileData?.user_type === 'tattoo_artist'
                      ? 'Bids on Your Services'
                      : 'Your Auction Bids'
                  }
                </h2>
                <Link 
                  href="/auctions" 
                  className="bg-blue-600 text-white py-2 px-4 rounded-md text-sm hover:bg-blue-700"
                >
                  View Active Auctions
                </Link>
              </div>
              
              {bids.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-gray-500">
                    {profileData?.user_type === 'admin' 
                      ? 'No auction bids found for the business.' 
                      : profileData?.user_type === 'barber' || profileData?.user_type === 'tattoo_artist'
                        ? 'No bids on your services yet.'
                        : 'You haven\'t placed any bids yet.'
                    }
                  </p>
                  <Link 
                    href="/auctions" 
                    className="mt-4 inline-block bg-blue-600 text-white py-2 px-4 rounded-md text-sm hover:bg-blue-700"
                  >
                    Browse Auctions
                  </Link>
                </div>
              ) : (
                <DataTable columns={[
                  { name: 'Date', selector: row => row.slot_date ?? 'N/A', sortable: true },
                  { name: 'Time', selector: row => row.slot_time ?? 'N/A' },
                  { name: 'Service', selector: row => row.service_name ?? 'N/A' },
                  { name: 'Provider', selector: row => row.provider_name ?? 'N/A' },
                  { 
                    name: 'Your Bid', 
                    selector: row => {
                      // Type guard to check if current_price exists
                      if ('current_price' in row && row.current_price !== undefined && row.current_price !== null) {
                        return `$${(row.current_price / 100).toFixed(2)}`;
                      }
                      return 'N/A';
                    },
                    sortable: true 
                  },
                  { name: 'Status', selector: row => row.status ?? 'N/A', sortable: true },
                  {
                    name: 'Actions',
                    cell: row => (
                      <div className="flex gap-2">
                        <button className="border border-gray-300 hover:bg-gray-100 px-2 py-1 text-xs rounded-md font-medium transition-colors">
                          <Link href={`/bid/${row.id}`}>View</Link>
                        </button>
                      </div>
                    ),
                  },
                ]} data={bids} />
              )}
            </div>
          )}
          
          {activeTab === 'profile' && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Your Profile</h2>
              
              {profileData ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Personal Information</h3>
                      <div className="mt-2 border rounded-md p-4">
                        <div className="mb-2">
                          <span className="text-sm text-gray-500">Name:</span>
                          <p className="text-sm font-medium">
                            {profileData.first_name} {profileData.last_name}
                          </p>
                        </div>
                        <div className="mb-2">
                          <span className="text-sm text-gray-500">Email:</span>
                          <p className="text-sm font-medium">{user.email}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">Phone:</span>
                          <p className="text-sm font-medium">{profileData.phone_number || 'Not provided'}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Account Settings</h3>
                      <div className="mt-2 border rounded-md p-4">
                        <div className="mb-2">
                          <span className="text-sm text-gray-500">Account Type:</span>
                          <p className="text-sm font-medium capitalize">
                            {profileData.user_type.replace('_', ' ')}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">Member Since:</span>
                          <p className="text-sm font-medium">
                            {new Date(profileData.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t pt-6 flex justify-end">
                    <button className="bg-blue-600 text-white py-2 px-4 rounded-md text-sm hover:bg-blue-700">
                      Edit Profile
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="mt-2 text-gray-500">Loading profile data...</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}