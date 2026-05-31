import Link from 'next/link';

const links = [
  { label: 'Dashboard', href: '/app/dashboard' },
  { label: 'Tenants', href: '/app/tenants' },
  { label: 'Impersonations', href: '/app/impersonations' },
  { label: 'Settings', href: '/app/settings' },
];

export function AdminNavbar() {
  return (
    <header className="border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">DataLens Admin</p>
          <p className="text-lg font-semibold text-slate-900">Tenant and system management</p>
        </div>
        <nav className="flex flex-wrap gap-3">
          {links.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
