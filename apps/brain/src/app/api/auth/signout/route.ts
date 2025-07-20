import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@sre-monorepo/lib"

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
