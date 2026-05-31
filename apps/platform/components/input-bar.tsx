export function InputBar() {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm">
      <label className="block text-sm font-medium text-slate-700">Ask DataLens</label>
      <textarea rows={4} className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-900 focus:border-slate-400 focus:outline-none" placeholder="Type a question about your data..." />
      <div className="mt-4 flex justify-end">
        <button className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700">
          Submit query
        </button>
      </div>
    </div>
  );
}
