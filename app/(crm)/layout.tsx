import React from 'react';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';

export default function CrmLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Sidebar />
      <Topbar />
      <div className="pl-64 pt-16 min-h-screen bg-background">
        <main className="w-full pb-16">{children}</main>
      </div>
    </>
  );
}
