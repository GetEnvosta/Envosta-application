export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-40 bg-gray-200 rounded mb-6" />

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card p-5">
            <div className="h-4 w-24 bg-gray-200 rounded mb-3" />
            <div className="h-7 w-20 bg-gray-200 rounded" />
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card p-6">
        <div className="h-5 w-36 bg-gray-200 rounded mb-4" />
        <div className="space-y-3">
          <div className="h-10 bg-gray-200 rounded" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}
