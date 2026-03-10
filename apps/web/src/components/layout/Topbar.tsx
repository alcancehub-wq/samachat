'use client';

import { Bell, Menu, PanelLeft, Search } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { useUiStore } from '@/store/ui';

interface TopbarProps {
  title: string;
  subtitle?: string;
}

export function Topbar({ title, subtitle }: TopbarProps) {
  const { toggleSidebar, toggleSidebarCollapsed } = useUiStore();

  return (
    <header className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-4 border-b border-border/60 bg-card/80 px-4 py-4 backdrop-blur md:px-6 lg:px-10">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="lg:hidden"
          onClick={toggleSidebar}
          aria-label="Abrir menu"
        >
          <Menu size={16} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="hidden md:inline-flex lg:hidden"
          onClick={toggleSidebarCollapsed}
          aria-label="Alternar menu"
        >
          <PanelLeft size={16} />
        </Button>
        <div>
          {subtitle && (
            <p className="text-[0.55rem] uppercase tracking-[0.3em] text-muted-foreground md:text-xs">
              {subtitle}
            </p>
          )}
          <h1 className="text-xl font-semibold md:text-2xl">{title}</h1>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-end gap-3">
        <div className="hidden items-center gap-2 rounded-full border border-border/60 bg-background/60 px-4 py-2 text-sm text-muted-foreground lg:flex">
          <Search size={16} />
          <span>Buscar conversas</span>
        </div>
        <InstallPrompt />
        <ThemeToggle />
        <Button variant="ghost" size="sm">
          <Bell size={16} />
        </Button>
      </div>
    </header>
  );
}
