'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FiArrowLeft } from 'react-icons/fi';
import { Roboto } from 'next/font/google';
import { getSupabaseClient } from '@/lib/supabaseClient';

const roboto = Roboto({ 
  weight: ['400', '900'],
  subsets: ['latin']
});

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
  const [showRoleSelection, setShowRoleSelection] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const roleParam = searchParams.get('role');
    if (roleParam === 'customer') {
      console.log('Role parameter found: customer. Hiding role selection.');
      setUserType('customer');
      setShowRoleSelection(false);
    } else {
      console.log('No specific role parameter found. Showing role selection.');
      setShowRoleSelection(true);
    }
  }, [searchParams]);

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
      setStep(2);
    } else if (step === 2) {
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
      handleSignUp();
    }
  };

  const handlePrevStep = () => {
    setStep(step - 1);
    setError(null);
  };

  const handleSignUp = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    setLoading(true);
    setError(null);

    try {
      console.log('Starting sign up process...');
      const supabase = getSupabaseClient();
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      console.log('Attempting to create auth user with:', { 
        email, 
        firstName, 
        lastName, 
        phoneNumber, 
        userType 
      });

      // Sign up the user with metadata
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
        console.error('Auth Error:', authError);
        throw authError;
      }

      console.log('Auth successful:', authData);

      if (!authData.user) {
        throw new Error('No user data returned after signup');
      }

      // ALWAYS redirect to email verification after sign up
      console.log('Sign up successful, redirecting to verify-email page.');
      router.push('/auth/verify-email?email=' + encodeURIComponent(email));

    } catch (error) {
      console.error('Full error object:', error);
      let errorMessage = 'An error occurred during sign up';
      
      if (error instanceof Error) {
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
        
        // Handle specific Supabase errors
        if (error.message.includes('User already registered')) {
          errorMessage = 'This email is already registered. Please sign in instead.';
        } else if (error.message.includes('Password')) {
          errorMessage = 'Password does not meet requirements. Please check and try again.';
        } else if (error.message.includes('valid email')) {
          errorMessage = 'Please enter a valid email address.';
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      } else {
        console.error('Non-Error object thrown:', error);
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {step > 1 && (
        <button
          onClick={handlePrevStep}
          className="flex items-center text-black hover:text-gray-700 transition-colors mb-6"
        >
          <FiArrowLeft className="w-5 h-5 mr-2" />
          <span className={`${roboto.className} text-sm`}>Back</span>
        </button>
      )}
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm">
          {error}
        </div>
      )}
      
      <form onSubmit={(e) => e.preventDefault()}>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="space-y-6"
        >
          {step === 1 && (
            <>
              {showRoleSelection && (
                <div className="mb-6">
                  <label className={`${roboto.className} block text-sm font-medium text-black mb-2`}>
                    How will you use this platform?
                  </label>
                  <div className="flex space-x-4">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="userType"
                        value="customer"
                        checked={userType === 'customer'}
                        onChange={(e) => setUserType(e.target.value)}
                        className="mr-2 h-4 w-4 border-2 border-black focus:ring-0 focus:ring-offset-0"
                      />
                      <span className={`${roboto.className} text-sm text-black`}>As a Customer</span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="userType"
                        value="tenant"
                        checked={userType === 'tenant'}
                        onChange={(e) => setUserType(e.target.value)}
                        className="mr-2 h-4 w-4 border-2 border-black focus:ring-0 focus:ring-offset-0"
                      />
                      <span className={`${roboto.className} text-sm text-black`}>As a Business (Tenant)</span>
                    </label>
                  </div>
                </div>
              )}
              
              <div>
                <div className="relative">
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className={`${roboto.className} w-full px-4 py-3 border-2 border-black rounded-none focus:outline-none focus:border-black text-black placeholder-black text-[15px]`}
                    placeholder="jane@example.com"
                  />
                </div>
              </div>
              
              <div>
                <div className="relative">
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className={`${roboto.className} w-full px-4 py-3 border-2 border-black rounded-none focus:outline-none focus:border-black text-black placeholder-black text-[15px]`}
                    placeholder="••••••••••••"
                  />
                </div>
              </div>

              <div>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className={`${roboto.className} w-full px-4 py-3 border-2 border-black rounded-none focus:outline-none focus:border-black text-black placeholder-black text-[15px]`}
                    placeholder="••••••••••••"
                  />
                </div>
              </div>

              <div className="space-y-2 bg-white p-4 rounded-none">
                <p className={`${roboto.className} text-sm text-black`}>Password Requirements:</p>
                {passwordRequirements.map((req) => (
                  <div
                    key={req.id}
                    className={`flex items-center text-sm ${
                      validatePassword(password)[req.id as keyof ReturnType<typeof validatePassword>]
                        ? 'text-black'
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="relative">
                    <input
                      id="firstName"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      className={`${roboto.className} w-full px-4 py-3 border-2 border-black rounded-none focus:outline-none focus:border-black text-black placeholder-black text-[15px]`}
                      placeholder="First name"
                    />
                  </div>
                </div>
                <div>
                  <div className="relative">
                    <input
                      id="lastName"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      className={`${roboto.className} w-full px-4 py-3 border-2 border-black rounded-none focus:outline-none focus:border-black text-black placeholder-black text-[15px]`}
                      placeholder="Last name"
                    />
                  </div>
                </div>
              </div>

              <div>
                <div className="relative">
                  <input
                    id="phoneNumber"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                    className={`${roboto.className} w-full px-4 py-3 border-2 border-black rounded-none focus:outline-none focus:border-black text-black placeholder-black text-[15px]`}
                    placeholder="Phone number"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    id="acceptTerms"
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="h-4 w-4 border-2 border-black rounded-none focus:ring-0 focus:ring-offset-0"
                  />
                  <label htmlFor="acceptTerms" className={`${roboto.className} ml-2 text-sm text-black`}>
                    I accept the{' '}
                    <Link href="/terms" className="underline">
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link href="/privacy" className="underline">
                      Privacy Policy
                    </Link>
                  </label>
                </div>
              </div>
            </>
          )}

          <button
            type="button"
            onClick={handleNextStep}
            disabled={loading}
            className={`${roboto.className} w-full bg-black text-white py-3 px-6 rounded-[6px] font-black text-[13px] tracking-[0.04em] uppercase hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {loading ? 'Please wait...' : step === 1 ? 'next' : 'Create Account'}
          </button>
        </motion.div>
      </form>
    </div>
  );
}