import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getPublicConfig } from '@/lib/public-config';

export default function PrivacyPage() {
  const config = getPublicConfig();
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-10">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle>Politica de Privacidade</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>Descrevemos como coletamos, usamos e protegemos dados pessoais no Samachat.</p>
          <p>Usamos dados para execucao do contrato, seguranca e melhoria do produto.</p>
          <p>Versao vigente: {config.privacyVersion}.</p>
        </CardContent>
      </Card>
    </div>
  );
}
