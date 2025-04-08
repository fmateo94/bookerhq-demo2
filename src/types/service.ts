import type { Database } from './supabase';
import { User } from '@supabase/supabase-js';

type AppointmentRow = Database['public']['Tables']['appointments']['Row'];

export type Service = {
  id: string;
  created_at: string;
  provider_id: string;
  name: string;
  description: string;
  duration: number;
  base_price: number;
  service_type: 'haircut' | 'tattoo';
  image_url?: string;
  tenant_id: string;
};

export type Profile = {
  id: string;
  created_at: string;
  user_id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  user_type: 'customer' | 'barber' | 'tattoo_artist';
  first_name: string;
  last_name: string;
  instagram_handle: string | null;
  bio: string | null;
  tenant_id: string;
};

export type Availability = {
  id: string;
  provider_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  created_at: string;
};

export type Booking = {
  id: string;
  customer_id: string;
  provider_id: string;
  service_id: string;
  slot_id: string;
  price_paid: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  created_at: string;
};

export type Slot = {
  id: string;
  provider_id: string;
  service_id: string;
  start_time: string;
  end_time: string;
  is_auction: boolean;
  auction_end_time?: string;
  min_price?: number;
  status: 'available' | 'booked' | 'auction' | 'completed';
  created_at: string;
};

export interface Appointment extends AppointmentRow {
  service?: Service;
  provider?: User;
  customer?: User;
}

export type Tenant = {
  id: string;
  name: string;
  slug: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  logo_url?: string;
  opening_hours: {
    [key: string]: {
      open: string;
      close: string;
    };
  };
  settings?: Record<string, string | number | boolean | null>;
  created_at: string;
}; 