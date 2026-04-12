export default function Loading() {
  return (
    <div className="max-w-2xl space-y-6">
      <div className="mb-6">
        <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-2" />
        <div className="h-4 w-72 bg-gray-100 rounded animate-pulse" />
      </div>
      {[1, 2, 3].map(i => (
        <div key={i} className="card p-6">
          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-5" />
          <div className="space-y-4">
            <div className="h-9 bg-gray-100 rounded animate-pulse" />
            <div className="h-9 bg-gray-100 rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
