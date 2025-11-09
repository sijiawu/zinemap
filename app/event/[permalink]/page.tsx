import { Metadata } from 'next'
import { cache } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { generateEventMetadata, generateEventStructuredData } from '@/lib/seo'
import EventDetailClient from './EventDetailClient'

// Cache the event fetch to avoid duplicate queries
const getEvent = cache(async (id: string) => {
  const { data, error } = await supabase
          .from('events')
          .select('*')
    .or(`permalink.eq.${id},id.eq.${id}`)
          .eq('approved', true)
          .single()
        
  if (error || !data) {
    return null
  }

  return data
})

export async function generateMetadata({ params }: { params: Promise<{ permalink: string }> }): Promise<Metadata> {
  const { permalink } = await params
  const event = await getEvent(permalink)

    if (!event) {
    return {
      title: 'Event Not Found - ZineMap',
      description: 'The requested event could not be found.',
    }
  }

  return generateEventMetadata(event)
}

export default async function EventDetailPage({ params }: { params: Promise<{ permalink: string }> }) {
  const { permalink } = await params
  const event = await getEvent(permalink)
  const structuredData = event ? generateEventStructuredData(event) : null
                  
                  return (
                    <>
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      )}
      <EventDetailClient eventId={permalink} />
    </>
  )
}
