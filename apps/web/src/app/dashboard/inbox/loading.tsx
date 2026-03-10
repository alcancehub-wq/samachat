import { PageShell } from '@/components/layout/PageShell';
import { SkeletonList, SkeletonChat } from '@/components/ui/skeletons';

export default function Loading() {
  return (
    <PageShell title="Conversas" subtitle="Inbox">
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
          <SkeletonList rows={6} />
        </div>
        <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
          <SkeletonChat />
        </div>
      </div>
    </PageShell>
  );
}
