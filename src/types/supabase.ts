export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      auctions: {
        Row: {
          id: string
          service_id: string
          provider_id: string
          auction_start: string
          auction_end: string
          starting_price: number
          current_price: number | null
          current_winner_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          service_id: string
          provider_id: string
          auction_start: string
          auction_end: string
          starting_price: number
          current_price?: number | null
          current_winner_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          service_id?: string
          provider_id?: string
          auction_start?: string
          auction_end?: string
          starting_price?: number
          current_price?: number | null
          current_winner_id?: string | null
          created_at?: string
        }
      }
      services: {
        Row: {
          id: string
          name: string
          description: string
          price: number
          duration: number
          provider_id: string
          service_type: 'haircut' | 'tattoo'
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description: string
          price: number
          duration: number
          provider_id: string
          service_type: 'haircut' | 'tattoo'
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          price?: number
          duration?: number
          provider_id?: string
          service_type?: 'haircut' | 'tattoo'
          created_at?: string
        }
      }
      bids: {
        Row: {
          id: string
          auction_id: string
          user_id: string
          amount: number
          created_at: string
          users?: {
            id: string
            user_metadata?: {
              first_name?: string
              last_name?: string
            }
          }
        }
        Insert: {
          id?: string
          auction_id: string
          user_id: string
          amount: number
          created_at?: string
        }
        Update: {
          id?: string
          auction_id?: string
          user_id?: string
          amount?: number
          created_at?: string
        }
      }
    }
  }
} 