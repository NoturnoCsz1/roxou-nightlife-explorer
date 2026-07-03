import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

export default defineTool({
  name: "list_events",
  title: "List upcoming events",
  description: "List upcoming published events on Roxou (nightlife discovery). Optionally filter by city.",
  inputSchema: {
    city: z.string().optional().describe("City name filter (e.g. 'Presidente Prudente')."),
    limit: z.number().int().min(1).max(50).optional().describe("Max rows (default 10)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ city, limit }) => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;
    if (!url || !key) {
      return { content: [{ type: "text", text: "Supabase env not configured." }], isError: true };
    }
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const nowIso = new Date().toISOString();
    let q = supabase
      .from("events")
      .select("id,title,city,date_time,venue_name,slug")
      .eq("status", "published")
      .gte("date_time", nowIso)
      .order("date_time", { ascending: true })
      .limit(limit ?? 10);
    if (city) q = q.ilike("city", `%${city}%`);
    const { data, error } = await q;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { events: data ?? [] },
    };
  },
});
