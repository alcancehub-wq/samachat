import { PageShell } from '@/components/layout/PageShell';
import { SkeletonCard, SkeletonList } from '@/components/ui/skeletons';

export default function Loading() {
  return (
    <PageShell title="Configuracoes" subtitle="Time">
      <div className="space-y-6">
        <SkeletonCard />
        <SkeletonList rows={4} />
        <SkeletonCard />
      </div>
    </PageShell>
  );
}
