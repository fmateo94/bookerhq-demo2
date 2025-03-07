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
}

export interface Auction {
  id: string;
  service_id: string;
  provider_id: string;
  auction_start: string;
  auction_end: string;
  starting_price: number;
  current_price: number | null;
  current_winner_id: string | null;
  created_at: string;
}

export interface Bid {
  id: string;
  auction_id: string;
  user_id: string;
  amount: number;
  created_at: string;
  users?: User;
}

export interface AuctionWithDetails extends Auction {
  service?: Service;
  provider?: User;
  bids?: Bid[];
} 