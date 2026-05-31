import Link from 'next/link';

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-lg">
        <h1 className="text-3xl font-semibold text-slate-900">Create an account</h1>
        <p className="mt-3 text-slate-600">Register your team and connect your first database to DataLens.</p>
        <form className="mt-8 space-y-5">
          <label className="block text-sm font-medium text-slate-700">Company email</label>
          <input type="email" placeholder="you@company.com" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900" />
          <label className="block text-sm font-medium text-slate-700">Password</label>
          <input type="password" placeholder="••••••••" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900" />
          <button type="submit" className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-700">Get started</button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-600">
          Already have an account? <Link href="/login" className="font-semibold text-slate-900 hover:text-slate-700">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
