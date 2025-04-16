export type ProfileData = {
  id: string;
  user_id?: string | null; // Allow user_id to be optional or null
  first_name: string | null; // Allow null
  last_name: string | null;  // Allow null
  email?: string; // Email might be from auth user, not profile table directly
  phone_number?: string | null; // Allow null
  user_type: string | null;     // Allow null
  created_at: string | null;    // Allow null
  tenant_id?: string | null;    // Add tenant_id field
  // Add any other relevant profile fields from your actual data
  avatar_url?: string | null;
  bio?: string | null;
  full_name?: string | null;
  instagram_handle?: string | null;
  portfolio_url?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  updated_at?: string | null;
  username?: string | null;
}; 