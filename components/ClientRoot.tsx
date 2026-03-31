"use client"
import { useSupabaseUser } from '@/hooks/useSupabaseUser'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import ProfileOnboardingModal from '@/components/ProfileOnboardingModal'
import { supabase } from '@/lib/supabaseClient'
import NavBar from '@/components/NavBar'
import SupportBanner from '@/components/SupportBanner'
import Footer from '@/components/Footer'
import { WelcomeToZineMapModal } from '@/components/WelcomeToZineMapModal'

export default function ClientRoot({ children }: { children: React.ReactNode }) {
  const { user, loading } = useSupabaseUser();
  const pathname = usePathname();
  const [showModal, setShowModal] = useState(false);
  const [profileChecked, setProfileChecked] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  const welcomeModalPaths = ['/', '/shops', '/stores', '/libraries', '/events', '/zines', '/stories'];
  const shouldShowWelcomeOnPath = welcomeModalPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));

  useEffect(() => {
    if (!loading && user) {
      // Check if profile exists for this user
      const checkProfile = async () => {
        try {
          // First check localStorage to see if we already know this user has a profile
          const hasProfileKey = `hasProfile_${user.id}`;
          const hasProfile = localStorage.getItem(hasProfileKey);
          
          if (hasProfile === 'true') {
            // We already know this user has a profile, don't show modal
            setShowModal(false);
            setProfileChecked(true);
            return;
          }

          const { data, error } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', user.id)
            .single();
          
          // Only show modal if profile doesn't exist AND there's no error
          // This prevents showing modal for existing users during network issues
          if (error && error.code !== 'PGRST116') {
            // If it's not a "not found" error, don't show modal
            // This handles network errors, auth errors, etc.
            console.warn('Profile check error:', error);
            setShowModal(false);
          } else {
            setShowModal(!data);
            // If profile exists, remember it in localStorage
            if (data) {
              localStorage.setItem(hasProfileKey, 'true');
            }
          }
          setProfileChecked(true);
        } catch (err: unknown) {
          // Handle any unexpected errors - don't show modal
          console.warn('Profile check failed:', err);
          setShowModal(false);
          setProfileChecked(true);
        }
      };
      
      checkProfile();
    } else if (!loading && !user) {
      // User is not logged in, don't show modal
      setShowModal(false);
      setProfileChecked(false);
    }
  }, [user, loading]);

  useEffect(() => {
    if (loading) return;
    setShowWelcomeModal(!user && shouldShowWelcomeOnPath);
  }, [loading, user, shouldShowWelcomeOnPath]);

  const handleOnboardingComplete = () => {
    // Remember that this user now has a profile
    if (user?.id) {
      localStorage.setItem(`hasProfile_${user.id}`, 'true');
    }
    setShowModal(false);
    window.location.reload();
  };

  return (
    <>
      <NavBar />
      <SupportBanner />
      <ProfileOnboardingModal user={user} show={showModal && profileChecked} onComplete={handleOnboardingComplete} />
      <WelcomeToZineMapModal open={showWelcomeModal} onOpenChange={setShowWelcomeModal} />
      <div className="flex flex-col min-h-screen">
        <div className="flex-grow pt-16 md:pt-20">{children}</div>
        <Footer />
      </div>
    </>
  );
} 