export default function StudioLoading() {
  return (
    <div>
      <div className="mb-6">
        <div className="h-7 bg-gray-200 rounded w-32 animate-pulse" />
        <div className="h-4 bg-gray-100 rounded w-72 mt-2 animate-pulse" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="card p-5 h-32 animate-pulse bg-gray-50" />
        ))}
      </div>
    </div>
  );
}
