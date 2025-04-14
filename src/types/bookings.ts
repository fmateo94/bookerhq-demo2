export type BookingWithDetails = {
  id: string;
  slot_id: string;
  customer_id?: string;
  service_id: string;
  provider_profile_id?: string;
  status?: string;
  created_at: string;
  price_paid?: number;
  tenant_id?: string;
  // Joined data from slots
  start_time?: string;
  end_time?: string;
  // Joined data from profiles/customers
  customer_name?: string;
  customer_phone?: string;
  // Other display fields
  service_name?: string;
  provider_name?: string;
  slot_date?: string;
  slot_time?: string;
}; 