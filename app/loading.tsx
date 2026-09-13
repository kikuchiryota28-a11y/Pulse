export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-24 pt-10 md:px-8 md:pt-14" aria-busy="true" aria-label="Loading">
      <div className="mb-12 space-y-3">
        <div className="h-3 w-24 animate-pulse rounded-full bg-[#111114]" />
        <div className="h-9 w-full max-w-2xl animate-pulse rounded-xl bg-[#111114]" />
      </div>
      <div className="space-y-12">
        {[0, 1, 2].map((item) => (
          <div key={item} className="overflow-hidden rounded-2xl bg-[#111114]">
            <div className="aspect-[16/10] animate-pulse bg-[#111114]" />
            <div className="space-y-3 p-5 sm:p-7">
              <div className="h-7 w-4/5 animate-pulse rounded-lg bg-[#161619]" />
              <div className="h-4 w-32 animate-pulse rounded-lg bg-[#161619]" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
