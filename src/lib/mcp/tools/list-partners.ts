import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

export default defineTool({
  name: "list_partners",
  title: "List partners (venues)",
  description: "List venues/partners registered on Roxou. Optionally filter by city or type (bar, club, restaurant, etc.).",
  inputSchema: {
    city: z.string().optional().describe("City filter."),
    type: z.string().optional().describe("Partner type filter."),
    limit: z.number().int().min(1).max(50).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ city, type, limit }) => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;
    if (!url || !key) {
      return { content: [{ type: "text", text: "Supabase env not configured." }], isError: true };
    }
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    let q = supabase
      .from("partners")
      .select("id,name,slug,city,type,logo_url")
      .order("name", { ascending: true })
      .limit(limit ?? 20);
    if (city) q = q.ilike("city", `%${city}%`);
    if (type) q = q.eq("type", type);
    const { data, error } = await q;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { partners: data ?? [] },
    };
  },
});
