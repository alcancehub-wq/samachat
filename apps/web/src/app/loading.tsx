import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Skeleton className="h-24 w-80" />
    </div>
  );
}
