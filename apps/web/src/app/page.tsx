import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Samachat Premium</CardTitle>
          <CardDescription>Base pronta para operacao interna e multi-tenant.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/login">Acessar</Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/dashboard">Ir para Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
