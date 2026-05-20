export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col bg-stone-50 font-serif">
      <header className="w-full flex-shrink-0 border-b border-stone-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-8 text-center">
          <div className="mx-auto mb-4 h-10 w-48 animate-pulse rounded bg-stone-200" />
          <div className="mx-auto h-5 w-80 animate-pulse rounded bg-stone-100" />
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-7xl flex-1 px-4 pt-6">
        <div className="grid w-full gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-lg border border-stone-200 bg-white p-4">
                <div className="mb-3 h-5 w-3/4 animate-pulse rounded bg-stone-200" />
                <div className="mb-2 h-4 w-1/2 animate-pulse rounded bg-stone-100" />
                <div className="h-4 w-full animate-pulse rounded bg-stone-100" />
              </div>
            ))}
          </div>
          <div className="h-96 animate-pulse rounded-lg bg-stone-100" />
        </div>
      </div>
    </div>
  )
}
