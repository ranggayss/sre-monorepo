// apps/main/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@sre-monorepo/lib';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    const { pathname } = request.nextUrl;

    // Debug logging untuk development
    if (process.env.NODE_ENV === 'development') {
      console.log('=== MAIN MIDDLEWARE DEBUG ===');
      console.log('Pathname:', pathname);
      console.log('Session exists:', !!session);
      console.log('User email:', session?.user?.email);
      console.log('==============================');
    }

    // Jika pengguna sudah terautentikasi dan mencoba mengakses signin/signup
    if (session && (pathname === '/signin' || pathname === '/signup')) {
      const redirectUrl = new URL('/', process.env.NEXT_PUBLIC_BRAIN_APP_URL || 'http://brain.lvh.me:3001');
      console.log('User already authenticated, redirecting to brain app root:', redirectUrl.toString());
      return NextResponse.redirect(redirectUrl);
    }

    // Jika pengguna terautentikasi dan mengakses root, redirect ke brain app
    if (session && pathname === '/') {
      const redirectUrl = new URL('/', process.env.NEXT_PUBLIC_BRAIN_APP_URL || 'http://brain.lvh.me:3001');
      console.log('Authenticated user accessing root, redirecting to brain app:', redirectUrl.toString());
      return NextResponse.redirect(redirectUrl);
    }

    return response;
  } catch (error) {
    console.error('Main App Middleware error:', error);
    return response;
  }
}

export const config = {
  matcher: [
    '/',
    '/signin',
    '/signup',
  ],
};