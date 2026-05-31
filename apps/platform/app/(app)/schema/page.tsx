export default function SchemaPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold text-slate-900">Schema Explorer</h1>
        <p className="mt-3 text-slate-600">Browse table metadata, columns, and row filters before running queries.</p>
      </div>
      <div className="rounded-3xl bg-white p-8 shadow-sm">
        <p className="text-slate-600">Use the schema explorer to review data structures and semantic metadata.</p>
      </div>
    </div>
  );
}
