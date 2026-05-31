import Link from 'next/link';

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-lg">
        <h1 className="text-3xl font-semibold text-slate-900">Choose a new password</h1>
        <p className="mt-3 text-slate-600">Set a secure password for your account.</p>
        <form className="mt-8 space-y-5">
          <label className="block text-sm font-medium text-slate-700">New password</label>
          <input type="password" placeholder="••••••••" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900" />
          <button type="submit" className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-700">Update password</button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-600">
          <Link href="/login" className="font-semibold text-slate-900 hover:text-slate-700">Back to sign in</Link>
        </p>
      </div>
    </main>
  );
}
