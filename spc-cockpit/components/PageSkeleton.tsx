function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-gray-200 ${className}`} />;
}

export function PageSkeleton({ title = "" }: { title?: string }) {
  return (
    <>
      {/* Desktop topbar */}
      <div className="hidden md:flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-white h-[52px]">
        <div className="flex items-center gap-3">
          <Pulse className="w-20 h-3" />
          <Pulse className="w-32 h-4" />
        </div>
        <Pulse className="w-16 h-5 rounded-full" />
      </div>

      {/* Mobile header */}
      <div className="md:hidden px-4 pt-5 pb-4" style={{ background: "#1a6b7e" }}>
        <Pulse className="w-40 h-6 bg-white/30 mb-2" />
        <Pulse className="w-24 h-3 bg-white/20" />
      </div>

      {/* Content skeleton */}
      <div className="flex-1 overflow-hidden p-4 md:p-5 space-y-3">
        {/* Mobile: 2×2 KPI grid */}
        <div className="md:hidden grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-4 space-y-2 border border-gray-100">
              <Pulse className="w-10 h-6" />
              <Pulse className="w-16 h-3" />
            </div>
          ))}
        </div>
        {/* Mobile: list cards */}
        <div className="md:hidden space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-4 space-y-2 border border-gray-100">
              <Pulse className="w-3/4 h-4" />
              <Pulse className="w-1/2 h-3" />
            </div>
          ))}
        </div>

        {/* Desktop: table skeleton */}
        <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex gap-4">
            {[120, 80, 60, 100].map((w, i) => (
              <Pulse key={i} className={`h-3 w-[${w}px]`} />
            ))}
          </div>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="px-4 py-3 border-b border-gray-50 flex gap-4 items-center">
              <Pulse className="w-32 h-3" />
              <Pulse className="w-20 h-3" />
              <Pulse className="w-16 h-3" />
              <Pulse className="w-12 h-5 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
