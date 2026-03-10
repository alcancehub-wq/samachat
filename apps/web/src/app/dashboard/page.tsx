import { PageShell } from '@/components/layout/PageShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';

const metrics = [
  { label: 'Conversas hoje', value: '128', hint: '+12% vs ontem' },
  { label: 'Aguardando', value: '18', hint: 'Fila ativa' },
  { label: 'Em atendimento', value: '42', hint: 'Agentes online' },
  { label: 'Finalizados', value: '96', hint: 'Encerradas no dia' },
  { label: 'Tempo medio espera', value: '02:18', hint: 'Ultimas 24h' },
  { label: 'Tempo medio atendimento', value: '06:42', hint: 'Ultimas 24h' },
];

export default function DashboardPage() {
  return (
    <PageShell title="Dashboard" subtitle="Performance">
      <div className="space-y-8">
        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {metrics.map((metric) => (
            <Card key={metric.label} className="relative overflow-hidden">
              <CardHeader>
                <CardDescription>{metric.label}</CardDescription>
                <CardTitle className="text-3xl">{metric.value}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{metric.hint}</p>
              </CardContent>
              <div className="absolute -right-12 top-4 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
            </Card>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Fluxos em destaque</CardTitle>
              <CardDescription>Ultimas automacoes publicadas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {['Boas vindas', 'Retencao VIP', 'Reativacao'].map((flow) => (
                <div
                  key={flow}
                  className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/40 px-4 py-3 text-sm"
                >
                  <span>{flow}</span>
                  <span className="text-xs text-muted-foreground">Ativo</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Campanhas</CardTitle>
              <CardDescription>Fila de envios programados.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {['Semana premium', 'Onboarding interno', 'NPS'].map((name) => (
                <div key={name} className="rounded-xl border border-border/60 px-4 py-3">
                  <p className="text-sm font-medium">{name}</p>
                  <p className="text-xs text-muted-foreground">Status: agendada</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <section>
          <Card>
            <CardHeader>
              <CardTitle>Conversas recentes</CardTitle>
              <CardDescription>Ultimos contatos recebidos.</CardDescription>
            </CardHeader>
            <CardContent>
              <EmptyState
                title="Nenhuma conversa agora"
                description="Assim que novos contatos chegarem, voce vera tudo aqui."
              />
            </CardContent>
          </Card>
        </section>
      </div>
    </PageShell>
  );
}
