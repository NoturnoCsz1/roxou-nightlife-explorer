import { supabase } from "@/integrations/supabase/client";

/**
 * Fetches all rows from a Supabase query by paginating in chunks of 1000.
 * Use this instead of a single .select() when the table may have >1000 rows.
 */
export async function fetchAllRows<T = Record<string, unknown>>(
  buildQuery: () => any
): Promise<T[]> {
  const PAGE_SIZE = 1000;
  const allRows: T[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await buildQuery().range(from, from + PAGE_SIZE - 1);
    if (error || !data) break;
    allRows.push(...(data as T[]));
    if (data.length < PAGE_SIZE) {
      hasMore = false;
    } else {
      from += PAGE_SIZE;
    }
  }

  return allRows;
}
