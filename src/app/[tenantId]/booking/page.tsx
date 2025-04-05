'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabaseClient';
import Navbar from '@/components/ui/Navbar';
import { format, parseISO, addDays, isBefore, startOfDay } from 'date-fns';
import { useAuth } from '@/components/auth/AuthProvider';
import { Service, Profile, Slot } from '@/types/service';

type TimeSlot = {
  slot: Slot | null;
  time: string;
  isAvailable: boolean;
  isAuction: boolean;
  minPrice?: number;
};

export default function BookingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  
  // Get tenantId from params, removing array if present
  const tenantId = Array.isArray(params.tenantId) ? params.tenantId[0] : params.tenantId;
  const serviceId = searchParams.get('serviceId');
  const providerId = searchParams.get('providerId');

  console.log('URL Parameters:', { tenantId, serviceId, providerId });

  const [service, setService] = useState<Service | null>(null);
  const [provider, setProvider] = useState<Profile | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // For demo purposes, we're using April 2025 dates since that's when our sample data is
  // In production, this would use new Date() to start from today
  const isDemoMode = true; // Toggle this when going to production
  
  // Generate next 7 days starting from local April 5, 2025
  const next7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(2025, 3, 5 + i); // Month 3 is April
    date.setHours(0, 0, 0, 0); // Set to midnight local time
    console.log('Generated local date:', {
      i,
      dateString: date.toString(), // Show local representation
      iso: date.toISOString(), // Show underlying UTC
    });
    return date;
  });

  // Log timeSlots state whenever it changes
  useEffect(() => {
    console.log('State Update - timeSlots changed:', {
      length: timeSlots.length,
      slots: timeSlots.map(s => s.time)
    });
  }, [timeSlots]);

  useEffect(() => {
    const fetchData = async () => {
      // Log when fetchData starts
      console.log('>>> fetchData started'); 

      if (!serviceId || !providerId || !tenantId) {
        console.error('Missing required parameters:', { serviceId, providerId, tenantId });
        setError('Missing required booking parameters');
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        console.log('Starting data fetch with parameters:', {
          tenantId,
          serviceId,
          providerId
        });

        const supabase = getSupabaseClient();
        if (!supabase) throw new Error('Supabase client not initialized');

        // First fetch tenant by slug
        const { data: tenantData, error: tenantError } = await supabase
          .from('tenants')
          .select('id, name')
          .eq('slug', tenantId)
          .single();

        if (tenantError) throw new Error('Could not find the business. Please check the URL.');
        if (!tenantData) throw new Error('Business not found');

        console.log('Successfully fetched tenant:', tenantData);

        // Fetch service details
        const { data: serviceData, error: serviceError } = await supabase
          .from('services')
          .select('*')
          .eq('id', serviceId)
          .eq('tenant_id', tenantData.id)
          .single();

        if (serviceError) throw serviceError;
        if (!serviceData) throw new Error('Service not found');

        console.log('Successfully fetched service:', serviceData);
        setService(serviceData);

        // Fetch provider details
        const { data: providerData, error: providerError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', providerId)
          .eq('tenant_id', tenantData.id)
          .single();

        if (providerError) throw providerError;
        if (!providerData) throw new Error('Provider not found');

        console.log('Successfully fetched provider:', providerData);
        setProvider(providerData);

        // Set initial date to local April 5, 2025
        const initialDate = new Date(2025, 3, 5);
        initialDate.setHours(0, 0, 0, 0);

        console.log('Setting initial local date:', {
          dateString: initialDate.toString(),
          iso: initialDate.toISOString()
        });
        
        await fetchSlots(initialDate, serviceData, providerData);
        setSelectedDate(initialDate);
      } catch (error) {
        console.error('Error in fetchData:', error);
        setError(error instanceof Error ? error.message : 'Failed to load booking information. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [serviceId, providerId, tenantId]);

  const fetchSlots = async (date: Date, currentService: Service, currentProvider: Profile) => {
    // Log inside fetchSlots as well
    console.log('>>> fetchSlots started for local date:', date.toString());
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase client not initialized');

      // Get components from the incoming local date
      const year = date.getFullYear();
      const month = date.getMonth(); // 0-indexed
      const day = date.getDate();

      // Create UTC query range based on local date components
      const startTime = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
      const endTime = new Date(Date.UTC(year, month, day + 1, 0, 0, 0, 0)); // Midnight next day UTC

      console.log('Debug - Query setup:', {
        input_local_date: date.toString(),
        calculated_components: { year, month, day }, // Log components used
        query_range_utc: {
          start: startTime.toISOString(),
          end: endTime.toISOString()
        }
      });

      // Query slots for the selected date range in UTC
      const { data: slotsData, error: slotsError } = await supabase
        .from('slots')
        .select('*')
        .eq('provider_id', currentProvider.id)
        .eq('service_id', currentService.id)
        .gte('start_time', startTime.toISOString())
        .lt('start_time', endTime.toISOString())
        .order('start_time');

      console.log('Debug - Database response:', {
        error: slotsError,
        total_slots: slotsData?.length || 0,
        slots: slotsData?.map(slot => ({
          id: slot.id,
          start_time: slot.start_time,
          status: slot.status
        }))
      });

      if (slotsError) throw slotsError;

      // Convert slots to time slots
      const timeSlots: TimeSlot[] = (slotsData || []).map(slot => {
        const localTime = new Date(slot.start_time);
        const slotTime = format(localTime, 'HH:mm');
        
        return {
          slot,
          time: slotTime,
          isAvailable: slot.status === 'available',
          isAuction: slot.is_auction,
          minPrice: slot.min_price
        };
      });

      console.log('Debug - Final time slots:', {
        total: timeSlots.length,
        slots: timeSlots.map(slot => ({
          time: slot.time,
          start_time: slot.slot?.start_time,
          isAvailable: slot.isAvailable
        }))
      });

      // Create a new array reference before setting state
      const finalSlotsToSet = [...timeSlots];
      
      setTimeSlots(finalSlotsToSet);

    } catch (error) {
      console.error('Error in fetchSlots:', error);
      setError('Failed to load available time slots. Please try again later.');
    }
  };

  const handleDateSelect = async (date: Date) => {
    console.log('Date selection:', {
      input: date.toString(),
      iso: date.toISOString(),
      local: date.toLocaleString()
    });

    setSelectedDate(date);
    setSelectedSlot(null);
    
    if (!service || !provider) {
      console.error('Missing service or provider:', { service, provider });
      return;
    }

    await fetchSlots(date, service, provider);
  };

  const handleBooking = async () => {
    console.log('>>> handleBooking started');

    // Restore Guard Clauses
    if (!selectedSlot) { // Check if selectedSlot itself exists
      setError('Please select a time slot first.');
      console.error('Booking attempt without selected slot.', selectedSlot);
      return;
    }
    // Now TypeScript knows selectedSlot is a valid Slot object

    if (!service || !provider) {
      setError('Service or provider details are missing.');
      console.error('Booking attempt with missing service/provider:', { service, provider });
      return;
    }

    setBookingLoading(true);
    setError(null);
    setSuccessMessage(null);

    console.log('Booking details:', {
      selectedSlotId: selectedSlot.id, // Use selectedSlot directly
      startTime: selectedSlot.start_time, // Use selectedSlot directly
      serviceId: service.id,
      providerId: provider.id,
      tenantId: service.tenant_id // Assuming tenant_id is on service
    });

    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase client not initialized');

      // Restore dynamic user fetching and data preparation
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw new Error(`Authentication error: ${userError.message}`);
      if (!user) throw new Error('User not logged in. Please sign in to book.');

      console.log('User details:', { userId: user.id });

      const bookingData = {
        slot_id: selectedSlot.id,
        user_id: user.id, // Customer ID
        tenant_id: service.tenant_id,
        service_id: service.id,
        provider_profile_id: provider.id, // Provider Profile ID
        status: 'confirmed', 
        price_paid: service.base_price ?? 0, 
      };

      console.log('Attempting to insert booking with this exact data:', bookingData);

      // Insert into bookings table
      const { data: bookingResult, error: bookingInsertError } = await supabase
        .from('bookings')
        .insert(bookingData)
        .select()
        .single();

      console.log('Booking insert response:', { bookingResult, bookingInsertError });

      if (bookingInsertError) {
        console.error('Supabase Insert Error Details:', bookingInsertError);
        throw new Error(`Failed to create booking record: ${bookingInsertError.message}`);
      }
      if (!bookingResult) {
        throw new Error('Booking record was not created, but no error was reported.');
      }

      // Restore slot update logic
      console.log('Attempting to update slot status:', { slotId: selectedSlot.id });
      const { error: slotUpdateError } = await supabase
        .from('slots')
        .update({ status: 'booked' })
        .eq('id', selectedSlot.id);

      console.log('Slot update response:', { slotUpdateError });

      if (slotUpdateError) {
        console.error(`Failed to update slot status for ${selectedSlot.id}: ${slotUpdateError.message}`);
      }

      setSuccessMessage('Booking confirmed successfully!');
      console.log('Booking successful for slot:', selectedSlot.id);
      
      // Restore UI updates
      if (selectedDate) {
        await fetchSlots(selectedDate, service, provider);
      }
      setSelectedSlot(null);

    } catch (error) {
      console.error('Error in handleBooking:', error);
      setError(error instanceof Error ? error.message : 'Failed to create booking. Please try again later.');
    } finally {
      setBookingLoading(false);
    }
  };

  // Log state right before rendering
  console.log('Render Check - State before return:', {
    selectedDate: selectedDate?.toISOString(),
    timeSlotsLength: timeSlots.length,
    isLoading: loading,
    hasError: !!error
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading booking information...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <p className="text-red-600">{error}</p>
            <Link
              href={`/${tenantId}`}
              className="mt-4 inline-block text-blue-600 hover:text-blue-800"
            >
              ← Back to services
            </Link>
          </div>
        </main>
      </div>
    );
  }

  if (!service || !provider) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <p className="text-gray-600">Invalid booking parameters.</p>
            <Link
              href={`/${tenantId}`}
              className="mt-4 inline-block text-blue-600 hover:text-blue-800"
            >
              ← Back to services
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Book Appointment</h1>
            <p className="mt-2 text-gray-600">Select a date and time for your appointment</p>
          </div>
          <Link
            href={`/${tenantId}/services`}
            className="text-blue-600 hover:text-blue-800"
          >
            ← Back
          </Link>
        </div>

        {/* Appointment Summary */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center">
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
              <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                <span>${(service.base_price / 100).toFixed(2)}</span>
                <span>•</span>
                <span>{service.duration} min</span>
              </div>
            </div>
          </div>
        </div>

        {/* Date Selection */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Date</h3>
          <div className="grid grid-cols-7 gap-2">
            {next7Days.map((date) => {
              const isSelected = selectedDate && 
                startOfDay(date).getTime() === startOfDay(selectedDate).getTime();
              
              const dateISOString = date.toISOString(); // Get the ISO string

              return (
                <button
                  key={dateISOString}
                  onClick={() => handleDateSelect(date)}
                  className={`w-full p-3 text-center rounded-lg transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-gray-900 text-white'
                      : 'bg-white border hover:border-gray-300'
                  }`}
                >
                  <div className="text-xs uppercase w-full">
                    {format(date, 'EEE')}
                  </div>
                  <div className="font-semibold w-full">
                    {format(date, 'd')}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Time Selection */}
        {selectedDate && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Select Time
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({format(selectedDate, 'EEEE, MMMM d, yyyy')})
              </span>
            </h3>
            
            {timeSlots.length === 0 ? (
              <div>
                <p className="text-gray-600">No available time slots for this date.</p>
                <p className="text-sm text-gray-500 mt-2">
                  Debug info: Selected date is {selectedDate.toISOString()}
                </p>
                <p className="text-sm text-gray-500">
                  Provider ID: {provider.id}, Service ID: {service.id}
                </p>
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {timeSlots.map((slot, index) => {
                    console.log('Rendering time slot:', {
                      index,
                      time: slot.time,
                      isAvailable: slot.isAvailable,
                      slotId: slot.slot?.id
                    });

                    return (
                      <button
                        key={`${slot.time}-${index}`}
                        onClick={() => {
                          console.log('Slot selected:', slot);
                          setSelectedSlot(slot.slot);
                        }}
                        disabled={!slot.isAvailable}
                        className={`p-3 text-center rounded-lg transition-colors ${
                          selectedSlot?.id === slot.slot?.id
                            ? 'bg-gray-900 text-white'
                            : slot.isAvailable
                            ? slot.isAuction
                              ? 'bg-yellow-50 border-yellow-200 border hover:border-yellow-300'
                              : 'bg-white border hover:border-gray-300'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        <div>{slot.time}</div>
                        {slot.isAuction && slot.minPrice && (
                          <div className="text-xs mt-1">
                            Min: ${(slot.minPrice / 100).toFixed(2)}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                <p className="text-sm text-gray-500 mt-4">
                  Found {timeSlots.length} available slots for {format(selectedDate, 'MMMM d, yyyy')}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Booking Button */}
        <div className="flex flex-col items-center">
          {successMessage && (
            <div className="mb-4 p-4 bg-green-100 text-green-700 rounded-lg">
              {successMessage}
            </div>
          )}
          
          {error && (
            <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          <button
            onClick={handleBooking}
            disabled={!selectedDate || !selectedSlot || bookingLoading}
            className={`w-full md:w-auto px-8 py-3 rounded-lg text-white font-medium ${
              !selectedDate || !selectedSlot || bookingLoading
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-gray-900 hover:bg-gray-800'
            }`}
          >
            {bookingLoading ? 'Confirming booking...' : 'Confirm Booking'}
          </button>
        </div>
      </main>
    </div>
  );
} 