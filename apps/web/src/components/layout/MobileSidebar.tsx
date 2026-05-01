'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { navItems } from './nav-items';
import { useUiStore } from '@/store/ui';
import { Button } from '@/components/ui/button';

export function MobileSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { sidebarOpen, closeSidebar } = useUiStore();
  const visibleItems = navItems;

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex lg:hidden',
        sidebarOpen ? 'pointer-events-auto' : 'pointer-events-none',
      )}
      aria-hidden={!sidebarOpen}
    >
      <div
        className={cn(
          'absolute inset-0 bg-background/80 backdrop-blur transition-opacity',
          sidebarOpen ? 'opacity-100' : 'opacity-0',
        )}
        onClick={closeSidebar}
      />
      <aside
        className={cn(
          'relative h-full w-72 translate-x-0 border-r border-border/60 bg-card/90 p-6 shadow-2xl transition-transform',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Samachat</p>
            <h2 className="mt-2 text-xl font-semibold">Menu</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={closeSidebar} aria-label="Fechar menu">
            <X size={18} />
          </Button>
        </div>
        <nav className="mt-8 space-y-2">
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
                  onClick={closeSidebar}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition',
                    active
                      ? 'bg-primary text-primary-foreground shadow-glow'
                      : 'text-muted-foreground hover:bg-muted',
                  )}
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
                {hasChildren && (
                  <div className="space-y-1 pl-8">
                    {children.map((child) => (
                      <Link
                        key={child.label}
                        href={child.href}
                        onClick={closeSidebar}
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
      </aside>
    </div>
  );
}
