import { AuthGate } from '@/components/auth/AuthGate';

export default function AutomationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGate>{children}</AuthGate>;
}
