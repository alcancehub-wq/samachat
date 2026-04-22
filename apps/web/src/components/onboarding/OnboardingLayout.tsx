import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const steps = [
  { id: 'tenant', label: 'Workspace' },
  { id: 'invite', label: 'Convite' },
  { id: 'legal', label: 'Legal' },
  { id: 'done', label: 'Finalizar' },
];

export function OnboardingLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-10">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap gap-3">
            {steps.map((step) => (
              <span
                key={step.id}
                className="rounded-full border border-border/60 px-3 py-1 text-xs text-muted-foreground"
              >
                {step.label}
              </span>
            ))}
          </div>
          {children}
        </CardContent>
      </Card>
    </div>
  );
}
