import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function CookiesPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-10">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle>Cookies</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>Atualmente utilizamos cookies apenas para sessao e seguranca.</p>
          <p>Se houver tracking futuro, esta pagina sera atualizada.</p>
        </CardContent>
      </Card>
    </div>
  );
}
