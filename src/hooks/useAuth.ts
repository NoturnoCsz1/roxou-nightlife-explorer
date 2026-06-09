import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

const INVALID_TOKEN_PATTERNS = [
  "bad_jwt",
  "invalid claim",
  "missing sub",
  "jwt malformed",
  "invalid token",
  "invalid jwt",
];

function isInvalidTokenError(err: unknown): boolean {
  if (!err) return false;
  const anyErr = err as { message?: string; code?: string; name?: string };
  const haystack = `${anyErr.message ?? ""} ${anyErr.code ?? ""} ${anyErr.name ?? ""}`.toLowerCase();
  return INVALID_TOKEN_PATTERNS.some((p) => haystack.includes(p));
}

async function clearInvalidLocalSession() {
  try {
    // eslint-disable-next-line no-console
    console.warn("[AUTH] Cleared invalid local session");
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // best-effort: nuke any sb-* keys directly
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith("sb-"))
        .forEach((k) => localStorage.removeItem(k));
    } catch {
      /* noop */
    }
  }
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error && isInvalidTokenError(error)) {
          await clearInvalidLocalSession();
          if (!mounted) return;
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }

        // If a session exists, revalidate against the Auth server to catch stale/invalid JWTs
        if (data.session) {
          const { error: userError } = await supabase.auth.getUser();
          if (userError && isInvalidTokenError(userError)) {
            await clearInvalidLocalSession();
            if (!mounted) return;
            setSession(null);
            setUser(null);
            setLoading(false);
            return;
          }
        }

        if (!mounted) return;
        setSession(data.session ?? null);
        setUser(data.session?.user ?? null);
        setLoading(false);
      } catch (err) {
        if (isInvalidTokenError(err)) {
          await clearInvalidLocalSession();
        }
        if (!mounted) return;
        setSession(null);
        setUser(null);
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = () => supabase.auth.signOut();

  return { user, session, loading, signOut };
}
