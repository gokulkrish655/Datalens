import { MessageCard } from '../../../components/message-card';

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div className="rounded-3xl bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold text-slate-900">Dashboard</h1>
        <p className="mt-3 text-slate-600">Monitor query activity, database health, and recent access approvals.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <MessageCard title="Active Sessions" body="Track recent query sessions and continue conversations with your data." />
        <MessageCard title="Database sync" body="See the latest ingestion status and any connector alerts." />
        <MessageCard title="Access requests" body="Review pending approvals and governance status for your tenant." />
      </div>
    </div>
  );
}
