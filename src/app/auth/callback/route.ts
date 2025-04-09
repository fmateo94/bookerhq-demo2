import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { Database } from '@/types';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const error_description = requestUrl.searchParams.get('error_description');
  
  console.log('Auth callback route, url:', request.url);
  console.log('Auth callback params:',  { code: code?.substring(0, 10) + '...', error, error_description });
  
  if (error) {
    console.error(`Auth error: ${error}`, error_description);
    // Redirect to sign-in with error parameters
    return NextResponse.redirect(new URL(`/auth/signin?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(error_description || '')}`, request.url));
  }
  
  // Extract URL fragment if it exists (will be after #)
  const fragmentMatch = request.url.match(/#(.+)$/);
  const fragment = fragmentMatch ? fragmentMatch[1] : null;
  
  // If we have a fragment with access_token, preserve it in the redirect
  if (fragment && fragment.includes('access_token')) {
    console.log('Auth callback: Found access_token in URL fragment, preserving in redirect');
    return NextResponse.redirect(new URL(`/auth/signin?fragment=${encodeURIComponent(fragment)}`, request.url));
  }
  
  // Handle code exchange if present (OAuth flow)
  if (code) {
    try {
      const supabase = createRouteHandlerClient<Database>({ cookies });
      await supabase.auth.exchangeCodeForSession(code);
      console.log('Auth callback: Successfully exchanged code for session');
      return NextResponse.redirect(new URL('/dashboard', request.url));
    } catch (error) {
      console.error('Failed to exchange code for session:', error);
      return NextResponse.redirect(
        new URL('/auth/signin?error=session_exchange_failed&error_description=Failed+to+complete+login', request.url)
      );
    }
  }

  // If no code or token, redirect to sign-in
  console.log('Auth callback: No code or token found, redirecting to sign-in');
  return NextResponse.redirect(new URL('/auth/signin', request.url));
} 