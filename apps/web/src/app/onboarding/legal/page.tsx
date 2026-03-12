'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';
import { getPublicConfig } from '@/lib/public-config';
import { getTenantId } from '@/lib/tenant';
import Link from 'next/link';
import { legalMeta, privacySections, termsSections } from '@/lib/legal-docs';

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=604800; samesite=lax`;
}

interface OnboardingStatus {
  hasMembership: boolean;
  pendingInvites: number;
  legalAccepted: boolean;
  activeTenantId: string | null;
}

export default function OnboardingLegalPage() {
  const router = useRouter();
  const config = getPublicConfig();
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canContinue = acceptedTerms && acceptedPrivacy;

  useEffect(() => {
    const tenantId = getTenantId();
    if (!tenantId) {
      setCheckingStatus(false);
      return;
    }

    let active = true;

    const run = async () => {
      try {
        const status = await apiFetch<OnboardingStatus>('/me/onboarding-status', {}, tenantId);

        if (!active) {
          return;
        }

        if (status.pendingInvites > 0) {
          router.replace('/onboarding/invite');
          return;
        }

        if (!status.hasMembership) {
          router.replace('/onboarding/tenant');
          return;
        }

        if (status.legalAccepted) {
          router.replace('/onboarding/done');
          return;
        }
      } catch {
        if (active) {
          setCheckingStatus(false);
        }
        return;
      }

      if (active) {
        setCheckingStatus(false);
      }
    };

    run();

    return () => {
      active = false;
    };
  }, [router]);

  const handleSubmit = async () => {
    if (!canContinue) {
      return;
    }

    const tenantId = getTenantId();
    if (!tenantId) {
      setError('Selecione um workspace antes de continuar.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await apiFetch(
        '/legal/acceptance',
        {
          method: 'POST',
          body: JSON.stringify({
            terms_version: config.termsVersion,
            privacy_version: config.privacyVersion,
          }),
        },
        tenantId,
      );
      setCookie('samachat-auth', '1');
      setCookie('samachat-membership', '1');
      setCookie('samachat-legal', '1');
      router.push('/onboarding/done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar aceite');
    } finally {
      setLoading(false);
    }
  };

  return (
    <OnboardingLayout
      title="Termos e privacidade"
      subtitle="Aceite os documentos para continuar."
    >
      {checkingStatus ? (
        <p className="text-sm text-muted-foreground">Validando status...</p>
      ) : (
        <div className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="space-y-6">
            <div className="rounded-2xl border border-border/60 bg-background/60 p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">Termos de Uso</p>
                  <p className="text-xs text-muted-foreground">
                    Versao {config.termsVersion} | Ultima atualizacao {legalMeta.termsLastUpdate}
                  </p>
                </div>
                <Link className="text-xs font-semibold text-primary" href="/terms" target="_blank">
                  Abrir documento completo
                </Link>
              </div>
              <div className="mt-4 max-h-48 space-y-3 overflow-y-auto rounded-xl border border-border/60 bg-background/80 p-3">
                {termsSections.map((section) => (
                  <div key={section.heading} className="space-y-2">
                    <p className="text-xs font-semibold">{section.heading}</p>
                    {section.paragraphs.map((paragraph) => (
                      <p key={paragraph} className="text-xs text-muted-foreground">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-1 border-t border-border/60 pt-3 text-[0.7rem] text-muted-foreground">
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
                  Vigencia: {legalMeta.termsLastUpdate}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-border/60 bg-background/60 p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">Politica de Privacidade</p>
                  <p className="text-xs text-muted-foreground">
                    Versao {config.privacyVersion} | Ultima atualizacao{' '}
                    {legalMeta.privacyLastUpdate}
                  </p>
                </div>
                <Link className="text-xs font-semibold text-primary" href="/privacy" target="_blank">
                  Abrir documento completo
                </Link>
              </div>
              <div className="mt-4 max-h-48 space-y-3 overflow-y-auto rounded-xl border border-border/60 bg-background/80 p-3">
                {privacySections.map((section) => (
                  <div key={section.heading} className="space-y-2">
                    <p className="text-xs font-semibold">{section.heading}</p>
                    {section.paragraphs.map((paragraph) => (
                      <p key={paragraph} className="text-xs text-muted-foreground">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-1 border-t border-border/60 pt-3 text-[0.7rem] text-muted-foreground">
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
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-border/60 bg-background/60 p-4 text-sm">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(event) => setAcceptedTerms(event.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              Li e aceito os Termos de Uso (v{config.termsVersion}).
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={acceptedPrivacy}
                onChange={(event) => setAcceptedPrivacy(event.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              Li e aceito a Politica de Privacidade (v{config.privacyVersion}).
            </label>
          </div>
          <Button onClick={handleSubmit} disabled={!canContinue || loading}>
            {loading ? 'Salvando...' : 'Salvar aceite'}
          </Button>
        </div>
      )}
    </OnboardingLayout>
  );
}
