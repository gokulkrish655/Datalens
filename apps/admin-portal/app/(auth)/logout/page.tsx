import Link from 'next/link';

export default function AdminLogoutPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-lg text-center">
        <h1 className="text-3xl font-semibold text-slate-900">Signed out</h1>
        <p className="mt-3 text-slate-600">You have been signed out of the admin portal.</p>
        <Link href="/dashboard" className="mt-6 inline-flex rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700">
          Back to homepage
        </Link>
      </div>
    </main>
  );
}
