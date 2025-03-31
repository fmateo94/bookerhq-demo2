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
      appointments: {
        Row: {
          id: string
          service_id: string
          provider_id: string
          customer_id: string
          start_time: string
          end_time: string
          status: 'pending' | 'confirmed' | 'cancelled'
          created_at: string
        }
        Insert: {
          id?: string
          service_id: string
          provider_id: string
          customer_id: string
          start_time: string
          end_time: string
          status: 'pending' | 'confirmed' | 'cancelled'
          created_at?: string
        }
        Update: {
          id?: string
          service_id?: string
          provider_id?: string
          customer_id?: string
          start_time?: string
          end_time?: string
          status?: 'pending' | 'confirmed' | 'cancelled'
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
      availability: {
        Row: {
          id: string
          provider_id: string
          day_of_week: number
          start_time: string
          end_time: string
          created_at: string
        }
        Insert: {
          id?: string
          provider_id: string
          day_of_week: number
          start_time: string
          end_time: string
          created_at?: string
        }
        Update: {
          id?: string
          provider_id?: string
          day_of_week?: number
          start_time?: string
          end_time?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types for Supabase Auth User Metadata
export interface UserMetadata {
  first_name: string;
  last_name: string;
  phone_number: string;
  user_type: 'individual' | 'business';
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'] 