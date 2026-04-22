import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <Skeleton className="h-80 w-full max-w-md" />
    </div>
  );
}
