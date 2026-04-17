export default function TeamMemberSkelton() {
  return (
    <div className="py-8 border-t border-neutral-100 animate-pulse">
    <div className="flex items-center justify-between gap-6 mb-6">
      <div className="flex items-center gap-6">
        {/* Profile Circle Skeleton */}
        <div className="w-16 h-16 rounded-full bg-neutral-200" />
        
        <div>
          {/* Name Skeleton */}
          <div className="h-6 w-32 bg-neutral-200 rounded-md mb-2" />
          {/* Email Skeleton */}
          <div className="h-4 w-48 bg-neutral-100 rounded-md" />
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Role Badge Skeleton */}
        <div className="h-10 w-24 bg-neutral-100 rounded-full" />
        {/* Button Skeleton */}
        <div className="h-10 w-28 bg-neutral-200 rounded-xl" />
      </div>
    </div>

    {/* Permissions Section Skeleton */}
    <div className="border-t border-neutral-100 mt-4 pt-4">
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-5 w-5 bg-neutral-200 rounded" />
            <div className="h-4 w-20 bg-neutral-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  </div>
  );
}
