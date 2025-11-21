import { Skeleton } from "@/components/ui/skeleton";

export const ProfileSkeleton = () => {
  return (
    <div className="max-w-3xl mx-auto">
      {/* Banner and Avatar */}
      <div className="relative">
        <Skeleton className="h-48 w-full rounded-none" />
        
        <div className="px-4 pb-4">
          <div className="flex items-end justify-between -mt-16">
            <Skeleton className="h-32 w-32 rounded-full border-4 border-background" />
            <Skeleton className="h-9 w-32 rounded-full" />
          </div>

          <div className="mt-4 space-y-3">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-4 w-full max-w-md" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-4 px-4">
          <Skeleton className="h-12 w-24" />
          <Skeleton className="h-12 w-24" />
          <Skeleton className="h-12 w-24" />
        </div>
      </div>

      {/* Posts Grid */}
      <div className="grid grid-cols-3 gap-1 p-4">
        {[...Array(9)].map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-lg" />
        ))}
      </div>
    </div>
  );
};
