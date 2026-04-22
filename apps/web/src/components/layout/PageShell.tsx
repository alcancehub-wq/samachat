import { SidebarNav } from './SidebarNav';
import { Topbar } from './Topbar';
import { MobileSidebar } from './MobileSidebar';
import { Footer } from './Footer';

interface PageShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function PageShell({ title, subtitle, children }: PageShellProps) {
  return (
    <div className="h-screen overflow-hidden bg-transparent md:flex">
      <MobileSidebar />
      <SidebarNav />
      <div className="flex h-screen flex-1 flex-col">
        <Topbar title={title} subtitle={subtitle} />
        <main className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto px-4 pb-10 pt-4 md:px-6 lg:px-10">
          {children}
          <Footer />
        </main>
      </div>
    </div>
  );
}
