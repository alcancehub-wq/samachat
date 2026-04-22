import { AuthGate } from '@/components/auth/AuthGate';

export default function DialogsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGate>{children}</AuthGate>;
}
