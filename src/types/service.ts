import type { Database } from './supabase';
import { User } from '@supabase/supabase-js';

type AppointmentRow = Database['public']['Tables']['appointments']['Row'];

export type Service = {
  id: string;
  created_at: string;
  provider_id: string | null;
  name: string | null;
  description: string | null;
  duration: number | null;
  base_price: number | null;
  service_type: string | null;
  image_url: string | null;
  tenant_id: string | null;
};

export type Profile = {
  id: string;
  created_at: string;
  user_id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  user_type: 'customer' | 'barber' | 'tattoo_artist';
  first_name: string | null;
  last_name: string | null;
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
  provider_id: string | null;
  service_id: string | null;
  start_time: string | null;
  end_time: string | null;
  is_auction: boolean | null;
  auction_end_time: string | null;
  min_price: number | null;
  status: string | null;
  tenant_id: string | null;
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