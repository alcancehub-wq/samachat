import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Pagina nao encontrada</CardTitle>
          <CardDescription>Essa rota nao existe ou foi movida.</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button asChild>
            <Link href="/dashboard">Voltar ao dashboard</Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/login">Entrar</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
