export type SessionStatus = 'done' | 'scheduled' | 'no-show';

export type Session = {
  number: number;
  participant: string;
  detail: string;
  status: SessionStatus;
};

type SessionLogProps = {
  sessions: Session[];
};

const STATUS_STYLES: Record<SessionStatus, string> = {
  done: 'text-green border-green/50',
  scheduled: 'text-ink-soft border-rule-faint',
  'no-show': 'text-terra border-terra/50',
};

export function SessionLog({ sessions }: SessionLogProps) {
  return (
    <div>
      {sessions.map((session) => (
        <div
          key={session.number}
          className="flex items-center gap-[10px] py-[8px] border-b border-dashed border-rule-faint last:border-b-0"
        >
          <span className="w-[24px] h-[24px] flex-shrink-0 border-[1.5px] border-rule rounded-full flex items-center justify-center text-[10px] font-bold text-ink-soft">
            {String(session.number).padStart(2, '0')}
          </span>
          <div className="flex-1 min-w-0 text-[11.5px]">
            <span className="font-bold">{session.participant}</span>
            <span className="text-ink-soft"> · {session.detail}</span>
          </div>
          <span
            className={`flex-shrink-0 text-[9px] tracking-[1px] uppercase px-[7px] py-[2px] border-[1.5px] ${STATUS_STYLES[session.status]}`}
          >
            {session.status === 'no-show' ? 'no show' : session.status}
          </span>
        </div>
      ))}
    </div>
  );
}
