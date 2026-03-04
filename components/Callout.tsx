import { ReactNode } from 'react'

interface CalloutProps {
  children: ReactNode
  variant?: 'default' | 'highlight'
}

export function Callout({ children, variant = 'default' }: CalloutProps) {
  if (variant === 'highlight') {
    return (
      <blockquote className="my-8 sm:my-12 pl-6 pr-8 py-6 bg-rose-50/70 rounded-r-xl border-l-4 border-rose-500 shadow-sm [&_p]:mb-0">
        <p className="text-lg font-serif font-bold text-stone-800 italic leading-relaxed text-justify">
          {children}
        </p>
      </blockquote>
    )
  }

  return (
    <div className="my-8 sm:my-12 p-6 bg-stone-50 border border-stone-200 rounded-lg">
      <div className="prose prose-stone max-w-none font-serif">
        {children}
      </div>
    </div>
  )
}

