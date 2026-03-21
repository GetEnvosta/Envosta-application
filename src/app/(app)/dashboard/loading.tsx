export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-56 bg-gray-200 rounded mb-6" />

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-5">
            <div className="h-4 w-24 bg-gray-200 rounded mb-3" />
            <div className="h-7 w-16 bg-gray-200 rounded" />
          </div>
        ))}
      </div>

      {/* List sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="card p-6">
            <div className="h-5 w-32 bg-gray-200 rounded mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="h-4 bg-gray-200 rounded" style={{ width: `${85 - j * 10}%` }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
