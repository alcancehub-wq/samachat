import './globals.css';
import type { Metadata } from 'next';
import { Manrope, Space_Grotesk } from 'next/font/google';

import { ThemeProvider } from '@/providers/theme-provider';
import { ServiceWorkerRegister } from '@/components/pwa/ServiceWorkerRegister';
import { Footer } from '@/components/layout/Footer';
import OnboardingGuard from '@/components/onboarding/OnboardingGuard';

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-sans',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
});

export const metadata: Metadata = {
  title: 'Samachat',
  description: 'Samachat premium workspace',
  manifest: '/manifest.webmanifest',
  themeColor: '#0b0f17',
};

export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const publicConfig = {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '',
    NEXT_PUBLIC_TERMS_VERSION: process.env.NEXT_PUBLIC_TERMS_VERSION || '',
    NEXT_PUBLIC_PRIVACY_VERSION: process.env.NEXT_PUBLIC_PRIVACY_VERSION || '',
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  };
  const publicConfigJson = JSON.stringify(publicConfig);

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${manrope.variable} ${spaceGrotesk.variable} antialiased`}>
        <script
          // Inline script avoids next/script client runtime issues.
          dangerouslySetInnerHTML={{
            __html: `window.__SAMACHAT_PUBLIC_CONFIG__ = ${publicConfigJson};`,
          }}
        />
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <OnboardingGuard>{children}</OnboardingGuard>
          <Footer />
          <ServiceWorkerRegister />
        </ThemeProvider>
      </body>
    </html>
  );
}