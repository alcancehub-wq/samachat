import {
  Activity,
  type LucideIcon,
  FileText,
  LayoutDashboard,
  MessageSquare,
  Megaphone,
  QrCode,
  Settings,
  Sparkles,
} from 'lucide-react';

export interface NavChildItem {
  label: string;
  href: string;
}

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  permissions?: string[];
  children?: NavChildItem[];
}

export const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Conversas', href: '/inbox', icon: MessageSquare },
  { label: 'Conexoes', href: '/connections', icon: QrCode, permissions: ['connections:view'] },
  { label: 'Campanhas', href: '/campaigns', icon: Megaphone, permissions: ['campaigns:view'] },
  {
    label: 'Dialogos',
    href: '/dialogs',
    icon: FileText,
    permissions: ['dialogs:view'],
  },
  { label: 'Automacoes', href: '/automations', icon: Sparkles, permissions: ['automations:view'] },
  { label: 'Saude', href: '/system/health', icon: Activity, permissions: ['system:health'] },
  { label: 'Configuracoes', href: '/settings/workspace', icon: Settings, permissions: ['users:view'] },
];
