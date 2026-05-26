// Shared admin/auth guards for Edge Functions
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResp(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export type AuthCheck =
  | { ok: true; userId: string; isAdmin: boolean }
  | { ok: false; response: Response };

async function checkAuth(req: Request, requireAdmin: boolean): Promise<AuthCheck> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { ok: false, response: jsonResp({ error: "Unauthorized" }, 401) };
  }
  const token = authHeader.replace("Bearer ", "");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data, error } = await supabase.auth.getClaims(token);
  const userId = data?.claims?.sub;
  if (error || !userId) {
    return { ok: false, response: jsonResp({ error: "Unauthorized" }, 401) };
  }

  let isAdmin = false;
  if (requireAdmin) {
    const { data: roleData } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    isAdmin = !!roleData;
    if (!isAdmin) {
      return { ok: false, response: jsonResp({ error: "Forbidden" }, 403) };
    }
  }

  return { ok: true, userId, isAdmin };
}

export const requireAdmin = (req: Request) => checkAuth(req, true);
export const requireUser = (req: Request) => checkAuth(req, false);
