'use client'

import { useState, ReactNode } from 'react'

type Lang = 'pl' | 'en' | 'fr'

// Message (in target language) when offering to switch. [viewingLang][offerLang]
const MESSAGES: Record<Lang, Partial<Record<Lang, { message: string; button: string }>>> = {
  en: {
    pl: { message: 'Ten artykuł jest również dostępny po polsku.', button: 'Przeczytaj po polsku' },
    fr: { message: "Cet entretien a été mené en français. ", button: 'Lire en français' },
  },
  pl: { en: { message: 'This article is also available in English.', button: 'Read in English' } },
  fr: { en: { message: 'This interview was carried out in French. The article is also available in English.', button: 'Read in English' } },
}

interface TranslationToggleProps {
  primaryLang: Lang
  translationLang: Lang
  contentPrimary: ReactNode
  contentTranslation: ReactNode
}

export function TranslationToggle({
  primaryLang,
  translationLang,
  contentPrimary,
  contentTranslation,
}: TranslationToggleProps) {
  const [showTranslation, setShowTranslation] = useState(false)
  const currentLang = showTranslation ? translationLang : primaryLang
  const offerLang = showTranslation ? primaryLang : translationLang
  const texts = MESSAGES[currentLang]?.[offerLang]

  if (!texts) return null

  return (
    <div>
      <div className="mb-10 border-l-4 border-rose-500 pl-5 py-4 bg-rose-50/40 rounded-r-xl font-serif">
        <p className="text-stone-700 text-sm sm:text-base mb-3">{texts.message}</p>
        <button
          type="button"
          onClick={() => setShowTranslation(!showTranslation)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 text-white text-sm font-medium rounded-lg hover:bg-rose-700 transition-colors cursor-pointer shadow-sm"
        >
          {texts.button}
        </button>
      </div>
      {showTranslation ? contentTranslation : contentPrimary}
    </div>
  )
}
