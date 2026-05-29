import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const SESSION_KEY = 'roxou_live_session_id';

function getSessionId(): string {
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export function useEventLivePresence(eventId: string | null | undefined) {
  const [count, setCount] = useState<number>(0);
  const sessionRef = useRef<string>(getSessionId());
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;
    let heartbeatTimer: number | undefined;
    let countTimer: number | undefined;

    const heartbeat = async () => {
      if (document.hidden) return;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        userIdRef.current = user?.id ?? null;
        await supabase.from('event_live_presence').upsert(
          {
            event_id: eventId,
            session_id: sessionRef.current,
            user_id: userIdRef.current,
            last_seen_at: new Date().toISOString(),
          },
          { onConflict: 'event_id,session_id' }
        );
      } catch {
        // silent
      }
    };

    const fetchCount = async () => {
      try {
        const { data, error } = await supabase.rpc('count_event_live_presence', { _event_id: eventId });
        if (!cancelled && !error && typeof data === 'number') {
          setCount(data);
        }
      } catch {
        // silent
      }
    };

    // Initial
    heartbeat().then(fetchCount);

    // Heartbeat a cada 45s
    heartbeatTimer = window.setInterval(heartbeat, 45_000);
    // Atualiza contador a cada 30s
    countTimer = window.setInterval(fetchCount, 30_000);

    const onVisibility = () => {
      if (!document.hidden) {
        heartbeat();
        fetchCount();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    const onUnload = () => {
      try {
        supabase
          .from('event_live_presence')
          .delete()
          .eq('event_id', eventId)
          .eq('session_id', sessionRef.current);
      } catch {}
    };
    window.addEventListener('beforeunload', onUnload);

    return () => {
      cancelled = true;
      if (heartbeatTimer) window.clearInterval(heartbeatTimer);
      if (countTimer) window.clearInterval(countTimer);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('beforeunload', onUnload);
      // Cleanup presença
      supabase
        .from('event_live_presence')
        .delete()
        .eq('event_id', eventId)
        .eq('session_id', sessionRef.current)
        .then(() => {});
    };
  }, [eventId]);

  return { count };
}
