export default function Loading() {
  return (
    <div className="animate-pulse space-y-10">
      {/* Header */}
      <div>
        <div className="h-7 w-32 bg-gray-200 rounded mb-2" />
        <div className="h-4 w-64 bg-gray-200 rounded" />
      </div>

      {/* Section 1: Current Plan card */}
      <div>
        <div className="h-4 w-28 bg-gray-200 rounded mb-4" />
        <div className="card p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-2">
              <div className="h-5 w-32 bg-gray-200 rounded" />
              <div className="h-8 w-24 bg-gray-200 rounded" />
              <div className="h-3 w-40 bg-gray-200 rounded" />
            </div>
            <div className="flex gap-2">
              <div className="h-10 w-28 bg-gray-200 rounded-lg" />
              <div className="h-10 w-40 bg-gray-200 rounded-lg" />
            </div>
          </div>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-4 w-36 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>

      {/* Section 2: Payment Method card */}
      <div>
        <div className="h-4 w-32 bg-gray-200 rounded mb-4" />
        <div className="card p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-8 bg-gray-200 rounded-md" />
              <div className="space-y-1.5">
                <div className="h-4 w-40 bg-gray-200 rounded" />
                <div className="h-3 w-24 bg-gray-200 rounded" />
              </div>
            </div>
            <div className="h-10 w-44 bg-gray-200 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Section 3: Billing History table */}
      <div>
        <div className="h-4 w-28 bg-gray-200 rounded mb-4" />
        <div className="card overflow-hidden">
          {/* Table header */}
          <div className="h-10 bg-gray-100/80 border-b border-gray-100" />
          {/* Table rows */}
          <div className="divide-y divide-gray-100">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-5 py-3.5">
                <div className="h-5 bg-gray-200 rounded w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
