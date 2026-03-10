import {
  LayoutDashboard,
  MessageSquare,
  Settings,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

export const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Conversas', href: '/dashboard/inbox', icon: MessageSquare },
  { label: 'Automacoes', href: '/dashboard/automations', icon: Sparkles },
  { label: 'LGPD', href: '/onboarding', icon: ShieldCheck },
  { label: 'Configuracoes', href: '/dashboard/settings/team', icon: Settings },
];
