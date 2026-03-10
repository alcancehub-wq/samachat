import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getPublicConfig } from '@/lib/public-config';

export default function TermsPage() {
  const config = getPublicConfig();
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-10">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle>Termos de Uso</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>Estes Termos definem as regras de uso do Samachat para equipes internas.</p>
          <p>Ao utilizar o produto, voce concorda com o uso de dados para operacao, suporte e seguranca.</p>
          <p>Versao vigente: {config.termsVersion}.</p>
        </CardContent>
      </Card>
    </div>
  );
}
