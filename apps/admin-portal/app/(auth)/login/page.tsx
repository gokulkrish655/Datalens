import Link from 'next/link';

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-lg">
        <h1 className="text-3xl font-semibold text-slate-900">Admin sign in</h1>
        <p className="mt-3 text-slate-600">Sign in to manage tenant accounts and global settings.</p>
        <form className="mt-8 space-y-5">
          <label className="block text-sm font-medium text-slate-700">Email</label>
          <input type="email" placeholder="admin@example.com" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900" />
          <label className="block text-sm font-medium text-slate-700">Password</label>
          <input type="password" placeholder="••••••••" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900" />
          <button type="submit" className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-700">Sign in</button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-600">
          Need help? <Link href="/" className="font-semibold text-slate-900 hover:text-slate-700">Contact support</Link>
        </p>
      </div>
    </main>
  );
}
