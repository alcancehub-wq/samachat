import { AuthGate } from '@/components/auth/AuthGate';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <AuthGate>{children}</AuthGate>;
}
