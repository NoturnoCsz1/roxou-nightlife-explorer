export function withUtm(
  path: string,
  opts: { source?: string; medium?: string; campaign?: string } = {}
) {
  const { source = "roxou", medium = "site", campaign = "expo2026" } = opts;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}utm_source=${source}&utm_medium=${medium}&utm_campaign=${campaign}`;
}

export const EXPO_BASE_URL = "https://roxou.com.br/expo2026";
