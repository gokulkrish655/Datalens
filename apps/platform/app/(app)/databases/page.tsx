export default function DatabasesPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold text-slate-900">Databases</h1>
        <p className="mt-3 text-slate-600">Manage your database connections, test connectors, and inspect sync status.</p>
      </div>
      <div className="rounded-3xl bg-white p-8 shadow-sm">
        <p className="text-slate-600">No database connections configured yet. Add a new connector to start exploring your tables and schemas securely.</p>
      </div>
    </div>
  );
}
