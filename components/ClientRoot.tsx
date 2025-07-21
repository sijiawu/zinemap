"use client"
import { useSupabaseUser } from '@/hooks/useSupabaseUser'
import { useEffect, useState } from 'react'
import ProfileOnboardingModal from '@/components/ProfileOnboardingModal'
import { supabase } from '@/lib/supabaseClient'
import NavBar from '@/components/NavBar'

export default function ClientRoot({ children }: { children: React.ReactNode }) {
  const { user, loading } = useSupabaseUser();
  const [showModal, setShowModal] = useState(false);
  const [profileChecked, setProfileChecked] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      // Check if profile exists for this user
      supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          setShowModal(!data);
          setProfileChecked(true);
        });
    } else {
      setShowModal(false);
      setProfileChecked(false);
    }
  }, [user, loading]);

  const handleOnboardingComplete = () => {
    setShowModal(false);
    window.location.reload();
  };

  return (
    <>
      <NavBar />
      <ProfileOnboardingModal user={user} show={showModal && profileChecked} onComplete={handleOnboardingComplete} />
      <div>{children}</div>
    </>
  );
} 