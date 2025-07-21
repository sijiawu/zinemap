"use client"

import Link from "next/link"
import { useSupabaseUser } from "@/hooks/useSupabaseUser"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"
import { useCallback } from "react"

export default function NavBar() {
  const { user, loading } = useSupabaseUser();
  const router = useRouter();
  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    router.refresh();
  }, [router]);
  return (
    <nav className="w-full bg-white border-b border-stone-200 shadow-sm font-serif">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-2xl font-bold text-stone-800 hover:text-rose-600 transition-colors">ZineMap</Link>
        </div>
        <div className="flex items-center gap-4">
          {!loading && user && (
            <Link href="/dashboard" className="text-stone-700 hover:text-rose-600 font-medium transition-colors">Dashboard</Link>
          )}
          {!loading && !user && (
            <Link href="/login">
              <button className="ml-2 px-3 py-1 rounded bg-rose-500 text-white font-medium hover:bg-rose-600 transition-colors">Login</button>
            </Link>
          )}
          {!loading && user && (
            <button
              onClick={handleLogout}
              className="ml-2 px-3 py-1 rounded bg-stone-300 text-stone-800 font-medium hover:bg-stone-400 transition-colors"
            >
              Log out
            </button>
          )}
        </div>
      </div>
    </nav>
  )
} 