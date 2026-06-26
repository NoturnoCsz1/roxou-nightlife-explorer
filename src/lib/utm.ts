export function withUtm(
  path: string,
  opts: {
    source?: string;
    medium?: string;
    campaign?: string;
    content?: string;
    term?: string;
  } = {},
) {
  const {
    source = "roxou",
    medium = "site",
    campaign = "roxou",
    content,
    term,
  } = opts;
  const params = new URLSearchParams({
    utm_source: source,
    utm_medium: medium,
    utm_campaign: campaign,
  });
  if (content) params.set("utm_content", content);
  if (term) params.set("utm_term", term);
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}${params.toString()}`;
}
