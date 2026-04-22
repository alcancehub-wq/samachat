'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const tabs = [
  { label: 'Workspace', href: '/settings/workspace' },
  { label: 'Usuarios', href: '/settings/usuarios' },
  { label: 'Perfis de acesso', href: '/settings/perfis' },
];

export function SettingsShell() {
  const pathname = usePathname();

  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'rounded-full border border-border/60 px-4 py-2 text-xs font-semibold transition',
              active
                ? 'bg-primary text-primary-foreground'
                : 'bg-background/80 text-muted-foreground hover:bg-muted/40',
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
