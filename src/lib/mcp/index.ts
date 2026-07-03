import { defineMcp } from "@lovable.dev/mcp-js";
import listEventsTool from "./tools/list-events";
import listPartnersTool from "./tools/list-partners";
import searchEventsTool from "./tools/search-events";

export default defineMcp({
  name: "roxou-mcp",
  title: "Roxou MCP",
  version: "0.1.0",
  instructions:
    "Roxou is a nightlife discovery platform for cities in the interior of São Paulo, Brazil. Use `list_events` to browse upcoming published events (optionally by city), `search_events` for keyword queries, and `list_partners` to discover venues/bars/clubs. All data is public read-only.",
  tools: [listEventsTool, listPartnersTool, searchEventsTool],
});
