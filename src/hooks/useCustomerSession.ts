/**
 * useCustomerSession — sessão do cliente final (Roxou).
 *
 * Wrapper sobre supabase.auth com Magic Link por e-mail.
 * Mantém estado global da sessão atual usando onAuthStateChange.
 */
import { useCallback, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface CustomerSessionState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

export function useCustomerSession() {
  const [state, setState] = useState<CustomerSessionState>({
    user: null,
    session: null,
    loading: true,
  });

  useEffect(() => {
    let mounted = true;

    // Listener primeiro
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setState({
        user: session?.user ?? null,
        session,
        loading: false,
      });
    });

    // Em seguida buscar sessão atual
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setState({
        user: data.session?.user ?? null,
        session: data.session,
        loading: false,
      });
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithEmail = useCallback(
    async (email: string, redirectTo: string) => {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: redirectTo,
        },
      });
      if (error) throw error;
    },
    [],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return { ...state, signInWithEmail, signOut };
}

export default useCustomerSession;
