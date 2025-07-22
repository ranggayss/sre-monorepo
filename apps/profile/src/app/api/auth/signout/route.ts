// app/api/auth/signout/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@sre-monorepo/lib'
import { redirect } from 'next/navigation';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    // Sign out dari Supabase
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error("Supabase signOut error:", error)
      return NextResponse.json({ error: "Failed to sign out" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Sign out error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}


// GET endpoint - always redirect
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      console.error('Supabase signout error:', error)
    }
    
    return NextResponse.redirect(new URL('/signin', request.url))
  } catch (error) {
    console.error('Sign out error:', error)
    return NextResponse.redirect(new URL('/signin', request.url))
  }
}