'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabaseClient';
import Navbar from '@/components/ui/Navbar';
import { format, parseISO } from 'date-fns';
import { useAuth } from '@/components/auth/AuthProvider';
import { Service, Profile, Slot } from '@/types/service'; // Assuming Slot type is needed here too

export default function BidPage() {
  const params = useParams();
  const { user } = useAuth(); // Get authenticated user

  // Extract params, handling potential array values
  const tenantId = Array.isArray(params.tenantId) ? params.tenantId[0] : params.tenantId;
  const slotId = Array.isArray(params.slotId) ? params.slotId[0] : params.slotId;

  console.log('Bid Page URL Parameters:', { tenantId, slotId });

  const [slot, setSlot] = useState<Slot | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [provider, setProvider] = useState<Profile | null>(null);
  const [bidAmount, setBidAmount] = useState<number>(0);
  const [startingBid, setStartingBid] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false); // State for submission loading
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [authPromptVisible, setAuthPromptVisible] = useState(false); // New state for auth prompt

  useEffect(() => {
    const fetchBidData = async () => {
      if (!slotId || !tenantId) {
        setError('Missing slot or tenant information.');
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError(null);

      try {
        console.log('Starting bid data fetch for slot:', slotId);
        const supabase = getSupabaseClient();
        if (!supabase) throw new Error('Supabase client not initialized');

        // 1. Fetch Tenant to verify slug
        const { data: tenantData, error: tenantError } = await supabase
          .from('tenants')
          .select('id')
          .eq('slug', tenantId)
          .single();
        
        if (tenantError || !tenantData) throw new Error('Business not found or invalid URL.');
        const tenantDbId = tenantData.id;
        console.log('Found Tenant ID:', tenantDbId);

        // 2. Fetch Slot details using tenantDbId
        const { data: slotData, error: slotError } = await supabase
          .from('slots')
          .select('*, services(*), profiles(*)') // Select related service and provider
          .eq('id', slotId)
          .eq('tenant_id', tenantDbId) 
          .eq('is_auction', true) // Ensure it's actually an auction slot
          .single();

        if (slotError) throw new Error(`Error fetching slot: ${slotError.message}`);
        if (!slotData) throw new Error('Auction slot not found or invalid.');
        if (!slotData.services) throw new Error('Service data missing for this slot.');
        if (!slotData.profiles) throw new Error('Provider data missing for this slot.');

        console.log('Successfully fetched slot data:', slotData);
        setSlot(slotData as Slot); // Assuming Slot type matches direct fetch
        setService(slotData.services as Service); // Assuming Service type matches nested fetch
        setProvider(slotData.profiles as Profile); // Assuming Profile type matches nested fetch

        // 3. Calculate Starting Bid (Service base price + 500 cents or slot min_price, whichever is higher)
        const baseServicePrice = slotData.services.base_price ?? 0;
        const calculatedMinBid = baseServicePrice + 500; // Add $5
        const effectiveStartingBid = Math.max(calculatedMinBid, slotData.min_price ?? 0);

        console.log('Calculated Starting Bid:', { 
          baseServicePrice, 
          calculatedMinBid, 
          slotMinPrice: slotData.min_price,
          effectiveStartingBid 
        });
        setStartingBid(effectiveStartingBid);
        setBidAmount(effectiveStartingBid); // Default bid input to starting bid

      } catch (err) {
        console.error('Error fetching bid data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load auction details.');
      } finally {
        setLoading(false);
      }
    };

    fetchBidData();
  }, [slotId, tenantId]); // Dependencies for the effect

  const handleBidAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow only numbers, convert to cents
    const value = e.target.value.replace(/[^\d.]/g, ''); // Basic cleanup
    const amountInCents = Math.round(parseFloat(value || '0') * 100);
    setBidAmount(amountInCents);
  };

  const handlePlaceBid = async () => {
    console.log('Placing bid:', { userId: user?.id, slotId, bidAmount });
    setSubmitting(true);
    setError(null); // Clear errors initially
    setSuccessMessage(null);
    setAuthPromptVisible(false); // Hide prompt by default

    // --- Authentication Check ---
    if (!user) {
      console.log('User not logged in. Showing auth prompt for bidding.');
      setError(null); // Clear any other potential errors
      setAuthPromptVisible(true);
      setSubmitting(false); // Don't show submitting state
      return; // Stop execution
    }
    // --- End Authentication Check ---

    if (!slot || !tenantId) {
        setError("Slot or tenant information missing.");
        setSubmitting(false);
        return;
    }
    
    if (bidAmount < startingBid) {
        setError(`Your bid must be at least $${(startingBid / 100).toFixed(2)}.`);
        setSubmitting(false);
        return;
    }

    try {
        const supabase = getSupabaseClient();
        if (!supabase) throw new Error("Supabase client not initialized");

        const bidData = {
            slot_id: slot.id,
            customer_id: user.id,
            tenant_id: slot.tenant_id, // Assuming tenant_id is directly on slot
            bid_amount: bidAmount,
            status: 'pending', // Initial status
            owner_type: 'customer', // Explicitly set owner type for customer bids
        };

        console.log("Attempting to insert bid:", bidData);

        // We need a `bids` table for this
        const { data, error: insertError } = await supabase
            .from('bids')
            .insert(bidData)
            .select()
            .single();

        if (insertError) {
            console.error("Supabase Bid Insert Error:", insertError);
            // Check for unique constraint violation (user already bid on this slot)
            if (insertError.code === '23505') { // Adjust based on actual constraint name if needed
                 setError("You have already placed a bid on this slot.");
            } else {
                throw new Error(`Failed to place bid: ${insertError.message}`);
            }
        } else if (!data) {
            throw new Error("Bid was not placed, but no error reported.");
        } else {
            console.log("Bid placed successfully:", data);
            setSuccessMessage(`Your bid of $${(bidAmount / 100).toFixed(2)} has been placed successfully!`);
            // Optionally disable input/button after success
            // Maybe redirect after a delay?
            // router.push(`/${tenantId}/my-bids`); // Example redirect
        }

    } catch (err) {
        console.error("Error in handlePlaceBid:", err);
        setError(err instanceof Error ? err.message : 'Failed to place bid. Please try again.');
    } finally {
        setSubmitting(false);
    }
  };

  // Render Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading auction details...</p>
          </div>
        </main>
      </div>
    );
  }

  // Render Error State
  if (error && !successMessage) { // Don't show data fetch error if bid succeeded
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8 text-center">
            <p className="text-red-600 font-semibold mb-4">{error}</p>
            <Link
              href={`/${tenantId}/booking?serviceId=${service?.id}&providerId=${provider?.id}`} // Attempt to link back
              className="text-blue-600 hover:text-blue-800"
            >
              ← Back to Booking
            </Link>
          </div>
        </main>
      </div>
    );
  }
  
  // Render Bid Page Content (Basic Structure)
  if (!slot || !service || !provider) {
     // This case should ideally be covered by the error state, but as a fallback:
     return (
       <div className="min-h-screen bg-gray-50">
         <Navbar />
         <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
           <p>Required auction data could not be loaded.</p>
         </main>
       </div>
     );
  }

  // Format date and time once data is loaded
  const slotStartTime = parseISO(slot.start_time);
  const formattedDate = format(slotStartTime, 'EEEE, MMMM d, yyyy');
  const formattedTime = format(slotStartTime, 'HH:mm');

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-3xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Place Your Bid</h1>
            <p className="mt-1 text-gray-600">Submit your offer for this time slot.</p>
          </div>
          <Link
            // Go back to the specific booking page state if possible
            href={`/${tenantId}/booking?serviceId=${service.id}&providerId=${provider.id}`}
            className="text-blue-600 hover:text-blue-800 whitespace-nowrap"
          >
            ← Back to Booking
          </Link>
        </div>

        {/* Slot Summary */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center mb-4">
            {provider.avatar_url && (
              <img
                src={provider.avatar_url}
                alt={`${provider.first_name} ${provider.last_name}`}
                className="w-12 h-12 rounded-full mr-4"
              />
            )}
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{service.name}</h2>
              <p className="text-gray-600">
                with {provider.first_name} {provider.last_name}
              </p>
              <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                <span>{service.duration} min</span>
              </div>
            </div>
          </div>
           <div className="border-t pt-4">
             <p className="text-gray-800"><span className="font-medium">Date:</span> {formattedDate}</p>
             <p className="text-gray-800"><span className="font-medium">Time:</span> {formattedTime}</p>
             <p className="text-gray-600 text-sm mt-2">This time slot is available via auction.</p>
           </div>
        </div>

        {/* Bid Input Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
           <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Bid</h3>
           
           <p className="text-sm text-gray-600 mb-3">
             The minimum starting bid is <span className="font-semibold">${(startingBid / 100).toFixed(2)}</span>. 
             Enter your offer below.
           </p>
           
           <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">$</span>
              <input 
                type="number" // Use number type for better mobile keyboards
                step="0.01" // Allow cents
                min={(startingBid / 100).toFixed(2)} // Set minimum based on starting bid
                value={(bidAmount / 100).toFixed(2)} // Display as dollars.cents
                onChange={handleBidAmountChange}
                disabled={submitting || !!successMessage} // Disable if submitting or successful
                className="w-full pl-7 pr-12 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100"
                placeholder={(startingBid / 100).toFixed(2)}
              />
              <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500">USD</span>
           </div>
            {error && !successMessage && (
                 <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
        </div>

        {/* Authentication Prompt */} 
        {authPromptVisible && (
          <div className="mb-4 p-4 w-full max-w-md bg-blue-100 text-blue-800 rounded-lg text-center">
            <p className="font-semibold">Please sign in to place a bid.</p>
            <p className="text-sm mt-1">You need an account to submit your offer.</p>
            <div className="mt-3">
               <Link href="/auth/signin?role=customer" className="text-blue-600 hover:text-blue-800 font-medium">
                 Sign In / Sign Up
               </Link>
            </div>
          </div>
        )}

        {/* Action Button & Messages */}
        <div className="flex flex-col items-center">
          {successMessage && (
            <div className="mb-4 p-4 w-full bg-green-100 text-green-700 rounded-lg text-center">
              {successMessage}
            </div>
          )}
           {/* Only show generic error here if it wasn't shown by the input field */}
          {error && !successMessage && bidAmount >= startingBid && (
             <div className="mb-4 p-4 w-full bg-red-100 text-red-700 rounded-lg text-center">
                 {error}
             </div>
           )}

          <button
            onClick={handlePlaceBid}
            disabled={submitting || !!successMessage || bidAmount < startingBid}
            className={`w-full md:w-auto px-8 py-3 rounded-lg text-white font-medium transition-colors ${
              submitting || !!successMessage || bidAmount < startingBid
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500' // Changed color for bid
            }`}
          >
            {submitting ? 'Placing Bid...' : (successMessage ? 'Bid Placed' : 'Place Bid')}
          </button>
        </div>

      </main>
    </div>
  );
} 