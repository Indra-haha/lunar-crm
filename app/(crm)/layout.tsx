import React from 'react';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import { getSession } from '@/lib/auth';

export default async function CrmLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  return (
    <>
      <Sidebar user={session} />
      <Topbar initialUser={session} />
      <div className="pl-64 pt-16 min-h-screen bg-background">
        <main className="w-full pb-16">{children}</main>
      </div>
    </>
  );
}
