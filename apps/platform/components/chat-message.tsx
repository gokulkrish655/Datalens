export interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  return (
    <div className={`rounded-3xl p-5 shadow-sm ${role === 'user' ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}`}>
      <div className="text-sm font-semibold uppercase tracking-[0.18em]">{role}</div>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-7">{content}</p>
    </div>
  );
}
