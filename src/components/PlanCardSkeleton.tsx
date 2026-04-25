export default function PlanCardSkeleton() {
  return (
    <div className="rounded-2xl p-6 flex flex-col items-center text-center border border-slate-100 animate-pulse">
      {/* Title Skeleton */}
      <div className="h-6 w-24 bg-slate-200 rounded-md mb-4" />
      
      {/* Price Skeleton */}
      <div className="h-10 w-20 bg-slate-200 rounded-md mt-4" />
      <div className="h-3 w-16 bg-slate-100 rounded-md mt-2" />
      
      {/* Users Skeleton */}
      <div className="h-4 w-28 bg-slate-100 rounded-md mt-2" />
      
      {/* Features Skeleton */}
      <div className="mt-6 space-y-2 w-full">
        <div className="h-3 w-full bg-slate-50 rounded-md" />
        <div className="h-3 w-3/4 mx-auto bg-slate-50 rounded-md" />
      </div>
      
      {/* Button Skeleton */}
      <div className="mt-auto w-full h-12 bg-slate-200 rounded-xl" />
    </div>
  );
}
