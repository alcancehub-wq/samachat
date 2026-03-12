'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

const tabs = [
  { label: 'Biblioteca', href: '/dialogs?tab=biblioteca' },
  { label: 'Criar Diálogo', href: '/dialogs?tab=criar' },
  { label: 'Variaveis', href: '/dialogs/variables' },
  { label: 'Tags', href: '/dialogs/tags' },
];

export function DialogsShell() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') ?? 'biblioteca';

  const isActive = (href: string) => {
    if (href.includes('?')) {
      const [path, query] = href.split('?');
      if (pathname !== path) return false;
      const params = new URLSearchParams(query);
      return params.get('tab') === activeTab;
    }
    return pathname === href;
  };

  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const active = isActive(tab.href);
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
