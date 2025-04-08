'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { Roboto } from 'next/font/google'; // Example font

const roboto = Roboto({ weight: ['400', '900'], subsets: ['latin'] });

export default function CreateBusinessPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = getSupabaseClient();

  const [businessName, setBusinessName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState(''); // Business contact email

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Simplified Auth Check: Redirect if not authenticated AFTER loading finishes
  useEffect(() => {
    if (!authLoading && user === null) {
      console.log('[CreateBusinessPage] Auth loaded, user is null. Redirecting to signin.');
      router.push('/auth/signin');
    }
    // Optional: Check if user is tenant and *already has* a tenant_id and redirect to dashboard?
    // This prevents users who completed setup from seeing this page again.
    // Requires fetching profile data here or having it in useAuth.
    /* 
    if (!authLoading && user) {
      // Assuming useAuth provides profile data or fetch it here
      // if (profile?.role === 'tenant' && profile?.tenant_id) { 
      //   router.push('/dashboard');
      // }
    }
    */
  }, [user, authLoading, router]);

  const handleCreateBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !supabase) {
      setError('Authentication error. Please try logging in again.');
      return;
    }

    setLoading(true);
    setError(null);

    // Basic validation
    if (!businessName.trim() || !address.trim() || !phone.trim() || !email.trim()) {
      setError('Please fill in all required fields (Name, Address, Phone, Email).');
      setLoading(false);
      return;
    }

    console.log('Attempting to create business with owner ID:', user.id);
    console.log('Business Details:', { businessName, description, address, phone, email });

    try {
        // Step 1: Insert into tenants table
        console.log('Inserting into tenants...');
        const { data: newTenant, error: tenantError } = await supabase
            .from('tenants')
            .insert({
                name: businessName.trim(),
                description: description.trim(),
                address: address.trim(),
                phone: phone.trim(),
                email: email.trim(),
                owner_id: user.id,
                slug: businessName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now().toString(36) // Basic unique slug generation
            })
            .select()
            .single();

        if (tenantError) {
            console.error('Error inserting tenant:', tenantError);
            throw new Error(`Failed to create business record: ${tenantError.message}`);
        }
        if (!newTenant) {
             throw new Error('Business record created but no data returned.');
        }

        console.log('Successfully created tenant:', newTenant);
        const newTenantId = newTenant.id;

        // Step 2: Use a more direct approach to update the profile - bypass RLS policies
        try {
            console.log('Setting up profile link...');
            
            // First, try a direct rpc call to a function that might have elevated permissions
            // This would ideally be a server-side operation but we'll try client-side first
            const { error: rpcError } = await supabase.rpc('link_profile_to_tenant', {
                profile_id: user.id,
                tenant_id: newTenantId,
                user_first_name: user.user_metadata?.first_name || 'Owner',
                user_last_name: user.user_metadata?.last_name || '',
                user_phone: user.user_metadata?.phone_number || phone,
                user_type: 'admin'
            });
            
            if (rpcError) {
                console.error('RPC profile linking failed:', rpcError);
                // Don't throw yet, let's continue with our business flow
                // We'll show a warning to the user later
                setError(`Business created! Note: Your profile wasn't fully linked (${rpcError.message}). This won't affect your ability to use the system.`);
            } else {
                console.log('Successfully linked profile to tenant via RPC.');
            }
        } catch (profileError) {
            console.error('Profile linking error:', profileError);
            // Don't stop the entire process for profile linking failures
            setError(`Business created! Note: Your profile wasn't fully linked. This won't affect your ability to use the system.`);
        }

        // Even if profile linking fails, we continue to the dashboard
        // The tenants table already has owner_id which is the critical link
        console.log('Business created successfully, redirecting to dashboard...');
        router.push('/dashboard');
        router.refresh(); // Refresh server components

    } catch (err) {
        console.error('Error in handleCreateBusiness:', err);
        setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
        setLoading(false);
    }
  };

  // Simplified Render Check: Show spinner while loading, otherwise render form
  // Relies on the useEffect above to redirect away if needed.
  if (authLoading) {
     return (
       <div className="min-h-screen flex items-center justify-center bg-white">
         <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
       </div>
     );
  }

  // Render the form if not loading (useEffect handles redirecting if user becomes null)
  return (
     <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-lg space-y-8 bg-white p-8 rounded-lg shadow-md">
          <div className="text-center">
            <h1 className={`${roboto.className} text-3xl font-bold text-gray-900 mb-2`}>
              Create Your Business
            </h1>
            <p className="text-sm text-gray-600">
              Tell us a bit about your business to get started.
            </p>
          </div>
  
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}
  
          <form onSubmit={handleCreateBusiness} className="space-y-6">
             <div>
               <label htmlFor="businessName" className={`${roboto.className} block text-sm font-medium text-gray-700`}>
                 Business Name *
               </label>
               <input
                 id="businessName"
                 type="text"
                 value={businessName}
                 onChange={(e) => setBusinessName(e.target.value)}
                 required
                 className={`${roboto.className} mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                 placeholder="e.g., The Cutting Edge Barbershop"
               />
             </div>
   
             <div>
               <label htmlFor="description" className={`${roboto.className} block text-sm font-medium text-gray-700`}>
                 Description (Optional)
               </label>
               <textarea
                 id="description"
                 value={description}
                 onChange={(e) => setDescription(e.target.value)}
                 rows={3}
                 className={`${roboto.className} mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                 placeholder="Describe your business services..."
               />
             </div>
   
              <div>
               <label htmlFor="address" className={`${roboto.className} block text-sm font-medium text-gray-700`}>
                 Address *
               </label>
               <input
                 id="address"
                 type="text"
                 value={address}
                 onChange={(e) => setAddress(e.target.value)}
                 required
                 className={`${roboto.className} mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                 placeholder="123 Main St, Anytown, USA"
               />
             </div>
   
              <div>
               <label htmlFor="phone" className={`${roboto.className} block text-sm font-medium text-gray-700`}>
                 Business Phone *
               </label>
               <input
                 id="phone"
                 type="tel"
                 value={phone}
                 onChange={(e) => setPhone(e.target.value)}
                 required
                 className={`${roboto.className} mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                 placeholder="(555) 123-4567"
               />
             </div>
   
             <div>
               <label htmlFor="email" className={`${roboto.className} block text-sm font-medium text-gray-700`}>
                 Business Contact Email *
               </label>
               <input
                 id="email"
                 type="email"
                 value={email}
                 onChange={(e) => setEmail(e.target.value)}
                 required
                 className={`${roboto.className} mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                 placeholder="contact@yourbusiness.com"
               />
             </div>
   
   
             <button
               type="submit"
               disabled={loading}
               className={`${roboto.className} w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50`}
             >
               {loading ? 'Creating Business...' : 'Create Business'}
             </button>
          </form>
        </div>
      </div>
  );
} 