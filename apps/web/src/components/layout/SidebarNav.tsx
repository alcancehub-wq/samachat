'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUiStore } from '@/store/ui';
import { Button } from '@/components/ui/button';
import { navItems } from './nav-items';

export function SidebarNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { sidebarCollapsed, toggleSidebarCollapsed } = useUiStore();
  const visibleItems = navItems;

  return (
    <aside
      className={cn(
        'hidden min-h-screen flex-col border-r border-border/60 bg-card/80 p-6 md:sticky md:top-0 md:h-screen md:overflow-y-auto md:flex',
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
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const children = item.children ?? [];
          const hasChildren = children.length > 0;
          const isActive = (href: string) => {
            if (href.includes('?')) {
              const [path, query] = href.split('?');
              if (pathname !== path) return false;
              const params = new URLSearchParams(query);
              const tab = params.get('tab');
              const currentTab = searchParams.get('tab') ?? 'biblioteca';
              return tab === currentTab;
            }
            return pathname === href;
          };

          const childActive = hasChildren ? children.some((child) => isActive(child.href)) : false;
          const active = isActive(item.href) || childActive;

          return (
            <div key={item.label} className="space-y-1">
              <Link
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
                    sidebarCollapsed
                      ? 'md:opacity-0 md:w-0 md:overflow-hidden lg:opacity-100 lg:w-auto'
                      : '',
                  )}
                >
                  {item.label}
                </span>
              </Link>
              {hasChildren && (
                <div className={cn('space-y-1 pl-8', sidebarCollapsed ? 'md:hidden lg:block' : '')}>
                  {children.map((child) => (
                    <Link
                      key={child.label}
                      href={child.href}
                      className={cn(
                        'flex items-center rounded-lg px-3 py-2 text-xs font-medium transition',
                        isActive(child.href)
                          ? 'bg-muted text-foreground'
                          : 'text-muted-foreground hover:bg-muted/60',
                      )}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
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
