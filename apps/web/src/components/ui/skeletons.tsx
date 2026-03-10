import { Skeleton } from './skeleton';

export function SkeletonCard() {
  return <Skeleton className="h-32 w-full" />;
}

export function SkeletonList({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-12 w-full" />
      ))}
    </div>
  );
}

export function SkeletonChat() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-40" />
      <div className="space-y-3">
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-16 w-2/3" />
        <Skeleton className="h-12 w-4/5" />
        <Skeleton className="h-16 w-1/2" />
      </div>
      <Skeleton className="h-12 w-full" />
    </div>
  );
}
