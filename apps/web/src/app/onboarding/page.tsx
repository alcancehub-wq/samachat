import Link from 'next/link';
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout';
import { Button } from '@/components/ui/button';

export default function OnboardingPage() {
  return (
    <OnboardingLayout
      title="Bem-vindo ao Samachat"
      subtitle="Vamos configurar seu workspace e permissoes em poucos passos."
    >
      <div className="space-y-4 text-sm text-muted-foreground">
        <p>Precisamos apenas confirmar seu workspace, convite (se houver) e aceite legal.</p>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/onboarding/tenant">Comecar agora</Link>
        </Button>
      </div>
    </OnboardingLayout>
  );
}
