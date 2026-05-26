
-- Restrict sensitive internal/AI columns of public.partners from anonymous reads.
-- Public anon can still SELECT non-sensitive columns; authenticated keeps full access.
REVOKE SELECT ON public.partners FROM anon;

GRANT SELECT (
  id, name, slug, type, address, neighborhood, city,
  instagram, short_description, full_description, logo_url,
  verified_partner, active, created_at, featured_home, status,
  instagram_validated, updated_at, latitude, longitude,
  maps_place_id, formatted_address,
  instagram_username, instagram_profile_url, instagram_id,
  instagram_name, instagram_bio, instagram_profile_picture_url,
  instagram_website, instagram_followers_count, instagram_media_count,
  aura_partner_score, aura_partner_tags,
  supports_sports
) ON public.partners TO anon;
