'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { getSupabaseClient } from '@/lib/supabaseClient';
import Navbar from '@/components/ui/Navbar';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import React, { Fragment, Suspense } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs/tabs';
import { Table, TableHeader, TableBody, TableHead, TableCell, TableRow } from '@/components/ui/table/table';
import { useBookings } from '@/hooks/useBookings';
import { useBids } from '@/hooks/useBids';
import { BookingWithDetails } from '@/types/bookings';
import { BidWithDetails } from '@/types/bids';
import { ProfileData } from '@/types/profiles';
import { useQueryClient } from '@tanstack/react-query';
import { TablesInsert } from '@/types/supabase';

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

// Update BidActionModal component
const BidActionModal = ({ 
  bid, 
  isOpen, 
  onClose,
  onAccept,
  onDecline,
  onCounterbid,
  onWithdraw,
  userType,
}: { 
  bid: BidWithDetails;
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
  onDecline: () => void;
  onCounterbid: () => void;
  onWithdraw: () => void;
  userType: string | null;
}) => {
  if (!isOpen || !userType || !bid) return null;

  // --- Log values when modal opens --- 
  console.log('BidActionModal Render:', {
    userType,
    bidOwner: bid.owner_type,
    bidStatus: bid.status
  });

  const isCustomer = userType === 'customer';
  const isProviderOrAdmin = !isCustomer; // If not customer, assume provider/admin role for actions
  
  const isBidOwnerProvider = bid.owner_type === 'provider';
  const isBidOwnerCustomer = bid.owner_type === 'customer';
  const isBidPending = bid.status === 'pending';

  // Determine which actions to show
  const showAccept = 
    (isProviderOrAdmin && isBidOwnerCustomer && isBidPending) || 
    (isCustomer && isBidOwnerProvider && isBidPending); 
  
  const showDecline = 
    (isProviderOrAdmin && isBidOwnerCustomer && isBidPending) || 
    (isCustomer && isBidOwnerProvider && isBidPending); 

  const showCounterbid = 
    isProviderOrAdmin && isBidOwnerCustomer && isBidPending;

  // --- Refined Withdraw Logic --- 
  // Show withdraw if the current user owns this bid AND it's pending.
  const currentUserOwnsThisBid = 
    (isProviderOrAdmin && isBidOwnerProvider) || 
    (isCustomer && isBidOwnerCustomer);
  const showWithdraw = currentUserOwnsThisBid && isBidPending;
  
  const isFinalStatus = ['accepted', 'rejected', 'withdrawn'].includes(bid.status || '');

  // --- Log calculated show flags --- 
  console.log('BidActionModal Show Flags:', {
    showAccept,
    showDecline,
    showCounterbid,
    showWithdraw,
    isFinalStatus
  });

  if (isFinalStatus) {
     return (
       // Simplified modal for final status bids
       <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
         <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
           <h3 className="text-lg font-semibold mb-4">Bid Details</h3>
           {/* ... display bid info ... */}
           <p className="text-sm text-gray-600 mb-2">Status: <span className="font-medium">{bid.status}</span></p>
           <button
             onClick={onClose}
             className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-md text-sm hover:bg-gray-50 transition-colors mt-4"
           >
             Close
           </button>
         </div>
       </div>
     );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">Bid Actions</h3>
        {/* Display Bid Info */}
         <div className="mb-4 border-b pb-4">
           <p className="text-sm text-gray-600 mb-1">Service: <span className="font-medium">{bid.service_name}</span></p>
           <p className="text-sm text-gray-600 mb-1">Date: <span className="font-medium">{bid.slot_date}</span></p>
           <p className="text-sm text-gray-600 mb-1">Time: <span className="font-medium">{bid.slot_time}</span></p>
           <p className="text-sm text-gray-600">Bid Amount: <span className="font-medium">${(bid.bid_amount / 100).toFixed(2)}</span></p>
         </div>
        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          {showAccept && (
            <button onClick={onAccept} className="w-full bg-green-600 text-white py-2 px-4 rounded-md text-sm hover:bg-green-700 transition-colors">
              Accept Bid
            </button>
          )}
          {showCounterbid && (
            <button onClick={onCounterbid} className="w-full bg-blue-600 text-white py-2 px-4 rounded-md text-sm hover:bg-blue-700 transition-colors">
              Make Counterbid
            </button>
          )}
          {showDecline && (
            <button onClick={onDecline} className="w-full bg-red-600 text-white py-2 px-4 rounded-md text-sm hover:bg-red-700 transition-colors">
              Decline Bid
            </button>
          )}
           {showWithdraw && (
            <button onClick={onWithdraw} className="w-full bg-yellow-500 text-black py-2 px-4 rounded-md text-sm hover:bg-yellow-600 transition-colors">
              Withdraw Bid
            </button>
          )}
          <button onClick={onClose} className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-md text-sm hover:bg-gray-50 transition-colors mt-2">
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

// Create a client component that uses useSearchParams
function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isLoading: isAuthLoading, userType: authUserType } = useAuth();
  const queryClient = useQueryClient();
  
  // Re-add the missing state variables
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [userType, setUserType] = useState<string | null>(null);
  const [isLoadingUserData, setIsLoadingUserData] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('appointments');
  const [selectedBid, setSelectedBid] = useState<BidWithDetails | null>(null);
  const [counterBidModalBid, setCounterBidModalBid] = useState<BidWithDetails | null>(null);
  
  // Define columns for the bookings table
  const bookingColumns = [
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
   
  // Define columns for the bids table
  const bidColumns = [
    { name: 'Date', selector: (row: BidWithDetails) => row.slot_date || 'N/A', sortable: true },
    { name: 'Time', selector: (row: BidWithDetails) => row.slot_time || 'N/A' },
    { name: 'Service', selector: (row: BidWithDetails) => row.service_name || 'N/A' },
    { name: 'Provider', selector: (row: BidWithDetails) => row.provider_name || 'N/A' },
    { name: 'Amount', selector: (row: BidWithDetails) => `$${(row.bid_amount / 100).toFixed(2)}`, sortable: true },
    { name: 'Status', selector: (row: BidWithDetails) => row.status || 'N/A', sortable: true },
    {
      name: 'Type',
      selector: (row: BidWithDetails): string => {
        const isCurrentUserCustomer = userType === 'customer';
        const isBidOwnerProvider = row.owner_type === 'provider';

        if (isCurrentUserCustomer) {
          // Customer is viewing
          return isBidOwnerProvider ? 'Provider Counterbid' : 'Your Bid';
        } else {
          // Provider/Admin is viewing
          return isBidOwnerProvider ? 'Your Bid' : 'Customer Bid';
        }
      }
    },
    {
      name: 'Actions',
      cell: (row: BidWithDetails) => {
        // For this section, we use the actual hooks-normalized type from normalizedUserType
        const isProviderOrAdmin = normalizedUserType && ['barber', 'tattoo_artist', 'admin'].includes(normalizedUserType);
        const isCustomerBid = row.owner_type === 'customer';
        const isPending = row.status === 'pending';
        const canCounter = isProviderOrAdmin && isCustomerBid && isPending;
        const isFinalStatus = row.status && ['accepted', 'rejected', 'withdrawn'].includes(row.status);

        return (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                console.log('View Details onClick - Row Data:', {
                  id: row.id,
                  owner_type: row.owner_type,
                  status: row.status,
                  userType: userType
                }); 
                setSelectedBid(row); // Open the main action modal
              }}
              className="border border-gray-300 hover:bg-gray-100 px-2 py-1 text-xs rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isFinalStatus} // Disable if bid has a final status
            >
              View Details
            </button>
            {canCounter && (
              <button
                onClick={() => {
                  console.log('Counter Bid onClick - Row Data:', row);
                  setCounterBidModalBid(row); // Open the counter bid modal
                }}
                className="border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 px-2 py-1 text-xs rounded-md font-medium transition-colors"
              >
                Counter
              </button>
            )}
          </div>
        );
      },
    },
  ];
  
  // Use the tab from URL if available
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['appointments', 'bids', 'profile'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);
  
  // Move the user type determination logic back in
  useEffect(() => {
    if (user) {
      const determineUserRole = async () => {
        setIsLoadingUserData(true);
        setProfileData(null); // Reset profile data initially
        setUserType(null); // Reset user type
        
        try {
          const supabase = getSupabaseClient();
          if (!supabase) {
            console.error('determineUserRole: Supabase client not available.');
            setIsLoadingUserData(false);
            return;
          }
          
          // First check if the user is a provider
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', user.id)
            .single();
          
          if (profileData && !profileError) {
            console.log('User is a provider with profile:', profileData);
            setProfileData(profileData);
            setUserType('barber'); // Default to barber for profiles
            setIsLoadingUserData(false);
            return;
          }
          
          // Next check if the user is a customer
          const { data: customerData, error: customerError } = await supabase
            .from('customers')
            .select('*')
            .eq('user_id', user.id)
            .single();
          
          if (customerData && !customerError) {
            console.log('User is a customer with data:', customerData);
            setProfileData(customerData);
            setUserType('customer');
            setIsLoadingUserData(false);
            return;
          }
          
          // Default to customer if no profile found
          console.log('No provider or customer profile found, defaulting to customer');
          setUserType('customer');
          
        } catch (catchError) {
          console.error('determineUserRole: Caught exception:', catchError);
          setUserType('customer'); // Default to customer on exception
        } finally {
          setIsLoadingUserData(false);
        }
      };
      
      determineUserRole();
    } else {
      // Reset everything if no user
      setProfileData(null);
      setUserType(null);
      setIsLoadingUserData(false);
    }
  }, [user]);
  
  // Ensure we always have a valid user type for the hooks
  // Valid types: 'barber', 'tattoo_artist', 'admin', 'customer'
  const normalizedUserType = userType || 'customer';
  
  // Initialize loading states before the hooks
  const [isBookingsLoading, setIsBookingsLoading] = useState(true);
  const [isBookingsError, setIsBookingsError] = useState(false);
  const [isBidsLoading, setIsBidsLoading] = useState(true);
  const [isBidsError, setIsBidsError] = useState(false);
  
  // Combined loading state that doesn't directly depend on hooks yet
  const isLoading = isAuthLoading || isLoadingUserData || isBookingsLoading || isBidsLoading;
  
  // Use custom loading handlers with the hooks
  const {
    data: bookings,
    isLoading: bookingsLoadingState,
    isError: bookingsErrorState,
  } = useBookings(
    user?.id || '',
    normalizedUserType
  );
  
  // Update our local loading state when the hook state changes
  useEffect(() => {
    setIsBookingsLoading(bookingsLoadingState);
    setIsBookingsError(bookingsErrorState);
  }, [bookingsLoadingState, bookingsErrorState]);
  
  const {
    data: bids,
    isLoading: bidsLoadingState,
    isError: bidsErrorState,
  } = useBids(
    user?.id || '',
    profileData?.id,
    normalizedUserType
  );
  
  // Update our local loading state when the hook state changes
  useEffect(() => {
    setIsBidsLoading(bidsLoadingState);
    setIsBidsError(bidsErrorState);
  }, [bidsLoadingState, bidsErrorState]);
  
  // Redirect if not logged in
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/signin');
    }
  }, [isLoading, user, router]);

  // ADD BACK BID ACTION HANDLERS:
  const handleAcceptBid = async () => {
    if (!selectedBid || !user) return;
    console.log('Accepting bid:', selectedBid);

    // Ensure required fields are available on the selectedBid object
    if (!selectedBid.slot_id || 
        !selectedBid.customer_id || 
        !selectedBid.profile_provider_id || // The provider who owns the slot/bid
        !selectedBid.service_id || 
        !selectedBid.tenant_id) {
      console.error('Missing required data on selectedBid to create booking:', selectedBid);
      alert('Cannot accept bid: essential information missing.');
              return;
            }
            
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase client not available');
      
      // --- Step 1: Update bid status to 'accepted' --- 
      const { error: updateBidError } = await supabase
        .from('bids')
        .update({ status: 'accepted' })
        .eq('id', selectedBid.id);
      if (updateBidError) throw updateBidError;
      console.log('Step 1: Bid status updated to accepted');

      // --- Step 2: Create the booking record --- 
      const bookingData: TablesInsert<'bookings'> = {
        slot_id: selectedBid.slot_id!,
        customer_id: selectedBid.customer_id!,
        provider_profile_id: selectedBid.profile_provider_id!,
        service_id: selectedBid.service_id!,
        price_paid: selectedBid.bid_amount, 
        status: 'confirmed',
        tenant_id: selectedBid.tenant_id!,
      };
      const { data: newBooking, error: bookingCreateError } = await supabase
        .from('bookings')
        .insert(bookingData)
        .select('id') // Only need the ID of the new booking
        .single();
      if (bookingCreateError) throw bookingCreateError; 
      console.log('Step 2: Booking record created successfully:', newBooking);

      // --- Step 3: Cancel conflicting bookings for the same slot --- 
      console.log(`Step 3: Checking for conflicting bookings for slot_id: ${selectedBid.slot_id}`);
      const { error: cancelBookingsError } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('slot_id', selectedBid.slot_id!) // Target the same slot
        .neq('id', newBooking.id); // Exclude the booking we just created
      
      if (cancelBookingsError) {
        // Log the error but don't necessarily stop the whole process
        console.error('Error cancelling conflicting bookings:', cancelBookingsError);
          } else {
        console.log('Conflicting bookings (if any) cancelled.');
      }

      // --- Step 4: Reject other bids for the same slot --- 
      console.log(`Step 4: Checking for other bids for slot_id: ${selectedBid.slot_id}`);
      const { error: rejectBidsError } = await supabase
        .from('bids')
        .update({ status: 'rejected' })
        .eq('slot_id', selectedBid.slot_id!) // Target the same slot
        .neq('id', selectedBid.id); // Exclude the bid we just accepted
      
      if (rejectBidsError) {
         // Log the error but don't necessarily stop the whole process
        console.error('Error rejecting other bids:', rejectBidsError);
              } else {
        console.log('Other bids for this slot (if any) rejected.');
      }

      // --- Step 5: Create notification for the customer (TODO) --- 
      console.log('Step 5: TODO - Create notification for customer');
      // await supabase.from('notifications').insert({...});

      console.log('Bid acceptance process complete');
      setSelectedBid(null);
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['bids'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
        } catch (error) {
      console.error('Error during bid acceptance process:', error);
      alert('Failed to accept bid. Please try again.');
      // Consider more robust error handling / rollback logic here
    }
  };

  const handleDeclineBid = async () => {
    if (!selectedBid || !user) return;
    console.log('Declining bid:', selectedBid);
    // ... (Implementation - needs Supabase calls to update bid, notify) ...
        try {
          const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase client not available');

      const { error } = await supabase
        .from('bids')
        .update({ status: 'rejected' })
        .eq('id', selectedBid.id);
      if (error) throw error;

      // TODO: Create notification

      console.log('Bid rejected successfully');
      setSelectedBid(null);
      queryClient.invalidateQueries({ queryKey: ['bids'] });
        } catch (error) {
      console.error('Error declining bid:', error);
      alert('Failed to decline bid. Please try again.');
    }
  };

  const handleCounterbid = async (amount: number) => {
    // Add checks to ensure required fields are present, including tenant_id
    if (!counterBidModalBid?.slot_id || 
        !counterBidModalBid?.customer_id || 
        !counterBidModalBid?.tenant_id || // Add check for tenant_id
        !profileData?.id || 
        !user) {
      console.error('Missing required data for counterbid:', { 
          bid: counterBidModalBid, 
          profile: profileData, 
          user 
      });
      alert('Cannot place counterbid, required information is missing.');
            return;
          }
    console.log('Countering bid:', counterBidModalBid, 'with amount:', amount);
    
        try {
          const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase client not available');
      
      // Prepare the insert data with correct types
      const newBidData: TablesInsert<'bids'> = {
        slot_id: counterBidModalBid.slot_id, 
        profile_provider_id: profileData.id, 
        customer_id: counterBidModalBid.customer_id, 
        bid_amount: amount,
        status: 'pending',
        owner_type: 'provider',
        parent_bid_id: counterBidModalBid.id,
        tenant_id: counterBidModalBid.tenant_id // Now guaranteed to be string
      };

      // 1. Create counter bid
      const { data: newBid, error: insertError } = await supabase
        .from('bids')
        .insert(newBidData)
        .select()
        .single();
      if (insertError) throw insertError;

      // 2. Update original bid status
      const { error: updateError } = await supabase
        .from('bids')
        .update({ status: 'countered' })
        .eq('id', counterBidModalBid.id);
      if (updateError) throw updateError;
      
      // 3. TODO: Create notification for customer

      console.log('Counterbid placed successfully');
      setCounterBidModalBid(null);
      queryClient.invalidateQueries({ queryKey: ['bids'] });
        } catch (error) {
      console.error('Error placing counterbid:', error);
      alert('Failed to place counterbid. Please try again.');
    }
  };

  const handleWithdrawBid = async () => {
    if (!selectedBid || !user) return;
    console.log('Withdrawing bid:', selectedBid);

    // Double-check ownership and status before withdrawing
    const isProviderOrAdmin = userType === 'barber' || userType === 'tattoo_artist' || userType === 'admin';
    const isCustomer = userType === 'customer';
    const isBidOwnerProvider = selectedBid.owner_type === 'provider';
    const isBidOwnerCustomer = selectedBid.owner_type === 'customer';
    const isBidPending = selectedBid.status === 'pending';

    const canWithdraw = 
      (isProviderOrAdmin && isBidOwnerProvider && isBidPending) ||
      (isCustomer && isBidOwnerCustomer && isBidPending);
      
    if (!canWithdraw) {
      console.error('User cannot withdraw this bid:', { userType, bidOwner: selectedBid.owner_type, bidStatus: selectedBid.status });
      alert('You cannot withdraw this bid.');
      return;
    }

    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase client not available');

      // Update bid status to 'withdrawn'
      const { error } = await supabase
        .from('bids')
        .update({ status: 'withdrawn' })
        .eq('id', selectedBid.id);
      if (error) throw error;

      // TODO: Create notification?

      console.log('Bid withdrawn successfully');
      setSelectedBid(null); // Close modal
      queryClient.invalidateQueries({ queryKey: ['bids'] }); // Refresh bids list
    } catch (error) {
      console.error('Error withdrawing bid:', error);
      alert('Failed to withdraw bid. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Handle data fetching errors (optional, ErrorBoundary might catch these)
  if (isBookingsError) {
    // Show specific error for bookings
  }
  if (isBidsError) {
    // Show specific error for bids
  }

  const bookingsData = bookings || [];
  const bidsData = bids || [];
  console.log('Dashboard - Final bidsData for table:', bidsData);

  // Update welcome message (ensure it handles profileData potentially being null)
  const welcomeName = profileData?.first_name || user?.user_metadata?.first_name || 'there';

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {welcomeName}
          </h1>
          <p className="mt-1 text-gray-600">
            Manage your appointments, auctions, and account settings.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
            <TabsTrigger value="bids">My Bids</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="appointments">
            <div className="mt-4">
              <h3 className="text-lg font-medium text-gray-900">Your Appointments</h3>
              {isBookingsLoading ? (
                <div className="text-center py-12">
                  <p>Loading appointments...</p>
                </div>
              ) : bookingsData.length === 0 ? (
                <div className="text-center py-12">
                  <p>You don&apos;t have any appointments yet.</p>
                  <button
                    onClick={() => router.push('/services')}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Browse Services
                  </button>
                </div>
              ) : (
                <BookingsDataTable columns={bookingColumns} data={bookingsData} />
              )}
            </div>
          </TabsContent>

          <TabsContent value="bids">
            <div className="mt-4">
              <h3 className="text-lg font-medium text-gray-900">My Bids</h3>
              {isBidsLoading ? (
                <div className="text-center py-12">
                  <p>Loading bids...</p>
                </div>
              ) : bidsData.length === 0 ? (
                <div className="text-center py-12">
                  <p>You haven&apos;t placed any bids yet.</p>
                </div>
              ) : (
                <BidsDataTable columns={bidColumns} data={bidsData} />
              )}
            </div>
          </TabsContent>

          <TabsContent value="profile">
            {/* ... Profile Content ... */}
          </TabsContent>
        </Tabs>
        
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
          onWithdraw={handleWithdrawBid}
          userType={userType}
        />
        <CounterBidModal
          bid={counterBidModalBid}
          isOpen={counterBidModalBid !== null}
          onClose={() => setCounterBidModalBid(null)}
          onSubmit={handleCounterbid}
        />
      </main>
    </div>
  );
}

// Main page component with Suspense boundary
export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}