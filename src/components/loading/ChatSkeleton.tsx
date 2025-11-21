import { Skeleton } from "@/components/ui/skeleton";

export const ChatSkeleton = () => {
  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card border-b">
        <div className="flex items-center h-16 px-4 gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-8 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-hidden p-4 space-y-4">
        {[...Array(10)].map((_, i) => (
          <div key={i} className={`flex ${i % 3 === 0 ? 'justify-end' : 'justify-start'}`}>
            <Skeleton className={`h-12 rounded-2xl ${i % 3 === 0 ? 'w-48' : 'w-56'}`} />
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="border-t p-4">
        <Skeleton className="h-12 w-full rounded-full" />
      </div>
    </div>
  );
};
