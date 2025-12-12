import { ReactNode } from 'react'

interface CalloutProps {
  children: ReactNode
  variant?: 'default' | 'highlight'
}

export function Callout({ children, variant = 'default' }: CalloutProps) {
  if (variant === 'highlight') {
    return (
      <blockquote className="my-8 sm:my-12 border-l-4 border-rose-500 pl-6 py-4 bg-rose-50/50 rounded-r-lg">
        <p className="text-xl sm:text-2xl font-serif font-semibold text-stone-800 italic leading-relaxed text-justify">
          {children}
        </p>
      </blockquote>
    )
  }

  return (
    <div className="my-8 sm:my-12 p-6 bg-stone-50 border border-stone-200 rounded-lg">
      <div className="prose prose-stone max-w-none text-justify font-serif">
        {children}
      </div>
    </div>
  )
}

