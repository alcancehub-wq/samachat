import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Sem conexao</CardTitle>
          <CardDescription>Voce esta offline. Algumas areas ainda podem estar disponiveis.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Verifique sua rede e tente novamente. O conteudo em cache continua acessivel.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
