import type { Database } from './supabase';

type UserRow = Database['public']['Tables']['users']['Row'];
type ServiceRow = Database['public']['Tables']['services']['Row'];
type AuctionRow = Database['public']['Tables']['auctions']['Row'];
type BidRow = Database['public']['Tables']['bids']['Row'];

export type Service = ServiceRow;
export type Auction = AuctionRow;

export interface AuctionWithDetails extends Auction {
  service?: Service;
  provider?: UserRow;
  bids?: Bid[];
}

export interface Bid extends BidRow {
  users?: {
    id: string;
    user_metadata: {
      first_name?: string;
      last_name?: string;
      user_type?: string;
    } | null;
  };
} 