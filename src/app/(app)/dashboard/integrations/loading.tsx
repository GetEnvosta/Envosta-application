export default function Loading() {
  return (
    <div>
      <div className="mb-6">
        <div className="h-6 w-40 bg-gray-200 rounded animate-pulse mb-2" />
        <div className="h-4 w-80 bg-gray-100 rounded animate-pulse" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="card p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse" />
              <div className="space-y-1">
                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
              </div>
            </div>
            <div className="h-3 w-full bg-gray-100 rounded animate-pulse" />
            <div className="h-3 w-3/4 bg-gray-100 rounded animate-pulse" />
            <div className="h-9 bg-gray-100 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
