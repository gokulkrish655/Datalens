import Link from 'next/link';

const navigation = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Databases', href: '/databases' },
  { label: 'Schema', href: '/schema' },
  { label: 'Access', href: '/access' },
  { label: 'Usage', href: '/usage' },
  { label: 'Users', href: '/users' },
  { label: 'Audit', href: '/audit' },
];

export function Sidebar() {
  return (
    <aside className="w-72 border-r border-slate-200 bg-white px-6 py-8 shadow-sm">
      <div className="mb-8">
        <div className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">DataLens</div>
        <p className="mt-3 text-slate-600">Query assistant and data governance platform.</p>
      </div>
      <nav className="space-y-2">
        {navigation.map((item) => (
          <Link key={item.href} href={item.href} className="block rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900">
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
