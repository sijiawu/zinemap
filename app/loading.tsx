export default function Loading() {
  return (
    <div className="flex flex-col flex-1 bg-stone-50 font-serif min-h-0">
      <header className="w-full bg-white border-b border-stone-200 shadow-sm flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-8 text-center">
          <div className="h-10 w-48 bg-stone-200 rounded mx-auto mb-4 animate-pulse" />
          <div className="h-5 w-80 bg-stone-100 rounded mx-auto animate-pulse" />
        </div>
      </header>
      <div className="flex-1 max-w-7xl mx-auto px-4 pt-6 w-full">
        <div className="h-12 bg-stone-100 rounded-xl mb-6 animate-pulse" />
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg border border-stone-200 p-4 animate-pulse">
                <div className="h-5 w-3/4 bg-stone-200 rounded mb-3" />
                <div className="h-4 w-1/2 bg-stone-100 rounded mb-2" />
                <div className="h-4 w-full bg-stone-100 rounded" />
              </div>
            ))}
          </div>
          <div className="h-96 bg-stone-100 rounded-lg animate-pulse" />
        </div>
      </div>
    </div>
  )
}
