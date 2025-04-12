'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { getSupabaseClient } from '@/lib/supabaseClient';
import Navbar from '@/components/ui/Navbar';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import React, { Fragment } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs/tabs';
import { Table, TableHeader, TableBody, TableHead, TableCell, TableRow } from '@/components/ui/table/table';

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
  slot_id: string;
  bid_amount: number;
  created_at: string;
  status?: string;
  tenant_id?: string;
  service_id?: string;
  provider_id?: string;
  customer_id?: string;
  start_time?: string;
  end_time?: string;
  is_auction?: boolean;
  min_price?: number;
  service_name?: string;
  provider_name?: string;
  slot_time?: string;
  slot_date?: string;
  owner_type: string;
  parent_bid_id?: string;
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

// Add type definitions for the database responses
type SlotWithRelations = {
  id: string;
  service_id: string;
  provider_id: string;
  start_time: string;
  end_time: string;
  is_auction: boolean;
  min_price: number;
  services: {
    id: string;
    name: string;
  };
  profiles: {
    id: string;
    first_name: string;
    last_name: string;
  };
};

// Add this type before the DataTable component
type GroupedBids = {
  [key: string]: {
    originalBid: BidWithDetails;
    relatedBids: BidWithDetails[];
  };
};

// Update the DataTable component
const DataTable = ({ columns, data }: { 
  columns: Array<{
    name: string;
    selector?: (row: BidWithDetails) => string | JSX.Element;
    sortable?: boolean;
    cell?: (row: BidWithDetails) => JSX.Element;
  }>, 
  data: Array<BidWithDetails> 
}) => {
  // Type guard to check if array contains BidWithDetails
  const isBidArray = (items: Array<BidWithDetails>): items is BidWithDetails[] => {
    return items.length === 0 || 'bid_amount' in items[0];
  };

  // Group bids by slot_id - only for BidWithDetails arrays
  const groupBidsBySlot = (items: Array<BidWithDetails>): GroupedBids => {
    if (!isBidArray(items)) return {};
    
    const grouped: GroupedBids = {};
    
    // First pass: collect all customer bids
    items.forEach(bid => {
      if (!bid.slot_id) return;
      
      // If this is a customer bid, add it as an original bid
      if (bid.owner_type === 'customer') {
        if (!grouped[bid.slot_id]) {
          grouped[bid.slot_id] = {
            originalBid: bid,
            relatedBids: []
          };
        }
      }
    });

    // Second pass: add provider counter bids to their respective groups
    items.forEach(bid => {
      if (!bid.slot_id || !bid.parent_bid_id) return;

      // If this is a provider bid, find its parent bid and add it to related bids
      if (bid.owner_type === 'provider') {
        // Find the parent bid's slot_id
        const parentBid = items.find(b => b.id === bid.parent_bid_id);
        if (parentBid && parentBid.slot_id && grouped[parentBid.slot_id]) {
          grouped[parentBid.slot_id].relatedBids.push(bid);
          // Sort related bids by creation date in descending order (newest first)
          grouped[parentBid.slot_id].relatedBids.sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        }
      }
    });
    
    return grouped;
  };

  // If the data contains bid_amount, it's a bid
  const isBidsTable = data.length > 0 && 'bid_amount' in data[0];
  
  if (isBidsTable) {
    const groupedBids = groupBidsBySlot(data as BidWithDetails[]);
    
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
            {Object.entries(groupedBids).map(([slotId, group], groupIndex) => {
              // Combine all bids for this slot in chronological order (newest first)
              const allBidsForSlot = [...group.relatedBids, group.originalBid]
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

              return (
                <React.Fragment key={slotId}>
                  {allBidsForSlot.map((bid, bidIndex) => {
                    const isNewestBid = bidIndex === 0;
                    const hasMultipleBids = allBidsForSlot.length > 1;

                    return (
                      <tr 
                        key={`${slotId}-bid-${bidIndex}`} 
                        className={`${
                          isNewestBid || !hasMultipleBids
                            ? "bg-white hover:bg-gray-50"
                            : "bg-gray-50 border-l-4 border-gray-200 text-gray-500"
                        }`}
                      >
                        {columns.map((column, j) => (
                          <td 
                            key={j} 
                            className={`whitespace-nowrap ${
                              isNewestBid || !hasMultipleBids
                                ? "px-6 py-4 text-base font-medium"
                                : "px-6 py-3 text-sm"
                            }`}
                          >
                            {column.cell ? column.cell(bid) : column.selector ? column.selector(bid) : ''}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                  {/* Add a subtle spacing row between groups */}
                  {groupIndex < Object.keys(groupedBids).length - 1 && (
                    <tr className="h-2 bg-gray-50">
                      <td colSpan={columns.length} className="border-b border-gray-200"></td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  // Regular table for non-bid data
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

// Add BidActionModal component
const BidActionModal = ({ 
  bid, 
  isOpen, 
  onClose,
  onAccept,
  onDecline,
  onCounterbid,
}: { 
  bid: BidWithDetails;
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
  onDecline: () => void;
  onCounterbid: () => void;
}) => {
  if (!isOpen) return null;

  const handleDeclineClick = () => {
    console.log('Decline button clicked');
    onDecline();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">Bid Actions</h3>
        
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">Service: {bid.service_name}</p>
          <p className="text-sm text-gray-600 mb-2">Date: {bid.slot_date}</p>
          <p className="text-sm text-gray-600 mb-2">Time: {bid.slot_time}</p>
          <p className="text-sm text-gray-600">Bid Amount: ${(bid.bid_amount / 100).toFixed(2)}</p>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={onAccept}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-md text-sm hover:bg-green-700 transition-colors"
          >
            Accept Bid
          </button>
          <button
            onClick={onCounterbid}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md text-sm hover:bg-blue-700 transition-colors"
          >
            Make Counterbid
          </button>
          <button
            onClick={handleDeclineClick}
            className="w-full bg-red-600 text-white py-2 px-4 rounded-md text-sm hover:bg-red-700 transition-colors"
          >
            Decline Bid
          </button>
          <button
            onClick={onClose}
            className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-md text-sm hover:bg-gray-50 transition-colors mt-2"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Add CounterBidModal component after BidActionModal
const CounterBidModal = ({ 
  bid, 
  isOpen, 
  onClose,
  onSubmit,
}: { 
  bid: BidWithDetails | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (amount: number) => void;
}) => {
  const [amount, setAmount] = useState(bid ? Math.ceil(bid.bid_amount * 1.1) : 0);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (bid) {
      setAmount(Math.ceil(bid.bid_amount * 1.1));
    }
  }, [bid]);

  const handleSubmit = () => {
    if (!bid) return;
    if (amount <= bid.bid_amount) {
      setError('Counter bid must be higher than the original bid amount');
      return;
    }
    onSubmit(amount);
  };

  if (!isOpen || !bid) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">Make Counter Bid</h3>
        
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">Original Bid: ${(bid.bid_amount / 100).toFixed(2)}</p>
          <p className="text-sm text-gray-600 mb-2">Service: {bid.service_name}</p>
          <p className="text-sm text-gray-600 mb-2">Date: {bid.slot_date}</p>
          <p className="text-sm text-gray-600">Time: {bid.slot_time}</p>
        </div>

        <div className="mb-4">
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
            Your Counter Bid Amount ($)
          </label>
          <input
            type="number"
            id="amount"
            value={(amount / 100).toFixed(2)}
            onChange={(e) => {
              setAmount(Math.round(parseFloat(e.target.value) * 100));
              setError('');
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            min={(bid.bid_amount / 100 + 0.01).toFixed(2)}
            step="0.01"
          />
          {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={handleSubmit}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md text-sm hover:bg-blue-700 transition-colors"
          >
            Submit Counter Bid
          </button>
          <button
            onClick={onClose}
            className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-md text-sm hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

const BidsDataTable = ({ columns, data }: { 
  columns: Array<{
    name: string;
    selector?: (row: BidWithDetails) => string | JSX.Element;
    sortable?: boolean;
    cell?: (row: BidWithDetails) => JSX.Element;
  }>, 
  data: Array<BidWithDetails> 
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Group bids by slot_id and customer_id
  const groupBidsBySlotAndCustomer = (items: Array<BidWithDetails>) => {
    const grouped: { [key: string]: BidWithDetails[] } = {};
    
    items.forEach(bid => {
      if (!bid.slot_id || !bid.customer_id) return;
      
      const groupKey = `${bid.slot_id}-${bid.customer_id}`;
      if (!grouped[groupKey]) {
        grouped[groupKey] = [];
      }
      grouped[groupKey].push(bid);
    });

    // Sort bids within each group by created_at in descending order
    Object.values(grouped).forEach(group => {
      group.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });
    
    return grouped;
  };

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey);
      } else {
        newSet.add(groupKey);
      }
      return newSet;
    });
  };

  const groupedBids = groupBidsBySlotAndCustomer(data);

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[30px]"></TableHead>
            {columns.map((column) => (
              <TableHead key={column.name}>{column.name}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.entries(groupedBids).map(([groupKey, bids]) => {
            const isExpanded = expandedGroups.has(groupKey);
            const latestBid = bids[0]; // First bid is the most recent due to sorting

            return (
              <Fragment key={groupKey}>
                {/* Latest bid row */}
                <TableRow className="hover:bg-muted/50 cursor-pointer">
                  <TableCell>
                    <button 
                      onClick={() => toggleGroup(groupKey)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <svg 
                        className={`h-4 w-4 transition-transform ${isExpanded ? 'transform rotate-90' : ''}`}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                  </TableCell>
                  {columns.map((column) => (
                    <TableCell 
                      key={column.name}
                      onClick={() => toggleGroup(groupKey)}
                    >
                      {column.cell 
                        ? column.cell(latestBid)
                        : column.selector 
                          ? column.selector(latestBid)
                          : ''}
                    </TableCell>
                  ))}
                </TableRow>

                {/* History rows */}
                {isExpanded && bids.slice(1).map((bid) => (
                  <TableRow 
                    key={bid.id} 
                    className="bg-muted/50 border-l-4 border-gray-200"
                  >
                    <TableCell></TableCell>
                    {columns.map((column) => (
                      <TableCell 
                        key={column.name}
                        className="text-sm text-gray-500"
                      >
                        {column.cell 
                          ? column.cell(bid)
                          : column.selector 
                            ? column.selector(bid)
                            : ''}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

const BookingsDataTable = ({ columns, data }: { 
  columns: Array<{
    name: string;
    selector?: (row: BookingWithDetails) => string | JSX.Element;
    sortable?: boolean;
    cell?: (row: BookingWithDetails) => JSX.Element;
  }>, 
  data: Array<BookingWithDetails> 
}) => {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.name}>{column.name}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow key={row.id}>
              {columns.map((column) => (
                <TableCell key={column.name}>
                  {column.cell 
                    ? column.cell(row)
                    : column.selector 
                      ? column.selector(row)
                      : ''}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default function Dashboard() {
  const { user, isLoading } = useAuth();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [bids, setBids] = useState<BidWithDetails[]>([]);
  const [activeTab, setActiveTab] = useState('appointments');
  const [selectedBid, setSelectedBid] = useState<BidWithDetails | null>(null);
  const [counterBidModalBid, setCounterBidModalBid] = useState<BidWithDetails | null>(null);
  const router = useRouter();
  
  // Use a ref to store the cancelBooking function that needs access to fetchBookings
  const cancelBookingRef = useRef<(bookingId: string) => Promise<void>>();

  // Memoize fetchBids
  const fetchBids = useCallback(async () => {
    if (!user) {
      console.log('No user found, skipping bid fetch');
      return;
    }
    
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase client not initialized');

      console.log('Fetching bids for user:', user.id);

      // First get the user's profile to get their provider ID
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')  // This is their provider_id
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return;
      }

      if (!profileData) {
        console.error('No profile found for user');
        return;
      }

      console.log('Found profile:', profileData);

      // Then fetch the bids where either:
      // 1. The user is the provider (profile_provider_id matches their profile id)
      // 2. The user is the customer (customer_id matches their user id)
      const { data: bidsData, error: bidsError } = await supabase
        .from('bids')
        .select(`
          *,
          slots (
            id,
            service_id,
            provider_id,
            start_time,
            end_time,
            is_auction,
            min_price,
            services (
              id,
              name
            ),
            profiles (
              id,
              first_name,
              last_name
            )
          )
        `)
        .or(`profile_provider_id.eq.${profileData.id},customer_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (bidsError) {
        console.error('Error fetching bids:', bidsError);
        return;
      }

      console.log('Raw bids data:', bidsData);

      if (bidsData) {
        const combinedBids = bidsData.map(bid => {
          const slot = bid.slots;
          const service = slot?.services;
          const provider = slot?.profiles;

          const processedBid = {
            id: bid.id,
            slot_id: bid.slot_id,
            bid_amount: bid.bid_amount,
            created_at: bid.created_at,
            status: bid.status,
            tenant_id: bid.tenant_id,
            service_id: slot?.service_id,
            provider_id: bid.profile_provider_id,
            customer_id: bid.customer_id,
            start_time: slot?.start_time,
            end_time: slot?.end_time,
            is_auction: slot?.is_auction,
            min_price: slot?.min_price,
            service_name: service?.name || `Service #${slot?.service_id}`,
            provider_name: provider ? 
              `${provider.first_name || ''} ${provider.last_name || ''}`.trim() || 
              `Provider #${bid.profile_provider_id}` : 
              `Provider #${bid.profile_provider_id}`,
            slot_time: slot?.start_time ? new Date(slot.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Unknown time',
            slot_date: slot?.start_time ? new Date(slot.start_time).toLocaleDateString() : 'Unknown date',
            owner_type: bid.owner_type,
            parent_bid_id: bid.parent_bid_id
          } as BidWithDetails;

          console.log('Processed bid:', processedBid);
          return processedBid;
        });

        console.log('Final processed bids:', combinedBids);
        setBids(combinedBids);
      } else {
        console.log('No bids data found');
        setBids([]);
      }
    } catch (error) {
      console.error('Error in fetchBids:', error);
      setBids([]);
    }
  }, [user]); // Only recreate if user changes

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

      // Define the cancelBooking function with access to fetchBookings
      cancelBookingRef.current = async (bookingId: string) => {
        try {
          const supabase = getSupabaseClient();
          if (!supabase) return;

          // Corrected: Only destructure the error if data is not needed
          const { error: cancelError } = await supabase
            .from('bookings')
            .update({ status: 'cancelled' })
            .eq('id', bookingId);

          // Use the specific error variable from this operation
          if (cancelError) { 
            console.error('Error cancelling booking:', cancelError);
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

      // Set up interval to refresh data
      const interval = setInterval(() => {
        fetchProfile();
        fetchBookings();
        fetchBids();
      }, 30000); // Refresh every 30 seconds

      // Cleanup interval on unmount
      return () => clearInterval(interval);
    }
  }, [user, fetchBids]); // Add fetchBids to dependencies
  
  // Public handler that uses the ref function
  const handleCancelBooking = (bookingId: string) => {
    if (cancelBookingRef.current) {
      cancelBookingRef.current(bookingId);
    } else {
      console.error('Cancel booking function not initialized yet');
    }
  };

  // Update the handleCounterbid function
  const handleCounterbid = async (amount: number) => {
    console.log('handleCounterbid called with amount:', amount);
    if (!counterBidModalBid || !user) {
      console.error('Missing required data:', { counterBidModalBid: !!counterBidModalBid, user: !!user });
      return;
    }
    
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase client not initialized');

      // Get the provider's profile ID
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      console.log('Profile data fetched:', profileData);
      if (profileError) throw profileError;
      if (!profileData) throw new Error('No profile found');

      // Create the counterbid
      const { data: newBid, error: bidError } = await supabase
        .from('bids')
        .insert([
          {
            slot_id: counterBidModalBid.slot_id,
            profile_provider_id: profileData.id,
            customer_id: counterBidModalBid.customer_id,
            tenant_id: counterBidModalBid.tenant_id,
            bid_amount: amount,
            status: 'pending',
            owner_type: 'provider',
            parent_bid_id: counterBidModalBid.id
          }
        ])
        .select()
        .single();

      console.log('New bid created:', newBid);
      if (bidError) {
        console.error('Error creating new bid:', bidError);
        throw bidError;
      }

      // Update the original bid's status
      const { error: updateError } = await supabase
        .from('bids')
        .update({ status: 'countered' })
        .eq('id', counterBidModalBid.id);

      console.log('Original bid updated');
      if (updateError) {
        console.error('Error updating original bid:', updateError);
        throw updateError;
      }

      try {
        // Try to create notification, but don't fail if it errors
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert([
            {
              user_id: counterBidModalBid.customer_id,
              title: 'Counterbid Received',
              message: `The service provider has made a counterbid of $${(amount / 100).toFixed(2)} for your bid.`,
              notification_type: 'counterbid',
              related_id: newBid.id
            }
          ]);

        if (notificationError) {
          console.error('Error creating notification:', notificationError);
          // Don't throw the error, just log it
        } else {
          console.log('Notification created successfully');
        }
      } catch (notificationError) {
        console.error('Error in notification creation:', notificationError);
        // Don't throw the error, continue with the flow
      }

      // Close modal and refresh bids
      setCounterBidModalBid(null);
      await fetchBids();
      console.log('Bids refreshed');

    } catch (error) {
      console.error('Error placing counterbid:', error);
      alert('Error placing counterbid. Please try again.');
    }
  };

  const handleAcceptBid = async () => {
    if (!selectedBid || !user) return;
    
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase client not initialized');

      // First get the bid details to ensure we have the latest data
      const { data: bidData, error: bidFetchError } = await supabase
        .from('bids')
        .select('*')
        .eq('id', selectedBid.id)
        .single();

      if (bidFetchError) throw bidFetchError;
      if (!bidData) throw new Error('Bid not found');

      // 1. Change the status of the bid to 'accepted'
      const { error: bidUpdateError } = await supabase
        .from('bids')
        .update({ status: 'accepted' })
        .eq('id', selectedBid.id);

      if (bidUpdateError) throw bidUpdateError;

      // 2. Create a new booking record for the winning customer
      const { data: newBooking, error: bookingCreateError } = await supabase
        .from('bookings')
        .insert([
          {
            slot_id: bidData.slot_id,
            customer_id: bidData.customer_id, // Use customer_id from the bid
            provider_profile_id: bidData.profile_provider_id, // Use profile_provider_id from the bid
            service_id: selectedBid.service_id,
            price_paid: bidData.bid_amount,
            status: 'confirmed',
            tenant_id: bidData.tenant_id
          }
        ])
        .select()
        .single();

      if (bookingCreateError) throw bookingCreateError;

      // 3. Cancel any existing bookings for this slot
      const { error: existingBookingUpdateError } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('slot_id', bidData.slot_id)
        .neq('id', newBooking.id); // Don't cancel the booking we just created

      if (existingBookingUpdateError) throw existingBookingUpdateError;

      // 4. Create a notification for the customer
      await supabase
        .from('notifications')
        .insert([
          {
            user_id: bidData.customer_id, // Use customer_id from the bid
            title: 'Bid Accepted',
            message: `Your bid of $${(bidData.bid_amount / 100).toFixed(2)} has been accepted! Your appointment is scheduled for ${selectedBid.slot_date} at ${selectedBid.slot_time}.`,
            notification_type: 'bid_accepted',
            related_id: selectedBid.id
          }
        ]);

      // 5. Refresh the bids list
      await fetchBids();
      
      // Close the modal
      setSelectedBid(null);

    } catch (error) {
      console.error('Error accepting bid:', error);
      // You might want to show an error message to the user here
    }
  };

  const handleDeclineBid = async () => {
    console.log('handleDeclineBid called with bid:', selectedBid);
    if (!selectedBid || !user) {
      console.log('Missing required data:', { selectedBid: !!selectedBid, user: !!user });
      return;
    }
    
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase client not initialized');

      // First get the bid details to ensure we have the latest data
      const { data: bidData, error: bidFetchError } = await supabase
        .from('bids')
        .select('*')
        .eq('id', selectedBid.id)
        .single();

      console.log('Fetched bid data:', bidData);
      if (bidFetchError) throw bidFetchError;
      if (!bidData) throw new Error('Bid not found');

      // 1. Change the status of the bid to 'rejected'
      const { error: bidUpdateError } = await supabase
        .from('bids')
        .update({ status: 'rejected' })
        .eq('id', selectedBid.id);

      console.log('Bid status update result:', { error: bidUpdateError });
      if (bidUpdateError) throw bidUpdateError;

      // 2. Create a notification for the customer
      const notificationResult = await supabase
        .from('notifications')
        .insert([
          {
            user_id: bidData.customer_id,
            title: 'Bid Rejected',
            message: `Your bid of $${(bidData.bid_amount / 100).toFixed(2)} for the appointment on ${selectedBid.slot_date} at ${selectedBid.slot_time} has been rejected.`,
            notification_type: 'bid_rejected',
            related_id: selectedBid.id
          }
        ]);

      console.log('Notification creation result:', notificationResult);

      // 3. Refresh the bids list
      await fetchBids();
      console.log('Bids refreshed');
      
      // Close the modal
      setSelectedBid(null);

    } catch (error) {
      console.error('Error declining bid:', error);
      // You might want to show an error message to the user here
    }
  };

  // Define columns inside the component to access user and handleCounterbid
  const bidColumns = [
    { 
      name: 'Date', 
      selector: (row: BidWithDetails) => row.slot_date || 'N/A', 
      sortable: true 
    },
    { 
      name: 'Time', 
      selector: (row: BidWithDetails) => row.slot_time || 'N/A' 
    },
    { 
      name: 'Service', 
      selector: (row: BidWithDetails) => row.service_name || 'N/A' 
    },
    { 
      name: 'Provider', 
      selector: (row: BidWithDetails) => row.provider_name || 'N/A' 
    },
    { 
      name: 'Amount', 
      selector: (row: BidWithDetails) => `$${(row.bid_amount / 100).toFixed(2)}`,
      sortable: true 
    },
    { 
      name: 'Status', 
      selector: (row: BidWithDetails) => row.status || 'N/A', 
      sortable: true 
    },
    { 
      name: 'Type', 
      selector: (row: BidWithDetails) => row.owner_type === 'provider' ? 'Your Bid' : 'Customer Bid'
    },
    {
      name: 'Actions',
      cell: (row: BidWithDetails) => (
        <button 
          onClick={() => setSelectedBid(row)}
          className="border border-gray-300 hover:bg-gray-100 px-2 py-1 text-xs rounded-md font-medium transition-colors"
        >
          View Details
        </button>
      ),
    },
  ];

  const appointmentColumns = [
    { 
      name: 'Date', 
      selector: (row: BookingWithDetails) => row.slot_date || 'N/A', 
      sortable: true 
    },
    { 
      name: 'Time', 
      selector: (row: BookingWithDetails) => row.slot_time || 'N/A' 
    },
    { 
      name: 'Service', 
      selector: (row: BookingWithDetails) => row.service_name || 'N/A' 
    },
    { 
      name: 'Provider', 
      selector: (row: BookingWithDetails) => row.provider_name || 'N/A' 
    },
    { 
      name: 'Customer', 
      selector: (row: BookingWithDetails) => row.customer_name || 'N/A' 
    },
    { 
      name: 'Amount', 
      selector: (row: BookingWithDetails) => row.price_paid ? `$${(row.price_paid / 100).toFixed(2)}` : 'N/A',
      sortable: true 
    },
    { 
      name: 'Status', 
      selector: (row: BookingWithDetails) => row.status || 'N/A', 
      sortable: true 
    },
    {
      name: 'Actions',
      cell: (row: BookingWithDetails) => (
        <Link 
          href={`/booking/${row.id}`}
          className="border border-gray-300 hover:bg-gray-100 px-2 py-1 text-xs rounded-md font-medium transition-colors"
        >
          View
        </Link>
      ),
    },
  ];

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
      
      {/* Update CounterBidModal usage */}
      <CounterBidModal
        bid={counterBidModalBid}
        isOpen={counterBidModalBid !== null}
        onClose={() => setCounterBidModalBid(null)}
        onSubmit={handleCounterbid}
      />
      
      {/* Existing BidActionModal */}
      <BidActionModal
        bid={selectedBid!}
        isOpen={selectedBid !== null}
        onClose={() => setSelectedBid(null)}
        onAccept={handleAcceptBid}
        onDecline={handleDeclineBid}
        onCounterbid={() => {
          setCounterBidModalBid(selectedBid);
          setSelectedBid(null);
        }}
      />
      
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
                <BookingsDataTable columns={appointmentColumns} data={bookings} />
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
                <div>
                  <BidsDataTable 
                    columns={[
                      { 
                        name: 'Date', 
                        selector: (row: BidWithDetails) => row.slot_date || 'N/A'
                      },
                      { 
                        name: 'Time', 
                        selector: (row: BidWithDetails) => row.slot_time || 'N/A' 
                      },
                      { 
                        name: 'Service', 
                        selector: (row: BidWithDetails) => row.service_name || 'N/A' 
                      },
                      { 
                        name: 'Provider', 
                        selector: (row: BidWithDetails) => row.provider_name || 'N/A' 
                      },
                      { 
                        name: 'Amount', 
                        selector: (row: BidWithDetails) => `$${(row.bid_amount / 100).toFixed(2)}`
                      },
                      { 
                        name: 'Status', 
                        selector: (row: BidWithDetails) => row.status || 'N/A'
                      },
                      { 
                        name: 'Type', 
                        selector: (row: BidWithDetails) => row.owner_type === 'provider' ? 'Your Bid' : 'Customer Bid'
                      },
                      {
                        name: 'Actions',
                        cell: (row: BidWithDetails) => (
                          <button 
                            onClick={() => setSelectedBid(row)}
                            className="border border-gray-300 hover:bg-gray-100 px-2 py-1 text-xs rounded-md font-medium transition-colors"
                          >
                            View Details
                          </button>
                        ),
                      }
                    ]} 
                    data={bids} 
                  />
                </div>
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