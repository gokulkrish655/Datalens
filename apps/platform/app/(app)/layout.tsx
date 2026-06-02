import '../globals.css';
import { Sidebar } from '../../components/sidebar';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'DataLens Workspace',
  description: 'Authenticated DataLens workspace for query and governance.',
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
