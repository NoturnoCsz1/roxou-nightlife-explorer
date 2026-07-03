import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

export default defineTool({
  name: "search_events",
  title: "Search events",
  description: "Full-text search over published Roxou events by title, venue or description keyword.",
  inputSchema: {
    query: z.string().min(1).describe("Search keywords."),
    limit: z.number().int().min(1).max(50).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }) => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;
    if (!url || !key) {
      return { content: [{ type: "text", text: "Supabase env not configured." }], isError: true };
    }
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const pattern = `%${query}%`;
    const { data, error } = await supabase
      .from("events")
      .select("id,title,city,starts_at,venue_name,slug")
      .eq("status", "published")
      .or(`title.ilike.${pattern},venue_name.ilike.${pattern},description.ilike.${pattern}`)
      .order("starts_at", { ascending: true })
      .limit(limit ?? 15);
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { results: data ?? [] },
    };
  },
});
