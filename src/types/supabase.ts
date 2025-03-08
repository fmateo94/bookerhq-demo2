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
      users: {
        Row: {
          id: string
          email: string | null
          user_metadata: {
            first_name?: string
            last_name?: string
            user_type?: string
          } | null
          app_metadata: Record<string, any> | null
          aud: string
          created_at: string
        }
        Insert: {
          id: string
          email?: string | null
          user_metadata?: Record<string, any> | null
          app_metadata?: Record<string, any> | null
          aud?: string
          created_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          user_metadata?: Record<string, any> | null
          app_metadata?: Record<string, any> | null
          aud?: string
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
  }
} 