import { Metadata } from 'next'
import { cache } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { generateEventMetadata, generateEventStructuredData } from '@/lib/seo'
import type { Event } from '@/lib/types'
import EventDetailClient from './EventDetailClient'

const getEvent = cache(async (id: string): Promise<Event | null> => {
  const { data: eventByPermalink } = await supabase
    .from('events')
    .select('*')
    .eq('permalink', id)
    .eq('approved', true)
    .limit(1)
    .maybeSingle()

  if (eventByPermalink) return eventByPermalink

  const { data: eventById } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .eq('approved', true)
    .maybeSingle()

  return eventById
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
