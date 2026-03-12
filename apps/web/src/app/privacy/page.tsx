import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getPublicConfig } from '@/lib/public-config';
import { legalMeta, privacySections } from '@/lib/legal-docs';

export default function PrivacyPage() {
  const config = getPublicConfig();
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-10">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle>Politica de Privacidade</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-sm text-muted-foreground">
          <p>
            Versao vigente: {config.privacyVersion}. Ultima atualizacao:{' '}
            {legalMeta.privacyLastUpdate}.
          </p>
          {privacySections.map((section) => (
            <div key={section.heading} className="space-y-2">
              <p className="text-sm font-semibold text-foreground">{section.heading}</p>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          ))}
          <div className="space-y-1 border-t border-border/60 pt-4 text-xs text-muted-foreground">
            <p>
              {legalMeta.companyName} | CNPJ {legalMeta.companyCnpj}
            </p>
            <p>
              {legalMeta.website} | {legalMeta.phone}
            </p>
            <p>
              Contato LGPD: {legalMeta.emailLgpd}
            </p>
            <p>
              Contato privacidade: {legalMeta.emailPrivacy}
            </p>
            <p>
              Vigencia: {legalMeta.privacyLastUpdate}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
