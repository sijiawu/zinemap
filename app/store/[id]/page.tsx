import { Metadata } from 'next'
import { cache } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { generateStoreMetadata, generateStoreStructuredData } from '@/lib/seo'
import StoreDetailClient from './StoreDetailClient'

// Cache the store fetch to avoid duplicate queries
const getStore = cache(async (id: string) => {
  const { data, error } = await supabase


  .from('stores')
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
  const store = await getStore(id)

  if (!store) {
    return {
      title: 'Shop Not Found - ZineMap',
      description: 'The requested shop could not be found.',
    }
  }

  return generateStoreMetadata(store)
}

export default async function StoreDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const store = await getStore(id)
  const structuredData = store ? generateStoreStructuredData(store) : null

  return (
    <>
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      )}
      <StoreDetailClient storeId={id} />
    </>
  )
}
