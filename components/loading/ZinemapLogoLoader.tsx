interface ZinemapLogoLoaderProps {
  compact?: boolean
}

export function ZinemapLogoLoader({ compact = false }: ZinemapLogoLoaderProps) {
  const logoSize = compact ? 40 : 52

  return (
    <div className="flex flex-col items-center gap-2">
      <svg
        width={logoSize}
        height={logoSize}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="ZineMap logo"
        className="block"
      >
        <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#f43f5e" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M2 17L12 22L22 17" stroke="#f43f5e" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M2 12L12 17L22 12" stroke="#f43f5e" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="font-gloria text-2xl text-stone-700">ZineMap</span>
    </div>
  )
}
