export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-4 w-32 bg-gray-200 rounded mb-4" />
      <div className="h-7 w-48 bg-gray-200 rounded mb-2" />
      <div className="h-4 w-72 bg-gray-200 rounded mb-6" />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-lg">
        <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
        <div className="flex gap-2">
          <div className="h-10 bg-gray-200 rounded flex-1" />
          <div className="h-10 w-20 bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  );
}
