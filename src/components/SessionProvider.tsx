'use client';

import { SessionProvider as Provider } from 'next-auth/react';
import { Session } from 'next-auth';

export default function SessionProvider({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session | null;
}) {
  return <Provider session={session as any}>{children}</Provider>;
} 