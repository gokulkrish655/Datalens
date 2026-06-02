import Link from 'next/link';

export default function AdminHomePage() {
  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="rounded-3xl bg-white p-10 shadow-md">
          <h1 className="text-4xl font-semibold text-slate-900">DataLens Admin Portal</h1>
          <p className="mt-3 text-slate-600 leading-7">
            Manage tenants, review impersonations, and configure application settings from the administration workspace.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/dashboard" className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700">
              Open admin dashboard
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
