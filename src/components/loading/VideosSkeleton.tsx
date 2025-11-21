import { Skeleton } from "@/components/ui/skeleton";

export const VideosSkeleton = () => {
  return (
    <div className="grid grid-cols-2 gap-2 p-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="aspect-[9/16] w-full rounded-lg" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
};
