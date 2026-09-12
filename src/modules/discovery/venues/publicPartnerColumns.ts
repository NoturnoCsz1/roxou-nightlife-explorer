/**
 * Colunas de `partners` legíveis pelo papel anônimo (visitante deslogado).
 *
 * O banco revogou `SELECT` amplo em `public.partners` para `anon` e concedeu
 * apenas uma lista explícita de colunas públicas. Portanto qualquer leitura
 * pública precisa selecionar colunas explicitamente — `select("*")` resulta em
 * `permission denied for table partners`.
 */
export const PUBLIC_PARTNER_COLUMNS = [
  "id",
  "slug",
  "name",
  "type",
  "active",
  "status",
  "address",
  "formatted_address",
  "neighborhood",
  "city",
  "latitude",
  "longitude",
  "maps_place_id",
  "short_description",
  "full_description",
  "logo_url",
  "verified_partner",
  "featured_home",
  "instagram",
  "instagram_username",
  "instagram_profile_url",
  "instagram_name",
  "instagram_bio",
  "instagram_profile_picture_url",
  "instagram_website",
  "instagram_followers_count",
  "instagram_media_count",
  "instagram_validated",
  "whatsapp",
  "music_style_primary",
  "music_styles_secondary",
  "sports_competitions",
  "supports_sports",
  "created_at",
  "updated_at",
].join(",");
