export default function Loading() {
  return (
    <div className="min-h-screen bg-stone-50">
      <section className="border-b border-stone-200 bg-[#faf8f5]">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:gap-12 sm:px-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-center lg:px-8 lg:py-14">
          <div className="space-y-5">
            <div className="h-7 w-28 animate-pulse rounded-full bg-stone-200" />
            <div className="space-y-3">
              <div className="h-11 w-full max-w-xl animate-pulse rounded-lg bg-stone-200" />
              <div className="h-11 w-5/6 max-w-md animate-pulse rounded-lg bg-stone-200" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-full max-w-lg animate-pulse rounded bg-stone-100" />
              <div className="h-4 w-4/5 max-w-md animate-pulse rounded bg-stone-100" />
            </div>
            <div className="flex flex-wrap gap-3 pt-1">
              <div className="h-10 w-40 animate-pulse rounded-full bg-stone-300" />
              <div className="h-10 w-36 animate-pulse rounded-full bg-stone-200" />
            </div>
            <div className="h-4 w-52 animate-pulse rounded bg-stone-100" />
          </div>
          <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div className="h-5 w-24 animate-pulse rounded-full bg-stone-100" />
              <div className="h-8 w-36 animate-pulse rounded-full bg-stone-200" />
            </div>
            <div className="h-[18rem] animate-pulse rounded-2xl bg-stone-100 sm:h-[20rem]" />
          </div>
        </div>
      </section>

      <main className="mx-auto w-full max-w-6xl space-y-10 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        {[1, 2, 3].map((section) => (
          <section key={section} className="space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-2">
                <div className="h-7 w-44 animate-pulse rounded bg-stone-200" />
                <div className="h-4 w-64 animate-pulse rounded bg-stone-100" />
              </div>
              <div className="h-9 w-36 animate-pulse rounded-full bg-stone-200" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((card) => (
                <div key={`${section}-${card}`} className="space-y-3 rounded-2xl border border-stone-200 bg-white p-4">
                  <div className="h-40 animate-pulse rounded-xl bg-stone-100" />
                  <div className="h-4 w-2/3 animate-pulse rounded bg-stone-200" />
                  <div className="h-3 w-full animate-pulse rounded bg-stone-100" />
                  <div className="h-3 w-3/4 animate-pulse rounded bg-stone-100" />
                </div>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  )
}
