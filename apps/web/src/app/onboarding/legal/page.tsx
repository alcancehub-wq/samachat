'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';
import { getPublicConfig } from '@/lib/public-config';
import { getTenantId } from '@/lib/tenant';

export default function OnboardingLegalPage() {
  const router = useRouter();
  const config = getPublicConfig();
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canContinue = acceptedTerms && acceptedPrivacy;

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
      <div className="space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}
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
    </OnboardingLayout>
  );
}
