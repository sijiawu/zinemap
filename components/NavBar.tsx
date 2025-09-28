"use client"

import Link from "next/link"
import { useSupabaseUser } from "@/hooks/useSupabaseUser"
import { supabase } from "@/lib/supabaseClient"
import { useRouter, usePathname } from "next/navigation"
import { useCallback } from "react"

export default function NavBar() {
  const { user, loading } = useSupabaseUser();
  const router = useRouter();
  const pathname = usePathname();
  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    router.refresh();
  }, [router]);

  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(path);
  };
  return (
    <nav className="w-full bg-white border-b border-stone-200 shadow-sm font-serif">
      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Desktop Layout */}
        <div className="hidden md:flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-2xl font-bold text-stone-800 hover:text-rose-600 transition-colors font-gloria">ZineMap</Link>
            <div className="flex items-center gap-6">
              <Link 
                href="/stores" 
                className={`font-gloria text-lg transition-all duration-200 hover:scale-105 ${
                  isActive('/stores') 
                    ? 'text-rose-600 font-bold' 
                    : 'text-stone-700 hover:text-rose-600'
                }`}
              >
                Stores
              </Link>
              <Link 
                href="/libraries" 
                className={`font-gloria text-lg transition-all duration-200 hover:scale-105 ${
                  isActive('/libraries') 
                    ? 'text-blue-600 font-bold' 
                    : 'text-stone-700 hover:text-blue-600'
                }`}
              >
                Libraries
              </Link>
              <Link 
                href="/events" 
                className={`font-gloria text-lg transition-all duration-200 hover:scale-105 ${
                  isActive('/events') 
                    ? 'text-[#009035] font-bold' 
                    : 'text-stone-700 hover:text-[#009035]'
                }`}
              >
                Events
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {!loading && user && (
              <>
                {user.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL && (
                  <Link href="/admin" className="text-stone-700 hover:text-rose-600 font-gloria text-lg transition-all duration-200 hover:scale-105">Admin</Link>
                )}
                <Link href="/profile" className="text-stone-700 hover:text-rose-600 font-gloria text-lg transition-all duration-200 hover:scale-105">Profile</Link>
              </>
            )}
            {!loading && !user && (
              <Link href="/login">
                <button className="px-4 py-2 rounded bg-stone-800 hover:bg-stone-900 text-white font-medium transition-colors">Log In</button>
              </Link>
            )}
            {!loading && user && (
              <button
                onClick={handleLogout}
                className="px-3 py-2 rounded bg-stone-300 text-stone-800 font-gloria hover:bg-stone-400 transition-colors"
              >
                Log out
              </button>
            )}
          </div>
        </div>

        {/* Mobile Layout - Sandwich */}
        <div className="md:hidden flex flex-col gap-3">
          {/* Top row: Logo + Profile */}
          <div className="flex items-center justify-between">
            <Link href="/" className="text-xl font-bold text-stone-800 hover:text-rose-600 transition-colors font-gloria">ZineMap</Link>
            <div className="flex items-center gap-2">
              {!loading && user && (
                <>
                  {user.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL && (
                    <Link href="/admin" className="text-stone-700 hover:text-rose-600 font-gloria text-base transition-all duration-200 hover:scale-105">Admin</Link>
                  )}
                  <Link href="/profile" className="text-stone-700 hover:text-rose-600 font-gloria text-base transition-all duration-200 hover:scale-105">Profile</Link>
                </>
              )}
              {!loading && !user && (
                <Link href="/login">
                  <button className="px-3 py-1.5 rounded bg-stone-800 hover:bg-stone-900 text-white font-medium text-sm transition-colors">Log In</button>
                </Link>
              )}
              {!loading && user && (
                <button
                  onClick={handleLogout}
                  className="px-2 py-1.5 rounded bg-stone-300 text-stone-800 font-gloria text-sm hover:bg-stone-400 transition-colors"
                >
                  Log out
                </button>
              )}
            </div>
          </div>
          
          {/* Bottom row: Subpages */}
          <div className="flex items-center justify-center gap-4">
            <Link 
              href="/stores" 
              className={`font-gloria text-base transition-all duration-200 hover:scale-105 ${
                isActive('/stores') 
                  ? 'text-rose-600 font-bold' 
                  : 'text-stone-700 hover:text-rose-600'
              }`}
            >
              Stores
            </Link>
            <Link 
              href="/libraries" 
              className={`font-gloria text-base transition-all duration-200 hover:scale-105 ${
                isActive('/libraries') 
                  ? 'text-blue-600 font-bold' 
                  : 'text-stone-700 hover:text-blue-600'
              }`}
            >
              Libraries
            </Link>
            <Link 
              href="/events" 
              className={`font-gloria text-base transition-all duration-200 hover:scale-105 ${
                isActive('/events') 
                  ? 'text-[#009035] font-bold' 
                  : 'text-stone-700 hover:text-[#009035]'
              }`}
            >
              Events
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
} 