import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const FeedSkeleton = () => {
  return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <Card key={i} className="bg-card border-0 sm:border sm:border-border/50 rounded-none sm:rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="p-4 pb-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-11 w-11 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-4 pb-3 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>

          {/* Media */}
          <Skeleton className="w-full h-[400px]" />

          {/* Actions */}
          <div className="p-4 flex gap-4">
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-20" />
          </div>
        </Card>
      ))}
    </div>
  );
};
