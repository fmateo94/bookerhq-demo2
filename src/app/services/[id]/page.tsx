'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { getSupabaseClient } from '@/lib/supabaseClient';
import Navbar from '@/components/ui/Navbar';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format, parseISO, addDays, isBefore } from 'date-fns';
import { Availability } from '@/types/service';
import { User } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

type ServiceRow = Database['public']['Tables']['services']['Row'];
type AvailabilityRow = Database['public']['Tables']['availability']['Row'];

export default function ServiceDetailPage({ params }: { params: { id: string } }) {
  const { user } = useAuth();
  const [service, setService] = useState<ServiceRow | null>(null);
  const [provider, setProvider] = useState<User | null>(null);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const router = useRouter();

  // Generate 7 days from today
  const next7Days = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i));

  // Handle date selection - moved before useEffect and wrapped in useCallback
  const handleDateSelect = useCallback((date: Date) => {
    setSelectedDate(date);
    setSelectedTime(null);
    
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Find availability for the selected day
    const dayAvailability = availability.find(slot => slot.day_of_week === dayOfWeek);
    
    if (dayAvailability) {
      // Generate time slots based on service duration and provider availability
      const startTime = parseISO(`2000-01-01T${dayAvailability.start_time}`);
      const endTime = parseISO(`2000-01-01T${dayAvailability.end_time}`);
      const duration = service?.duration || 30; // Default to 30 minutes if not specified
      
      const slots = [];
      let currentTime = startTime;
      
      while (isBefore(currentTime, endTime)) {
        const timeString = format(currentTime, 'HH:mm');
        slots.push(timeString);
        
        // Add service duration minutes to current time
        currentTime = new Date(currentTime.getTime() + duration * 60000);
      }
      
      setAvailableSlots(slots);
    } else {
      setAvailableSlots([]);
    }
  }, [availability, service]);

  useEffect(() => {
    const fetchServiceData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const supabase = getSupabaseClient();
        if (!supabase) {
          throw new Error('Supabase client not initialized');
        }
        
        // Fetch service details
        const { data: serviceData, error: serviceError } = await supabase
          .from('services')
          .select('*')
          .eq('id', params.id)
          .single();

        if (serviceError) {
          throw serviceError;
        }
        
        setService(serviceData as ServiceRow);

        // Fetch provider details
        const { data: providerData, error: providerError } = await supabase.auth.admin.getUserById(
          serviceData.provider_id
        );

        if (providerError) {
          throw providerError;
        }
        
        setProvider(providerData.user);

        // Fetch provider availability
        const { data: availabilityData, error: availabilityError } = await supabase
          .from('availability')
          .select('*')
          .eq('provider_id', serviceData.provider_id);

        if (availabilityError) {
          throw availabilityError;
        }
        
        const typedAvailabilityData = (availabilityData || []) as AvailabilityRow[];
        setAvailability(typedAvailabilityData.map(row => ({
          id: row.id,
          provider_id: row.provider_id,
          day_of_week: row.day_of_week,
          start_time: row.start_time,
          end_time: row.end_time,
          created_at: row.created_at
        })));
        
        // Set default selected date to today
        if (next7Days.length > 0) {
          handleDateSelect(next7Days[0]);
        }
      } catch (error) {
        console.error('Error fetching service data:', error);
        const errorMessage = 
          error && typeof error === 'object' && 'message' in error
            ? error.message as string
            : 'Failed to load service information. Please try again later.';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchServiceData();
    }
  }, [params.id, handleDateSelect, next7Days]);

  // Handle booking creation
  const handleBookService = async () => {
    if (!user) {
      router.push('/auth/signin');
      return;
    }

    if (!selectedDate || !selectedTime || !service) {
      setError('Please select a date and time to book this service.');
      return;
    }

    setBookingLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      // Create appointment date strings
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const startTimeStr = `${dateStr}T${selectedTime}:00`;
      const startTime = new Date(startTimeStr);
      const endTime = new Date(startTime.getTime() + (service.duration * 60000)); // Add duration in milliseconds
      
      // Create the appointment
      const { data: appointmentData, error: appointmentError } = await supabase
        .from('appointments')
        .insert([
          {
            service_id: service.id,
            provider_id: service.provider_id,
            customer_id: user.id,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            status: 'pending',
          }
        ])
        .select();

      if (appointmentError) {
        throw appointmentError;
      }

      if (appointmentData && appointmentData.length > 0) {
        // Create a notification for the provider
        await supabase
          .from('notifications')
          .insert([
            {
              user_id: service.provider_id,
              title: 'New Appointment Request',
              message: `${user.user_metadata?.first_name || 'A customer'} ${user.user_metadata?.last_name || ''} has requested an appointment for ${service.name} on ${format(startTime, 'PPP')} at ${format(startTime, 'p')}.`,
              notification_type: 'appointment',
              related_id: appointmentData[0].id,
            }
          ]);
      }

      setSuccessMessage('Appointment requested! The provider will confirm your booking soon.');
      
      // Reset selection
      setSelectedTime(null);
      
      // After 3 seconds, redirect to dashboard
      setTimeout(() => {
        router.push('/dashboard');
      }, 3000);
    } catch (error) {
      console.error('Error booking service:', error);
      const errorMessage = 
        error && typeof error === 'object' && 'message' in error
          ? error.message as string
          : 'There was an error booking this service. Please try again.';
      setError(errorMessage);
    } finally {
      setBookingLoading(false);
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

  if (error && !service) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <h2 className="text-xl font-semibold text-red-600 mb-2">Error</h2>
            <p className="text-gray-700">{error}</p>
            <Link href="/services" className="mt-4 inline-block bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700">
              Back to Services
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link href="/services" className="text-blue-600 hover:text-blue-800 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Services
          </Link>
        </div>
        
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="md:flex">
            {/* Service image placeholder */}
            <div className="md:w-1/3 bg-gray-200 h-64 md:h-auto flex items-center justify-center">
              <span className="text-gray-400 text-6xl">
                {service?.service_type === 'haircut' ? '✂️' : '🎨'}
              </span>
            </div>
            
            {/* Service details */}
            <div className="md:w-2/3 p-6">
              <div className="mb-2">
                <span className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 capitalize">
                  {service?.service_type}
                </span>
              </div>
              
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{service?.name}</h1>
              
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-gray-300 rounded-full mr-2 flex items-center justify-center">
                  <span className="text-gray-600 text-sm">{provider?.user_metadata?.first_name?.[0]}{provider?.user_metadata?.last_name?.[0]}</span>
                </div>
                <div>
                  <p className="text-sm font-medium">{provider?.user_metadata?.first_name} {provider?.user_metadata?.last_name}</p>
                  <p className="text-xs text-gray-500 capitalize">{provider?.user_metadata?.user_type?.replace('_', ' ')}</p>
                </div>
              </div>
              
              <p className="text-gray-600 mb-4">{service?.description}</p>
              
              <div className="flex flex-wrap gap-6 mb-6">
                <div>
                  <p className="text-sm text-gray-500">Price</p>
                  <p className="text-xl font-semibold">${service?.price}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Duration</p>
                  <p className="text-xl font-semibold">{service?.duration} min</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Booking section */}
          <div className="p-6 bg-gray-50 border-t">
            <h2 className="text-xl font-semibold mb-4">Book This Service</h2>
            
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}
            
            {successMessage && (
              <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
                {successMessage}
              </div>
            )}
            
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Select a Date</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
                {next7Days.map((date) => (
                  <button
                    key={date.toString()}
                    onClick={() => handleDateSelect(date)}
                    className={`p-2 border rounded-md text-center ${
                      selectedDate && date.toDateString() === selectedDate.toDateString()
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="text-xs uppercase font-bold mb-1">
                      {format(date, 'EEE')}
                    </div>
                    <div className="text-lg font-semibold">
                      {format(date, 'd')}
                    </div>
                    <div className="text-xs">
                      {format(date, 'MMM')}
                    </div>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Select a Time</h3>
              {availableSlots.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {availableSlots.map((time) => (
                    <button
                      key={time}
                      onClick={() => setSelectedTime(time)}
                      className={`p-2 border rounded-md text-center ${
                        selectedTime === time
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white hover:bg-gray-50'
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No available time slots for this date.</p>
              )}
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={handleBookService}
                disabled={bookingLoading || !selectedDate || !selectedTime || !!successMessage}
                className="bg-blue-600 text-white py-2 px-6 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bookingLoading ? 'Booking...' : 'Book Now'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}