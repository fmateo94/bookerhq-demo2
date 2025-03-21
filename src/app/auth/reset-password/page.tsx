'use client';

import { useState } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

const passwordRequirements = [
  { id: 'length', label: 'At least 8 characters' },
  { id: 'uppercase', label: 'One uppercase letter' },
  { id: 'lowercase', label: 'One lowercase letter' },
  { id: 'number', label: 'One number' },
  { id: 'special', label: 'One special character' },
];

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const validatePassword = (pass: string) => {
    const requirements = {
      length: pass.length >= 8,
      uppercase: /[A-Z]/.test(pass),
      lowercase: /[a-z]/.test(pass),
      number: /[0-9]/.test(pass),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(pass),
    };
    return requirements;
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    const passReqs = validatePassword(password);
    if (!Object.values(passReqs).every(Boolean)) {
      setError('Please meet all password requirements');
      setLoading(false);
      return;
    }

    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        throw error;
      }

      // Password updated successfully
      router.push('/auth/signin?message=Password updated successfully');
    } catch (error) {
      const errorMessage = 
        error && typeof error === 'object' && 'message' in error
          ? error.message as string
          : 'An error occurred while resetting password';
      
      setError(errorMessage);
      console.error('Error resetting password:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-6 text-center">Reset Your Password</h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        
        <form onSubmit={handleResetPassword}>
          <div className="mb-4">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              New Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mb-6 space-y-2">
            <p className="text-sm font-medium text-gray-700">Password Requirements:</p>
            {passwordRequirements.map((req) => (
              <div
                key={req.id}
                className={`flex items-center text-sm ${
                  validatePassword(password)[req.id as keyof ReturnType<typeof validatePassword>]
                    ? 'text-green-600'
                    : 'text-gray-500'
                }`}
              >
                <span className="mr-2">•</span>
                {req.label}
              </div>
            ))}
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? 'Updating Password...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
} 