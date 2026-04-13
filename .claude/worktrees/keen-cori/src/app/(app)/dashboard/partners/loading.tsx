export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-7 w-48 bg-gray-200 rounded mb-2" />
      <div className="h-4 w-64 bg-gray-200 rounded mb-8" />

      <div className="space-y-6 max-w-2xl">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-9 w-9 bg-gray-200 rounded-lg" />
              <div className="h-5 w-32 bg-gray-200 rounded" />
            </div>
            <div className="space-y-2 mb-5">
              <div className="h-3 w-full bg-gray-200 rounded" />
              <div className="h-3 w-4/5 bg-gray-200 rounded" />
            </div>
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j}>
                  <div className="h-4 w-20 bg-gray-200 rounded mb-2" />
                  <div className="h-10 bg-gray-200 rounded" />
                </div>
              ))}
              <div className="h-10 w-40 bg-gray-200 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
