import { Metadata } from 'next'
import { cache } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { generateProfileMetadata, generateProfileStructuredData } from '@/lib/seo'
import ProfileDetailClient from './ProfileDetailClient'

// Cache the profile fetch to avoid duplicate queries
const getProfile = cache(async (permalink: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('permalink', permalink)
    .single()

  if (error || !data) {
    return null
  }

  return data
})

export async function generateMetadata({ params }: { params: Promise<{ permalink: string }> }): Promise<Metadata> {
  const { permalink } = await params
  const profile = await getProfile(permalink)

  if (!profile) {
    return {
      title: 'Profile Not Found - ZineMap',
      description: 'The requested profile could not be found.',
    }
  }

  return generateProfileMetadata(profile)
}

export default async function ProfileDetailPage({ params }: { params: Promise<{ permalink: string }> }) {
  const { permalink } = await params
  const profile = await getProfile(permalink)
  const structuredData = profile ? generateProfileStructuredData(profile) : null

  return (
    <>
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      )}
      <ProfileDetailClient profileId={permalink} />
    </>
  )
}
