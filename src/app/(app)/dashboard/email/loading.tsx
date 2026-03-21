export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-7 w-40 bg-gray-200 rounded mb-2" />
      <div className="h-4 w-72 bg-gray-200 rounded mb-8" />

      <div className="h-4 w-28 bg-gray-200 rounded mb-3" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card p-6">
            <div className="h-9 w-9 bg-gray-200 rounded-lg mb-3" />
            <div className="h-4 w-32 bg-gray-200 rounded mb-2" />
            <div className="space-y-1.5">
              <div className="h-3 w-full bg-gray-200 rounded" />
              <div className="h-3 w-5/6 bg-gray-200 rounded" />
            </div>
          </div>
        ))}
      </div>

      <div className="h-4 w-40 bg-gray-200 rounded mb-3" />
      <div className="card p-6 max-w-xl">
        <div className="h-5 w-40 bg-gray-200 rounded mb-3" />
        <div className="h-4 w-56 bg-gray-200 rounded mb-4" />
        <div className="space-y-2 mb-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-4 w-48 bg-gray-200 rounded" />
          ))}
        </div>
        <div className="h-10 w-44 bg-gray-200 rounded-lg" />
      </div>
    </div>
  );
}
