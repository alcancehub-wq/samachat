import {
  Activity,
  LayoutDashboard,
  MessageSquare,
  Megaphone,
  QrCode,
  Settings,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

export const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Conversas', href: '/inbox', icon: MessageSquare },
  { label: 'Conexoes', href: '/connections', icon: QrCode },
  { label: 'Campanhas', href: '/campaigns', icon: Megaphone },
  { label: 'Automacoes', href: '/automations', icon: Sparkles },
  { label: 'Saude', href: '/system/health', icon: Activity },
  { label: 'LGPD', href: '/onboarding', icon: ShieldCheck },
  { label: 'Configuracoes', href: '/settings/workspace', icon: Settings },
];
