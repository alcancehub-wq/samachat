import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-border/60 px-6 py-6 text-xs text-muted-foreground">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4">
        <span>Samachat © 2026</span>
        <nav className="flex flex-wrap gap-3">
          <Link className="hover:text-foreground" href="/terms">
            Termos
          </Link>
          <Link className="hover:text-foreground" href="/privacy">
            Privacidade
          </Link>
          <Link className="hover:text-foreground" href="/cookies">
            Cookies
          </Link>
        </nav>
      </div>
    </footer>
  );
}
