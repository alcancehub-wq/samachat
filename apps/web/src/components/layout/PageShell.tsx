import { SidebarNav } from './SidebarNav';
import { Topbar } from './Topbar';
import { MobileSidebar } from './MobileSidebar';

interface PageShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function PageShell({ title, subtitle, children }: PageShellProps) {
  return (
    <div className="min-h-screen bg-transparent md:flex">
      <MobileSidebar />
      <SidebarNav />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar title={title} subtitle={subtitle} />
        <main className="min-h-0 flex-1 space-y-8 overflow-y-auto px-4 pb-10 pt-4 md:px-6 lg:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}
