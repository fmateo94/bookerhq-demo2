import type { Database } from './supabase';
import { User } from '@supabase/supabase-js';

type ServiceRow = Database['public']['Tables']['services']['Row'];
type AvailabilityRow = Database['public']['Tables']['availability']['Row'];
type AppointmentRow = Database['public']['Tables']['appointments']['Row'];

export type Service = ServiceRow & {
  provider?: User;
};

export type Availability = AvailabilityRow;

export interface Appointment extends AppointmentRow {
  service?: Service;
  provider?: User;
  customer?: User;
} 