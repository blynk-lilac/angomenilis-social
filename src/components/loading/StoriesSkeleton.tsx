import { Skeleton } from "@/components/ui/skeleton";

export const StoriesSkeleton = () => {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-2 flex-shrink-0">
          <Skeleton className="h-16 w-16 rounded-full" />
          <Skeleton className="h-3 w-14" />
        </div>
      ))}
    </div>
  );
};
