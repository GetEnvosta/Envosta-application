export default function CommissionsLoading() {
  return (
    <div>
      <div className="mb-6">
        <div className="h-7 bg-gray-200 rounded w-40 animate-pulse" />
        <div className="h-4 bg-gray-100 rounded w-64 mt-2 animate-pulse" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="card p-5">
            <div className="h-10 bg-gray-100 rounded animate-pulse" />
          </div>
        ))}
      </div>
      <div className="card p-5">
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
