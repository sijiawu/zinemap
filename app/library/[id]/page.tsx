import { Metadata } from 'next'
import { cache } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { generateLibraryMetadata, generateLibraryStructuredData } from '@/lib/seo'
import LibraryDetailClient from './LibraryDetailClient'

// Cache the library fetch to avoid duplicate queries
const getLibrary = cache(async (id: string) => {
  const { data, error } = await supabase
    .from('libraries')
    .select('*')
    .or(`permalink.eq.${id},id.eq.${id}`)
    .eq('approved', true)
    .single()

  if (error || !data) {
    return null
  }

  return data
})

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const library = await getLibrary(id)

  if (!library) {
    return {
      title: 'Library Not Found - ZineMap',
      description: 'The requested library could not be found.',
    }
  }

  return generateLibraryMetadata(library)
}

export default async function LibraryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const library = await getLibrary(id)
  const structuredData = library ? generateLibraryStructuredData(library) : null

  return (
    <>
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      )}
      <LibraryDetailClient libraryId={id} />
    </>
  )
}
