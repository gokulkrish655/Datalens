import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="rounded-3xl bg-white p-10 shadow-md">
          <h1 className="text-4xl font-semibold text-slate-900">DataLens Platform</h1>
          <p className="mt-3 text-slate-600 max-w-2xl leading-7">
            Welcome to DataLens. Manage your workspaces, connect databases, review schema, and launch intelligent query sessions from one central workspace.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/app/dashboard" className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700">
              Open Dashboard
            </Link>
            <Link href="/app/databases" className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50">
              Manage Databases
            </Link>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <article className="rounded-3xl bg-white p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Query Sessions</h2>
            <p className="mt-3 text-slate-600">Create interactive natural language queries, refine with clarifications, and save session context for repeatable analytics.</p>
          </article>
          <article className="rounded-3xl bg-white p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Schema Explorer</h2>
            <p className="mt-3 text-slate-600">Browse table and column metadata, inspect row filters, and understand data lineage before querying.</p>
          </article>
          <article className="rounded-3xl bg-white p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Access Controls</h2>
            <p className="mt-3 text-slate-600">Review access requests, approve data access, and keep audit trails for tenant and data governance.</p>
          </article>
        </section>
      </div>
    </main>
  );
}
