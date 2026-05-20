"use client"

import Link from "next/link"
import Image from "next/image"
import { useSupabaseUser } from "@/hooks/useSupabaseUser"
import { supabase } from "@/lib/supabaseClient"
import { useRouter, usePathname } from "next/navigation"
import { useCallback, useState, useEffect } from "react"
import { LogIn, LogOut } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function NavBar() {
  const { user, loading } = useSupabaseUser();
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setProfileImage(null);
      return;
    }
    supabase
      .from('profiles')
      .select('profile_image')
      .eq('id', user.id)
      .single()
      .then(({ data }) => setProfileImage(data?.profile_image || null));
  }, [user?.id]);

  useEffect(() => {
    const loadAdminRole = async () => {
      if (!user?.id) {
        setIsAdmin(false);
        return;
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Failed to fetch admin role:", error);
        setIsAdmin(false);
        return;
      }
      setIsAdmin(Boolean(data?.is_admin));
    };

    loadAdminRole();
  }, [user?.id]);
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  
  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    router.refresh();
    setMobileMenuOpen(false);
    setLogoutDialogOpen(false);
  }, [router]);

  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/';
    }
    // Use exact match for paths that might conflict
    if (path === '/zines' || path === '/zinesters') {
      return pathname === path;
    }
    return pathname.startsWith(path);
  };

  // Get the current active page name
  const getActivePageName = () => {
    if (isActive('/map')) return 'Map';
    if (isActive('/stores')) return 'Shops';
    if (isActive('/libraries')) return 'Libraries';
    if (isActive('/events')) return 'Events';
    if (isActive('/zines')) return 'Zines';
    if (isActive('/zinesters')) return 'Zinesters';
    if (isActive('/stories')) return 'Stories';
    return null;
  };

  const activePageName = getActivePageName();
  return (
    <nav className="fixed top-0 left-0 right-0 w-full bg-white border-b border-stone-200 shadow-sm font-serif z-50">
      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Desktop Layout */}
        <div className="hidden lg:flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 text-2xl font-bold text-stone-800 hover:text-rose-600 transition-colors font-gloria">
              <Image 
                src="/favicon.svg" 
                alt="ZineMap Logo" 
                width={32} 
                height={32}
                className="w-8 h-8"
                priority
              />
              ZineMap
            </Link>
            <div className="flex items-center gap-6">
              <Link
                href="/map"
                className={`font-gloria text-lg transition-all duration-200 hover:scale-105 ${
                  isActive('/map')
                    ? 'text-stone-900 font-bold'
                    : 'text-stone-700 hover:text-stone-900'
                }`}
              >
                Map
              </Link>
              <Link 
                href="/stores" 
                className={`font-gloria text-lg transition-all duration-200 hover:scale-105 ${
                  isActive('/stores') 
                    ? 'text-rose-600 font-bold' 
                    : 'text-stone-700 hover:text-rose-600'
                }`}
              >
                Shops
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
              <Link 
                href="/zines" 
                className={`font-gloria text-lg transition-all duration-200 hover:scale-105 ${
                  isActive('/zines') 
                    ? 'text-purple-600 font-bold' 
                    : 'text-stone-700 hover:text-purple-600'
                }`}
              >
                Zines
              </Link>
              <Link 
                href="/zinesters" 
                className={`font-gloria text-lg transition-all duration-200 hover:scale-105 ${
                  isActive('/zinesters') 
                    ? 'text-amber-600 font-bold' 
                    : 'text-stone-700 hover:text-amber-600'
                }`}
              >
                Zinesters
              </Link>
              <Link 
                href="/stories" 
                className={`font-gloria text-lg transition-all duration-200 hover:scale-105 flex items-center gap-2 ${
                  isActive('/stories') 
                    ? 'text-stone-800 font-bold' 
                    : 'text-stone-700 hover:text-stone-800'
                }`}
              >
                Stories
                <span className="text-xs bg-rose-500 text-white px-1.5 py-0.5 rounded font-bold font-sans">
                  NEW
                </span>
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!loading && user && (
              <>
                {isAdmin && (
                  <Link href="/admin" className="text-stone-700 hover:text-rose-600 font-gloria text-lg transition-all duration-200 hover:scale-105">Admin</Link>
                )}
                <Link href="/profile" className="rounded-full transition-all duration-200 hover:scale-105 hover:shadow-md" aria-label="My profile">
                  <Avatar className="h-9 w-9 border-2 border-stone-300">
                    <AvatarImage src={profileImage || undefined} alt="" />
                    <AvatarFallback className="bg-stone-200 text-stone-600 text-sm">
                      {user.email?.[0]?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                </Link>
              </>
            )}
            {!loading && !user && (
              <Link href="/login" className="font-gloria text-lg transition-all duration-200 hover:scale-105 text-stone-700 hover:text-rose-600">
                Log in
              </Link>
            )}
            {!loading && user && (
              <button
                type="button"
                onClick={() => setLogoutDialogOpen(true)}
                className="p-2 rounded-md hover:bg-stone-100 transition-colors"
                aria-label="Log out"
              >
                <LogOut className="h-5 w-5 text-stone-600" />
              </button>
            )}
          </div>
        </div>

        {/* Mobile Layout - Hamburger Menu */}
        <div className="lg:hidden">
          {/* Top row: Logo + Active Page + Hamburger */}
          <div className="flex items-center justify-between">
            <Link 
              href="/" 
              className="flex items-center gap-2 text-xl font-bold text-stone-800 hover:text-rose-600 transition-colors font-gloria"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Image 
                src="/favicon.svg" 
                alt="ZineMap Logo" 
                width={24} 
                height={24}
                className="w-6 h-6"
                priority
              />
              ZineMap
            </Link>
            
            <div className="flex items-center gap-3">
              {/* Show current active page name */}
              {activePageName && (
                <span className="text-sm font-gloria text-stone-600 font-semibold">
                  {activePageName}
                </span>
              )}
              
              {/* Hamburger Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="flex flex-col gap-1.5 p-2 rounded-md hover:bg-stone-100 transition-colors"
                aria-label="Toggle menu"
                aria-expanded={mobileMenuOpen}
              >
                <span className={`w-6 h-0.5 bg-stone-700 transition-all duration-300 ${mobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
                <span className={`w-6 h-0.5 bg-stone-700 transition-all duration-300 ${mobileMenuOpen ? 'opacity-0' : ''}`}></span>
                <span className={`w-6 h-0.5 bg-stone-700 transition-all duration-300 ${mobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
              </button>
            </div>
          </div>

          {/* Mobile Menu Dropdown */}
          {mobileMenuOpen && (
            <div className="mt-4 pb-4 border-t border-stone-200 pt-4 animate-in slide-in-from-top-2 duration-200">
              <div className="flex flex-col gap-1">
                {/* Navigation Links */}
                <Link
                  href="/map"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`font-gloria text-base py-2.5 px-3 rounded-md transition-all ${
                    isActive('/map')
                      ? 'text-stone-900 font-bold bg-stone-100'
                      : 'text-stone-700 hover:text-stone-900 hover:bg-stone-50'
                  }`}
                >
                  Map
                </Link>
                <Link 
                  href="/stores" 
                  onClick={() => setMobileMenuOpen(false)}
                  className={`font-gloria text-base py-2.5 px-3 rounded-md transition-all ${
                    isActive('/stores') 
                      ? 'text-rose-600 font-bold bg-rose-50' 
                      : 'text-stone-700 hover:text-rose-600 hover:bg-stone-50'
                  }`}
                >
                  Shops
                </Link>
                <Link 
                  href="/libraries" 
                  onClick={() => setMobileMenuOpen(false)}
                  className={`font-gloria text-base py-2.5 px-3 rounded-md transition-all ${
                    isActive('/libraries') 
                      ? 'text-blue-600 font-bold bg-blue-50' 
                      : 'text-stone-700 hover:text-blue-600 hover:bg-stone-50'
                  }`}
                >
                  Libraries
                </Link>
                <Link 
                  href="/events" 
                  onClick={() => setMobileMenuOpen(false)}
                  className={`font-gloria text-base py-2.5 px-3 rounded-md transition-all ${
                    isActive('/events') 
                      ? 'text-[#009035] font-bold bg-green-50' 
                      : 'text-stone-700 hover:text-[#009035] hover:bg-stone-50'
                  }`}
                >
                  Events
                </Link>
                <Link 
                  href="/zines" 
                  onClick={() => setMobileMenuOpen(false)}
                  className={`font-gloria text-base py-2.5 px-3 rounded-md transition-all ${
                    isActive('/zines') 
                      ? 'text-purple-600 font-bold bg-purple-50' 
                      : 'text-stone-700 hover:text-purple-600 hover:bg-stone-50'
                  }`}
                >
                  Zines
                </Link>
                <Link 
                  href="/zinesters" 
                  onClick={() => setMobileMenuOpen(false)}
                  className={`font-gloria text-base py-2.5 px-3 rounded-md transition-all ${
                    isActive('/zinesters') 
                      ? 'text-amber-600 font-bold bg-amber-50' 
                      : 'text-stone-700 hover:text-amber-600 hover:bg-stone-50'
                  }`}
                >
                  Zinesters
                </Link>
                <Link 
                  href="/stories" 
                  onClick={() => setMobileMenuOpen(false)}
                  className={`font-gloria text-base py-2.5 px-3 rounded-md transition-all flex items-center gap-2 ${
                    isActive('/stories') 
                      ? 'text-stone-800 font-bold bg-stone-100' 
                      : 'text-stone-700 hover:text-stone-800 hover:bg-stone-50'
                  }`}
                >
                  Stories
                  <span className="text-xs bg-rose-500 text-white px-1.5 py-0.5 rounded font-bold font-sans">
                    NEW
                  </span>
                </Link>
                {/* Divider */}
                <div className="h-px bg-stone-200 my-2"></div>
                
                {/* User Actions */}
                {!loading && user && (
                  <>
                    {isAdmin && (
                      <Link 
                        href="/admin" 
                        onClick={() => setMobileMenuOpen(false)}
                        className="font-gloria text-base py-2.5 px-3 rounded-md text-stone-700 hover:text-rose-600 hover:bg-stone-50 transition-all"
                      >
                        Admin
                      </Link>
                    )}
                    <Link 
                      href="/profile" 
                      onClick={() => setMobileMenuOpen(false)}
                      className="font-gloria text-base py-2.5 px-3 rounded-md text-stone-700 hover:text-rose-600 hover:bg-stone-50 transition-all flex items-center gap-2"
                    >
                      <Avatar className="h-6 w-6 border-2 border-stone-300">
                        <AvatarImage src={profileImage || undefined} alt="" />
                        <AvatarFallback className="bg-stone-200 text-stone-600 text-xs">
                          {user.email?.[0]?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      My profile
                    </Link>
                    <button
                      type="button"
                      onClick={() => setLogoutDialogOpen(true)}
                      className="font-gloria text-base py-2.5 px-3 rounded-md text-left text-stone-700 hover:text-stone-900 hover:bg-stone-50 transition-all flex items-center gap-2"
                    >
                      <LogOut className="h-4 w-4" />
                      Log out
                    </button>
                  </>
                )}
                {!loading && !user && (
                  <Link 
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 font-gloria text-base py-2.5 px-3 rounded-md text-stone-700 hover:bg-stone-50 transition-all"
                  >
                    <LogIn className="h-4 w-4" />
                    Log in
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <AlertDialogContent className="font-sans sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to log off?</AlertDialogTitle>
            <AlertDialogDescription className="text-stone-600">
              You&apos;ll need to sign in again to access your profile and submit new listings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-sans">Stay signed in</AlertDialogCancel>
            <AlertDialogAction
              type="button"
              className="font-sans bg-white text-stone-900 border border-stone-300 hover:bg-stone-50"
              onClick={() => void handleLogout()}
            >
              Log out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </nav>
  )
} 