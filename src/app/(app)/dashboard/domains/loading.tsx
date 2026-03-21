export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-7 w-36 bg-gray-200 rounded" />
          <div className="h-5 w-8 bg-gray-200 rounded-full" />
        </div>
        <div className="h-10 w-44 bg-gray-200 rounded-lg" />
      </div>

      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-200 rounded-lg" />
                <div>
                  <div className="h-4 w-40 bg-gray-200 rounded mb-2" />
                  <div className="h-3 w-56 bg-gray-200 rounded" />
                </div>
              </div>
              <div className="h-9 w-20 bg-gray-200 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
