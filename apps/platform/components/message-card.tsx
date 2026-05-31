import React from 'react';

type MessageCardProps = {
  title: string;
  body: string;
};

export function MessageCard({ title, body }: MessageCardProps) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-medium text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{body}</p>
    </div>
  );
}

export default MessageCard;

