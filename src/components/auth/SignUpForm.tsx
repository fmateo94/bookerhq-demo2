'use client';

import { useState } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FiArrowLeft } from 'react-icons/fi';

const passwordRequirements = [
  { id: 'length', label: 'At least 8 characters' },
  { id: 'uppercase', label: 'One uppercase letter' },
  { id: 'lowercase', label: 'One lowercase letter' },
  { id: 'number', label: 'One number' },
  { id: 'special', label: 'One special character' },
];

export default function SignUpForm() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [userType, setUserType] = useState('customer');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
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

  const handleNextStep = () => {
    setError(null);
    if (step === 1) {
      if (!email) {
        setError('Please enter your email address');
        return;
      }
      if (!password) {
        setError('Please enter a password');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      const passReqs = validatePassword(password);
      if (!Object.values(passReqs).every(Boolean)) {
        setError('Please meet all password requirements');
        return;
      }
    }
    if (step === 2) {
      if (!firstName || !lastName) {
        setError('Please enter your full name');
        return;
      }
      if (!phoneNumber) {
        setError('Please enter your phone number');
        return;
      }
      if (!acceptedTerms) {
        setError('Please accept the terms and conditions');
        return;
      }
    }
    setStep(step + 1);
  };

  const handlePrevStep = () => {
    setStep(step - 1);
    setError(null);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            phone_number: phoneNumber,
            user_type: userType,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (authError) {
        throw authError;
      }

      if (authData?.user) {
        const { error: profileError } = await supabase
          .from('users')
          .insert([
            {
              id: authData.user.id,
              email,
              first_name: firstName,
              last_name: lastName,
              phone_number: phoneNumber,
              user_type: userType,
            },
          ]);

        if (profileError) {
          throw profileError;
        }

        router.push('/auth/verify-email');
      }
    } catch (error) {
      const errorMessage = 
        error && typeof error === 'object' && 'message' in error
          ? error.message as string
          : 'An error occurred during sign up';
      
      setError(errorMessage);
      console.error('Error signing up:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        {step > 1 && (
          <button
            onClick={handlePrevStep}
            className="flex items-center text-gray-600 mb-4"
          >
            <FiArrowLeft className="mr-2" />
            Back
          </button>
        )}

        <h2 className="text-2xl font-bold mb-6 text-center">
          {step === 1 ? 'Create an Account' : 'Complete Your Profile'}
        </h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        
        <form onSubmit={step === 2 ? handleSignUp : (e) => e.preventDefault()}>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {step === 1 && (
              <>
                <div className="mb-4">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="jane@example.com"
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
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
                    Confirm Password
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
              </>
            )}

            {step === 2 && (
              <>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                      First Name
                    </label>
                    <input
                      id="firstName"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name
                    </label>
                    <input
                      id="lastName"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <div className="mb-4">
                  <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    id="phoneNumber"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="mb-6">
                  <label htmlFor="userType" className="block text-sm font-medium text-gray-700 mb-1">
                    I am a:
                  </label>
                  <select
                    id="userType"
                    value={userType}
                    onChange={(e) => setUserType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="customer">Customer</option>
                    <option value="barber">Barber</option>
                    <option value="tattoo_artist">Tattoo Artist</option>
                  </select>
                </div>

                <div className="mb-6">
                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="mt-1 mr-2"
                    />
                    <span className="text-sm text-gray-600">
                      I accept the{' '}
                      <Link href="/terms" className="text-blue-600 hover:text-blue-800">
                        Terms and Conditions
                      </Link>
                      {' '}and{' '}
                      <Link href="/privacy" className="text-blue-600 hover:text-blue-800">
                        Privacy Policy
                      </Link>
                    </span>
                  </label>
                </div>
              </>
            )}
          </motion.div>

          <button
            type={step === 2 ? 'submit' : 'button'}
            onClick={step === 1 ? handleNextStep : undefined}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? 'Creating Account...' : step === 1 ? 'Continue' : 'Create Account'}
          </button>
        </form>
        
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/auth/signin" className="text-blue-600 hover:text-blue-800">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}