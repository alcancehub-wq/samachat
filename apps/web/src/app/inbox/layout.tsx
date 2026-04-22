import { AuthGate } from '@/components/auth/AuthGate';

export default function InboxLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGate>{children}</AuthGate>;
}
