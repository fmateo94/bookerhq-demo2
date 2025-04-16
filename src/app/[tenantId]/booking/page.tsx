'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabaseClient';
import Navbar from '@/components/ui/Navbar';
import { format, parseISO, isBefore, startOfDay } from 'date-fns';
import { useAuth } from '@/components/auth/AuthProvider';
import { Service, Profile, Slot } from '@/types/service';

type TimeSlot = {
  slot: Slot | null;
  time: string;
  isAvailable: boolean;
  isAuction: boolean;
  minPrice?: number;
  isSelectable: boolean;
};

export default function BookingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
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
  const [authPromptVisible, setAuthPromptVisible] = useState(false);

  // Generate next 7 days starting from today
  const next7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    date.setHours(0, 0, 0, 0); // Set to midnight local time
    console.log('Generated date for day', i, ':', {
      date: date.toString(),
      day: date.getDate(),
      month: date.getMonth(),
      year: date.getFullYear()
    });
    return date;
  });

  // All generated days are future days since we're starting from today
  const futureDays = next7Days;

  console.log('Available dates for selection:', futureDays.map(d => d.toISOString()));

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
        // Cast the data to Service type since we know required fields exist
        const service: Service = {
          ...serviceData,
          provider_id: serviceData.provider_id || '',
          name: serviceData.name || 'Unnamed Service',
          description: serviceData.description || '',
          duration: serviceData.duration || 0,
          base_price: serviceData.base_price || 0,
          service_type: serviceData.service_type || 'unknown',
          tenant_id: serviceData.tenant_id || ''
        };
        setService(service);

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
        // Cast the data to Profile type since we know required fields exist
        const provider: Profile = {
          ...providerData,
          user_id: providerData.user_id || '',
          first_name: providerData.first_name || '',
          last_name: providerData.last_name || '',
          user_type: (providerData.user_type as 'customer' | 'barber' | 'tattoo_artist') || 'barber',
          tenant_id: providerData.tenant_id || ''
        };
        setProvider(provider);

        // Set initial date to today
        const initialDate = new Date();
        initialDate.setHours(0, 0, 0, 0);

        console.log('Setting initial local date:', {
          dateString: initialDate.toString(),
          iso: initialDate.toISOString()
        });
        
        await fetchSlots(initialDate, service, provider);
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

      // Use actual current time for comparing slots
      const now = new Date();
      console.log('Using current date for comparison:', now.toString());

      // Convert slots to time slots and filter out past times
      const timeSlots = (slotsData || [])
        .map(slot => {
          // Skip slots with no start time
          if (!slot.start_time) {
            console.log('Skipping slot with no start time:', slot.id);
            return null;
          }

          const slotStartTimeUTC = parseISO(slot.start_time); // Parse the UTC string
          const localTime = format(slotStartTimeUTC, 'HH:mm'); // Format based on local time zone

          // Check if the slot start time is in the future relative to now
          const isFutureSlot = isBefore(now, slotStartTimeUTC);
          const isAvailable = slot.status === 'available';
          const isAuction = slot.is_auction ?? false; // Default to false if null
          const isSelectable = isFutureSlot && (isAvailable || isAuction);

          console.log('Processing slot:', {
            id: slot.id,
            start_time_utc: slot.start_time,
            parsed_utc: slotStartTimeUTC.toISOString(),
            isFuture: isFutureSlot,
            isAvailable,
            isAuction,
            isSelectable,
            localTimeFormatted: localTime
          });

          const timeSlot: TimeSlot = {
            slot,
            time: localTime,
            isAvailable,
            isAuction,
            minPrice: slot.min_price || undefined,
            isSelectable
          };

          return timeSlot;
        })
        .filter((ts): ts is NonNullable<typeof ts> => ts !== null && ts.isSelectable); // Keep only non-null selectable slots

      console.log('Debug - Final filtered time slots:', {
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
    setError(null);
    setSuccessMessage(null);
    setAuthPromptVisible(false);

    if (!user) {
      console.log('User not logged in. Showing auth prompt.');
      setAuthPromptVisible(true);
      return;
    }

    if (!selectedSlot) {
      setError('Please select a time slot first.');
      console.error('Booking attempt without selected slot.', selectedSlot);
      return;
    }

    if (!service || !provider) {
      setError('Service or provider details are missing.');
      console.error('Booking attempt with missing service/provider:', { service, provider });
      return;
    }

    setBookingLoading(true);

    console.log('Booking details:', {
      selectedSlotId: selectedSlot.id,
      startTime: selectedSlot.start_time,
      serviceId: service.id,
      providerId: provider.id,
      tenantId: service.tenant_id
    });

    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase client not initialized');

      const bookingData = {
        slot_id: selectedSlot.id,
        customer_id: user.id,
        tenant_id: service.tenant_id || '',
        service_id: service.id,
        provider_profile_id: provider.id,
        status: 'confirmed', 
        price_paid: (service.base_price ?? 0) as number,
      };

      console.log('Attempting to insert booking with this exact data:', bookingData);

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
            {futureDays.map((date) => {
              const isSelected = selectedDate && 
                startOfDay(date).getTime() === startOfDay(selectedDate).getTime();
              
              const dateISOString = date.toISOString();

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
                          if (slot.isAuction && slot.slot) {
                            console.log(`Redirecting to bid page for slot: ${slot.slot.id}`)
                            router.push(`/${tenantId}/bid/${slot.slot.id}`); 
                          } else {
                            setSelectedSlot(slot.slot);
                          }
                        }}
                        disabled={!slot.isSelectable}
                        className={`group p-3 text-center rounded-lg transition-colors relative ${
                          selectedSlot?.id === slot.slot?.id
                            ? 'bg-gray-900 text-white'
                            : slot.isSelectable
                              ? slot.isAuction
                                ? 'bg-yellow-50 border-yellow-200 border hover:border-yellow-300'
                                : 'bg-white border hover:border-gray-300'
                              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                        title={undefined}
                      >
                        <div>
                           <div className={`${slot.isAuction ? 'line-through' : ''}`}>{slot.time}</div>
                           {slot.isAuction && slot.minPrice && (
                             <div className="text-xs mt-1">
                               Min: ${(slot.minPrice / 100).toFixed(2)}
                             </div>
                           )}
                        </div>
                        {slot.isAuction && (
                          <span 
                            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-2 py-1 
                                       bg-gray-800 text-white text-xs rounded opacity-0 
                                       group-hover:opacity-100 transition-opacity pointer-events-none"
                          >
                            Available for auction
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <p className="text-sm text-gray-500 mt-4">
                  Found {timeSlots.length} available or auction slots for {format(selectedDate, 'MMMM d, yyyy')}
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

          {/* Authentication Prompt */} 
          {authPromptVisible && (
            <div className="mb-4 p-4 w-full max-w-md bg-blue-100 text-blue-800 rounded-lg text-center">
              <p className="font-semibold">Please sign in to book.</p>
              <p className="text-sm mt-1">You need an account to confirm your appointment.</p>
              <div className="mt-3">
                 <Link href="/auth/signin?role=customer" className="text-blue-600 hover:text-blue-800 font-medium">
                   Sign In / Sign Up
                 </Link>
              </div>
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