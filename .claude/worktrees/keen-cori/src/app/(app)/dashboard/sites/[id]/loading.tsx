export default function Loading() {
  return (
    <div className="animate-pulse">
      {/* Back link */}
      <div className="h-4 w-24 bg-gray-200 rounded mb-4" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-48 bg-gray-200 rounded" />
            <div className="h-6 w-16 bg-gray-200 rounded-full" />
          </div>
          <div className="h-4 w-40 bg-gray-200 rounded mt-2" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-32 bg-gray-200 rounded-lg" />
          <div className="h-9 w-24 bg-gray-200 rounded-lg" />
        </div>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card p-5">
            <div className="h-3 w-16 bg-gray-200 rounded mb-2" />
            <div className="h-5 w-28 bg-gray-200 rounded" />
          </div>
        ))}
      </div>

      {/* Section cards */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="card p-6 mb-4">
          <div className="h-4 w-32 bg-gray-200 rounded mb-3" />
          <div className="h-4 w-64 bg-gray-200 rounded" />
        </div>
      ))}

      {/* Danger zone */}
      <div className="rounded-xl border border-gray-200 p-6">
        <div className="h-4 w-24 bg-gray-200 rounded mb-3" />
        <div className="h-4 w-72 bg-gray-200 rounded mb-4" />
        <div className="h-9 w-24 bg-gray-200 rounded-lg" />
      </div>
    </div>
  );
}
