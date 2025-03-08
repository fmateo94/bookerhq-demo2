import { User } from '@supabase/supabase-js';

export interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  provider_id: string;
  service_type: 'haircut' | 'tattoo';
  created_at: string;
  provider?: User;
}

export interface Availability {
  id: string;
  provider_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  created_at: string;
}

export interface Appointment {
  id: string;
  service_id: string;
  provider_id: string;
  customer_id: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  created_at: string;
  service?: Service;
  provider?: User;
  customer?: User;
} 