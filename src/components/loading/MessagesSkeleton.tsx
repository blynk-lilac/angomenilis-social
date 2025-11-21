import { Skeleton } from "@/components/ui/skeleton";

export const MessagesSkeleton = () => {
  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card border-b border-border">
        <div className="flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-8 w-24" />
          </div>
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
      </header>

      {/* Search */}
      <div className="px-4 pt-3 pb-2">
        <Skeleton className="h-11 w-full rounded-full" />
      </div>

      {/* Stories */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <Skeleton className="h-16 w-16 rounded-full" />
              <Skeleton className="h-3 w-14" />
            </div>
          ))}
        </div>
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="h-14 w-14 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
};
