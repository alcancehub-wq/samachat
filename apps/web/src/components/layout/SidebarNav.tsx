'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUiStore } from '@/store/ui';
import { Button } from '@/components/ui/button';
import { navItems } from './nav-items';

export function SidebarNav() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebarCollapsed } = useUiStore();

  return (
    <aside
      className={cn(
        'hidden min-h-screen flex-col border-r border-border/60 bg-card/80 p-6 md:flex',
        sidebarCollapsed ? 'md:w-20 lg:w-72' : 'md:w-64 lg:w-72',
      )}
    >
      <div className="mb-10 rounded-2xl border border-border/60 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 p-5">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Samachat</p>
        <h2
          className={cn(
            'mt-3 text-2xl font-semibold transition-opacity',
            sidebarCollapsed ? 'md:opacity-0 md:h-0 md:overflow-hidden lg:opacity-100 lg:h-auto' : '',
          )}
        >
          Premium Workspace
        </h2>
        <p
          className={cn(
            'mt-2 text-sm text-muted-foreground transition-opacity',
            sidebarCollapsed ? 'md:opacity-0 md:h-0 md:overflow-hidden lg:opacity-100 lg:h-auto' : '',
          )}
        >
          Operacao interna
        </p>
      </div>
      <nav className="space-y-2">
        {navItems.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition',
                active
                  ? 'bg-primary text-primary-foreground shadow-glow'
                  : 'text-muted-foreground hover:bg-muted',
              )}
            >
              <Icon size={18} />
              <span
                className={cn(
                  'transition-opacity',
                  sidebarCollapsed ? 'md:opacity-0 md:w-0 md:overflow-hidden lg:opacity-100 lg:w-auto' : '',
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto space-y-4">
        <Button
          variant="ghost"
          size="sm"
          className="hidden w-full items-center justify-center gap-2 md:flex lg:hidden"
          onClick={toggleSidebarCollapsed}
          aria-label="Alternar menu"
        >
          {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          <span className="text-xs">{sidebarCollapsed ? 'Expandir' : 'Recolher'}</span>
        </Button>
        <div className="rounded-2xl border border-border/60 bg-muted/40 p-4 text-xs text-muted-foreground">
          <p className="font-semibold text-foreground">Tenant: Interno</p>
          <p>RLS preparada</p>
        </div>
      </div>
    </aside>
  );
}
