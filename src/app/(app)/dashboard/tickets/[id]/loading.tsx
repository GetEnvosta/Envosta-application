export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-4 w-28 bg-gray-200 rounded mb-6" />
      <div className="flex items-center gap-3 mb-2">
        <div className="h-7 w-64 bg-gray-200 rounded" />
        <div className="h-5 w-16 bg-gray-200 rounded-full" />
        <div className="h-5 w-16 bg-gray-200 rounded-full" />
      </div>
      <div className="h-4 w-32 bg-gray-200 rounded mb-8" />

      <div className="space-y-4 mb-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-4 w-20 bg-gray-200 rounded" />
              <div className="h-3 w-32 bg-gray-200 rounded" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-full bg-gray-200 rounded" />
              <div className="h-3 w-4/5 bg-gray-200 rounded" />
            </div>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <div className="h-24 bg-gray-200 rounded mb-3" />
        <div className="h-10 w-28 bg-gray-200 rounded-lg" />
      </div>
    </div>
  );
}
