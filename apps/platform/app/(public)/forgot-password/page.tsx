import Link from 'next/link';

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-lg">
        <h1 className="text-3xl font-semibold text-slate-900">Reset password</h1>
        <p className="mt-3 text-slate-600">Enter your email address and we will send you a reset link.</p>
        <form className="mt-8 space-y-5">
          <label className="block text-sm font-medium text-slate-700">Email</label>
          <input type="email" placeholder="you@example.com" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900" />
          <button type="submit" className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-700">Send reset link</button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-600">
          Remembered your password? <Link href="/login" className="font-semibold text-slate-900 hover:text-slate-700">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
