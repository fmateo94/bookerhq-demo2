'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { getSupabaseClient } from '@/lib/supabaseClient';
import Navbar from '@/components/ui/Navbar';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format, parseISO, addDays, isBefore, isAfter } from 'date-fns';

type ServiceData = {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  provider_id: string;
  service_type: 'haircut' | 'tattoo';
  created_at: string;
};

type ProviderData = {
  id: string;
  user_metadata?: {
    first_name?: string;
    last_name?: string;
  };
};

type AvailabilityData = {
  id: string;
  provider_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
};

export default function ServiceDetailPage({ params }: { params: { id: string } }) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [service, setService] = useState<ServiceData | null>(null);
  const [provider, setProvider] = useState<ProviderData | null>(null);
  const [availability, setAvailability] = useState<AvailabilityData[]>([]);
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
        if (!serviceData) {
          throw new Error('Service not found');
        }

        const typedServiceData = serviceData as ServiceData;
        setService(typedServiceData);

        // Fetch provider details
        const { data: providerData, error: providerError } = await supabase
          .from('users')
          .select('id, user_metadata')
          .eq('id', typedServiceData.provider_id)
          .single();

        if (providerError) {
          throw providerError;
        }
        if (!providerData) {
          throw new Error('Provider not found');
        }
        
        setProvider(providerData as ProviderData);

        // Fetch provider availability
        const { data: availabilityData, error: availabilityError } = await supabase
          .from('availability')
          .select('*')
          .eq('provider_id', typedServiceData.provider_id);

        if (availabilityError) {
          throw availabilityError;
        }
        
        setAvailability((availabilityData || []) as AvailabilityData[]);
        
        // Set default selected date to today
        if (next7Days[0]) {
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
  }, [params.id]);

  // Handle date selection
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setSelectedTime(null);
    
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Find availability for the selected day
    const dayAvailability = availability.find(slot => slot.day_of_week === dayOfWeek);
    
    if (dayAvailability && service) {
      // Generate time slots based on service duration and provider availability
      const startTime = parseISO(`2000-01-01T${dayAvailability.start_time}`);
      const endTime = parseISO(`2000-01-01T${dayAvailability.end_time}`);
      const duration = service.duration;
      
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
  };

  // Handle booking creation
  const handleBookService = async () => {
    if (!user) {
      router.push('/auth/signin');
      return;
    }

    if (!selectedDate || !selectedTime || !service || !provider) {
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
            provider_id: provider.id,
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
              user_id: provider.id,
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

  // Return JSX as before
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      {/* Rest of your component's JSX */}
    </div>
  );
}