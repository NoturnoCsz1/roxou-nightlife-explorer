export function withUtm(
  path: string,
  opts: { source?: string; medium?: string; campaign?: string } = {}
) {
  const { source = "roxou", medium = "site", campaign = "roxou" } = opts;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}utm_source=${source}&utm_medium=${medium}&utm_campaign=${campaign}`;
}
