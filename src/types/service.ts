import type { Database } from './supabase';
import { User } from '@supabase/supabase-js';

type ServiceRow = Database['public']['Tables']['services']['Row'];
type AvailabilityRow = Database['public']['Tables']['availability']['Row'];
type UserRow = Database['public']['Tables']['users']['Row'];
type AppointmentRow = Database['public']['Tables']['appointments']['Row'];

export type Service = ServiceRow & {
  provider?: UserRow;
};

export type Availability = AvailabilityRow;

export interface Appointment extends AppointmentRow {
  service?: Service;
  provider?: UserRow;
  customer?: UserRow;
} 