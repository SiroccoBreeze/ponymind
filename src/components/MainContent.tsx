'use client';

import { usePathname } from 'next/navigation';

/**
 * Wraps main content; removes top padding when Navbar is hidden (e.g. /admin).
 * MASTER §14: pt-[72px] when Navbar is shown, pt-0 for admin.
 */
export default function MainContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');
  return (
    <main
      id="main-content"
      className={isAdmin ? 'min-h-screen' : 'pt-[72px] min-h-[calc(100vh-4.5rem)]'}
    >
      {children}
    </main>
  );
}
