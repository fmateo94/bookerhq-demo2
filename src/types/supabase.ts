
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      availability: {
        Row: {
          created_at: string
          day_of_week: number | null
          end_time: string | null
          id: string
          provider_id: string | null
          start_time: string | null
        }
        Insert: {
          created_at?: string
          day_of_week?: number | null
          end_time?: string | null
          id?: string
          provider_id?: string | null
          start_time?: string | null
        }
        Update: {
          created_at?: string
          day_of_week?: number | null
          end_time?: string | null
          id?: string
          provider_id?: string | null
          start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "availability_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bids: {
        Row: {
          bid_amount: number
          created_at: string
          customer_id: string | null
          id: string
          owner_type: string | null
          parent_bid_id: string | null
          profile_provider_id: string | null
          slot_id: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          bid_amount: number
          created_at?: string
          customer_id?: string | null
          id?: string
          owner_type?: string | null
          parent_bid_id?: string | null
          profile_provider_id?: string | null
          slot_id: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          bid_amount?: number
          created_at?: string
          customer_id?: string | null
          id?: string
          owner_type?: string | null
          parent_bid_id?: string | null
          profile_provider_id?: string | null
          slot_id?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bids_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bids_parent_bid_id_fkey"
            columns: ["parent_bid_id"]
            isOneToOne: false
            referencedRelation: "bids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bids_profile_provider_id_fkey"
            columns: ["profile_provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bids_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bids_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          created_at: string
          customer_id: string | null
          id: string
          price_paid: number | null
          provider_profile_id: string | null
          service_id: string | null
          slot_id: string | null
          status: string | null
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          id?: string
          price_paid?: number | null
          provider_profile_id?: string | null
          service_id?: string | null
          slot_id?: string | null
          status?: string | null
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          id?: string
          price_paid?: number | null
          provider_profile_id?: string | null
          service_id?: string | null
          slot_id?: string | null
          status?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_provider_id_fkey"
            columns: ["provider_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          first_name: string | null
          id: string
          last_name: string | null
          phone_number: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          first_name?: string | null
          id: string
          last_name?: string | null
          phone_number?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone_number?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string
          notification_type: string
          read: boolean | null
          related_id: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          notification_type: string
          read?: boolean | null
          related_id?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          notification_type?: string
          read?: boolean | null
          related_id?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          first_name: string | null
          full_name: string | null
          id: string
          instagram_handle: string | null
          last_name: string | null
          phone_number: string | null
          tenant_id: string | null
          user_id: string | null
          user_type: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          first_name?: string | null
          full_name?: string | null
          id?: string
          instagram_handle?: string | null
          last_name?: string | null
          phone_number?: string | null
          tenant_id?: string | null
          user_id?: string | null
          user_type?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          first_name?: string | null
          full_name?: string | null
          id?: string
          instagram_handle?: string | null
          last_name?: string | null
          phone_number?: string | null
          tenant_id?: string | null
          user_id?: string | null
          user_type?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          base_price: number | null
          created_at: string
          description: string | null
          duration: number | null
          id: string
          image_url: string | null
          name: string | null
          provider_id: string | null
          service_type: string | null
          tenant_id: string | null
        }
        Insert: {
          base_price?: number | null
          created_at?: string
          description?: string | null
          duration?: number | null
          id?: string
          image_url?: string | null
          name?: string | null
          provider_id?: string | null
          service_type?: string | null
          tenant_id?: string | null
        }
        Update: {
          base_price?: number | null
          created_at?: string
          description?: string | null
          duration?: number | null
          id?: string
          image_url?: string | null
          name?: string | null
          provider_id?: string | null
          service_type?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      slots: {
        Row: {
          auction_end_time: string | null
          created_at: string
          end_time: string | null
          id: string
          is_auction: boolean | null
          min_price: number | null
          provider_id: string | null
          service_id: string | null
          start_time: string | null
          status: string | null
          tenant_id: string | null
        }
        Insert: {
          auction_end_time?: string | null
          created_at?: string
          end_time?: string | null
          id?: string
          is_auction?: boolean | null
          min_price?: number | null
          provider_id?: string | null
          service_id?: string | null
          start_time?: string | null
          status?: string | null
          tenant_id?: string | null
        }
        Update: {
          auction_end_time?: string | null
          created_at?: string
          end_time?: string | null
          id?: string
          is_auction?: boolean | null
          min_price?: number | null
          provider_id?: string | null
          service_id?: string | null
          start_time?: string | null
          status?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "slots_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slots_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          address: string | null
          created_at: string | null
          description: string | null
          email: string | null
          id: string
          logo_url: string | null
          name: string
          opening_hours: Json | null
          owner_id: string | null
          phone: string | null
          settings: Json | null
          slug: string
          website: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          opening_hours?: Json | null
          owner_id?: string | null
          phone?: string | null
          settings?: Json | null
          slug: string
          website?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          opening_hours?: Json | null
          owner_id?: string | null
          phone?: string | null
          settings?: Json | null
          slug?: string
          website?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      find_customer_bookings: {
        Args: { customer_uuid: string }
        Returns: {
          booking_id: string
          slot_id: string
          customer_id: string
          note: string
        }[]
      }
      get_tenant_bids: {
        Args: { tenant_id_param: string }
        Returns: {
          bid_amount: number
          created_at: string
          customer_id: string | null
          id: string
          owner_type: string | null
          parent_bid_id: string | null
          profile_provider_id: string | null
          slot_id: string
          status: string
          tenant_id: string
          updated_at: string
        }[]
      }
      link_profile_to_tenant: {
        Args: {
          auth_user_id: string
          tenant_id_param: string
          user_first_name: string
          user_last_name: string
          user_phone: string
          user_type_param: string
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
