import { AuthGate } from '@/components/auth/AuthGate';

export default function SystemHealthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGate>{children}</AuthGate>;
}
