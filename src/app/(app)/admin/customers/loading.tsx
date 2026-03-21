export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="h-8 w-44 bg-gray-200 rounded" />
        <div className="h-10 w-64 bg-gray-200 rounded-lg" />
      </div>

      <div className="card p-6">
        <div className="space-y-3">
          <div className="h-10 bg-gray-200 rounded" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}
