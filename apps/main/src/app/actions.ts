// apps/main/actions.ts
'use server';

import { redirect } from 'next/navigation';
import { createServerSupabaseClient, sharedSignIn, sharedSignUp, sharedSignOut } from '@sre-monorepo/lib';
import { prisma } from '@sre-monorepo/lib';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

interface AuthResult {
  error?: string;
  success?: boolean;
}

export async function signIn(formData: { email: string; password: string }): Promise<AuthResult> {
  const supabase = await createServerSupabaseClient();

  try {
    const { user } = await sharedSignIn(supabase, formData);
    
    if (user) {
      console.log('Sign in successful for user:', user.email);
      
      // Verifikasi session tersimpan dengan benar
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Session after sign in:', !!session);
      
      if (session) {
        // Set additional cookie untuk debugging
        const cookieStore = await cookies();
        cookieStore.set('auth-debug', 'authenticated', {
          domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN || '.lvh.me',
          path: '/',
          httpOnly: false,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 // 24 hours
        });
        
        // Tunggu sebentar agar cookie ter-set dengan benar
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Revalidate cache - lebih spesifik
        revalidatePath('/', 'layout');
        revalidatePath('/brain', 'layout');
        revalidatePath('/signin');
        
        // Force refresh session di cookies
        const refreshToken = session.refresh_token;
        const accessToken = session.access_token;
        
        if (refreshToken && accessToken) {
          // Set tokens secara eksplisit
          cookieStore.set(`sb-${process.env.NEXT_PUBLIC_SUPABASE_PROJECT_REF}-auth-token`, JSON.stringify({
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_at: session.expires_at,
            token_type: 'bearer',
            user: session.user
          }), {
            domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN || '.lvh.me',
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7 // 7 days
          });
        }
      } else {
        return { error: 'Session not created properly' };
      }
    } else {
      return { error: 'Sign in failed: No user data returned.' };
    }
    
    // Return success without redirect - let client handle redirect
    return { success: true };
    
  } catch (error: any) {
    console.error('Sign in failed:', error.message);
    return { error: error.message };
  }
}

export async function signUp(formData: { 
  fullName: string; 
  sid: string; 
  email: string; 
  group: string; 
  password: string 
}): Promise<AuthResult> {
  const supabase = await createServerSupabaseClient();

  try {
    const { user } = await sharedSignUp(supabase, formData);

    if (user) {
      // Simpan data tambahan ke database
      await prisma.user.upsert({
        where: { id: user.id },
        update: {
          email: formData.email,
          name: formData.fullName,
          group: formData.group,
          nim: formData.sid,
        },
        create: {
          id: user.id,
          email: formData.email,
          name: formData.fullName,
          role: 'USER',
          group: formData.group,
          password: '',
          nim: formData.sid,
        }
      });

      console.log('Sign up successful for user:', user.email);
      
      // Verifikasi session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // Set debug cookie
        const cookieStore = await cookies();
        cookieStore.set('auth-debug', 'authenticated', {
          domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN || '.lvh.me',
          path: '/',
          httpOnly: false,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24
        });
        
        // Tunggu sebentar
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Revalidate cache
        revalidatePath('/', 'layout');
        revalidatePath('/brain', 'layout');
        
        // Set session tokens
        const refreshToken = session.refresh_token;
        const accessToken = session.access_token;
        
        if (refreshToken && accessToken) {
          cookieStore.set(`sb-${process.env.NEXT_PUBLIC_SUPABASE_PROJECT_REF}-auth-token`, JSON.stringify({
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_at: session.expires_at,
            token_type: 'bearer',
            user: session.user
          }), {
            domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN || '.lvh.me',
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7
          });
        }
      }
    } else {
      return { error: 'Sign up failed: No user data returned from Supabase.' };
    }
    
    // Return success without redirect
    return { success: true };
    
  } catch (error: any) {
    console.error('Sign up failed:', error.message);
    return { error: error.message };
  }
}

export async function signOut() {
  const supabase = await createServerSupabaseClient();
  
  try {
    await sharedSignOut(supabase);
    
    // Clear debug cookie
    const cookieStore = await cookies();
    cookieStore.delete('auth-debug');
    
    console.log('Sign out successful');
  } catch (error) {
    console.error('Sign out error:', error);
  }
  
  // Revalidate dan redirect
  revalidatePath('/', 'layout');
  
  // Redirect ke halaman signin
  const loginUrl = `${process.env.NEXT_PUBLIC_MAIN_APP_URL || 'http://main.lvh.me:3000'}/signin`;
  redirect(loginUrl);
}