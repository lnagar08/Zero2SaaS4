export default function PlansSkeleton() {
  return (
    <div className="w-full animate-pulse">
      {/* Table Header Skeleton */}
      <div className="flex items-center justify-between mb-6">
        <div className="h-10 bg-gray-200 rounded-lg w-48"></div>
        <div className="h-10 bg-indigo-100 rounded-lg w-32"></div>
      </div>

      {/* Table Rows Skeleton */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
        <div className="border-b border-gray-100 bg-gray-50 h-12"></div>
        
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center space-x-4 p-4 border-b border-gray-50">
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-3 bg-gray-100 rounded w-1/3"></div>
            </div>
            <div className="h-6 bg-gray-200 rounded w-20"></div>
            <div className="h-6 bg-gray-200 rounded w-16"></div>
            <div className="h-8 w-8 bg-gray-100 rounded-full"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
