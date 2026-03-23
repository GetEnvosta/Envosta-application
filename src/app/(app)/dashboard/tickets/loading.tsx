export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-7 w-24 bg-gray-200 rounded" />
            <div className="h-5 w-8 bg-gray-200 rounded-full" />
          </div>
          <div className="h-4 w-48 bg-gray-200 rounded" />
        </div>
        <div className="flex gap-3">
          <div className="h-10 w-40 bg-gray-200 rounded-lg" />
          <div className="h-10 w-44 bg-gray-200 rounded-lg" />
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        <div className="h-9 w-16 bg-gray-200 rounded-lg" />
        <div className="h-9 w-20 bg-gray-200 rounded-lg" />
        <div className="h-9 w-20 bg-gray-200 rounded-lg" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-16 bg-gray-200 rounded-full" />
                  <div className="h-5 w-48 bg-gray-200 rounded" />
                </div>
                <div className="h-5 w-16 bg-gray-200 rounded-full" />
              </div>
              <div className="h-4 w-3/4 bg-gray-200 rounded" />
              <div className="h-3 w-24 bg-gray-200 rounded mt-3" />
            </div>
          ))}
        </div>
        <div className="lg:col-span-1 card p-6">
          <div className="h-5 w-44 bg-gray-200 rounded mb-3" />
          <div className="space-y-2 mb-4">
            <div className="h-3 w-full bg-gray-200 rounded" />
            <div className="h-3 w-5/6 bg-gray-200 rounded" />
            <div className="h-3 w-4/6 bg-gray-200 rounded" />
          </div>
          <div className="h-10 w-28 bg-gray-200 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
