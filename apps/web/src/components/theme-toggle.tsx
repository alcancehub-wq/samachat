'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label="Alternar tema"
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
      <span className="ml-2 text-xs">{isDark ? 'Claro' : 'Escuro'}</span>
    </Button>
  );
}
