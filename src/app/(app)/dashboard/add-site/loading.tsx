export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-48 bg-gray-200 rounded mb-2" />
      <div className="h-4 w-72 bg-gray-200 rounded mb-8" />

      {/* Stepper skeleton */}
      <div className="flex items-center justify-center gap-4 mb-10">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-200 rounded-full" />
            <div className="h-4 w-20 bg-gray-200 rounded" />
          </div>
        ))}
      </div>

      {/* Plan card placeholders */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card p-6">
            <div className="h-5 w-24 bg-gray-200 rounded mb-3" />
            <div className="h-8 w-20 bg-gray-200 rounded mb-4" />
            <div className="h-4 w-32 bg-gray-200 rounded mb-6" />
            <div className="space-y-3 mb-6">
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className="h-4 bg-gray-200 rounded" style={{ width: `${90 - j * 8}%` }} />
              ))}
            </div>
            <div className="h-10 bg-gray-200 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
