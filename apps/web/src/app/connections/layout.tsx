import { AuthGate } from '@/components/auth/AuthGate';

export default function ConnectionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGate>{children}</AuthGate>;
}
