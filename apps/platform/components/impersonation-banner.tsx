export function ImpersonationBanner() {
  return (
    <div className="rounded-3xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
      <strong className="font-semibold">Impersonation active:</strong> you are viewing the platform as another user. Actions taken here will only affect the current session.
    </div>
  );
}
