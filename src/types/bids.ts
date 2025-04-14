export type BidWithDetails = {
  id: string;
  slot_id: string;
  bid_amount: number;
  created_at: string;
  status?: string;
  tenant_id?: string;
  service_id?: string;
  provider_id?: string; // This should be the provider's profile ID
  profile_provider_id?: string; // Explicit column from bids table
  customer_id?: string;
  start_time?: string;
  end_time?: string;
  is_auction?: boolean;
  min_price?: number;
  service_name?: string;
  provider_name?: string;
  slot_time?: string;
  slot_date?: string;
  owner_type: string;
  parent_bid_id?: string;
}; 