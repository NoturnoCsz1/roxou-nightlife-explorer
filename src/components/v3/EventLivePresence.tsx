import { useEventLivePresence } from '@/hooks/useEventLivePresence';

interface EventLivePresenceProps {
  eventId: string;
  className?: string;
}

export function EventLivePresence({ eventId, className = '' }: EventLivePresenceProps) {
  const { count } = useEventLivePresence(eventId);

  if (count <= 0) return null;

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium ${className}`}
      aria-label={`${count} pessoas online agora`}
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
      </span>
      <span>
        {count} online agora
      </span>
    </div>
  );
}
