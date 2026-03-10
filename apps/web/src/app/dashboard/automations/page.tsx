import { PageShell } from '@/components/layout/PageShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';

const flows = [
  { name: 'Boas vindas', status: 'Ativo', updatedAt: 'Ha 2 dias' },
  { name: 'Reativacao', status: 'Rascunho', updatedAt: 'Ha 5 dias' },
  { name: 'NPS interno', status: 'Ativo', updatedAt: 'Ha 1 semana' },
];

export default function AutomationsPage() {
  return (
    <PageShell title="Automacoes" subtitle="Fluxos">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Fluxos</CardTitle>
            <CardDescription>Automacoes ativas no workspace.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {flows.map((flow) => (
              <div
                key={flow.name}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/40 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium">{flow.name}</p>
                  <p className="text-xs text-muted-foreground">Atualizado {flow.updatedAt}</p>
                </div>
                <span className="text-xs text-muted-foreground">{flow.status}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Automacoes pendentes</CardTitle>
            <CardDescription>Sem fluxos pendentes no momento.</CardDescription>
          </CardHeader>
          <CardContent>
            <EmptyState
              title="Sem filas"
              description="Quando novos fluxos entrarem em aprovacao, eles aparecerao aqui."
            />
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
