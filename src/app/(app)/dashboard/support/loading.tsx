export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-7 w-28 bg-gray-200 rounded mb-2" />
      <div className="h-4 w-52 bg-gray-200 rounded mb-8" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-6">
          <div className="h-5 w-36 bg-gray-200 rounded mb-5" />
          <div className="space-y-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                <div className="h-4 w-20 bg-gray-200 rounded mb-2" />
                <div className="h-10 bg-gray-200 rounded" />
              </div>
            ))}
            <div className="h-10 w-36 bg-gray-200 rounded-lg" />
          </div>
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
