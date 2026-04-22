-- Scrubber: remove HTML tags from existing event descriptions.
-- Strategy: strip tags, decode common entities, collapse whitespace.
UPDATE public.events
SET description = NULLIF(
  TRIM(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(description, '<[^>]+>', ' ', 'g'),
          '&nbsp;', ' ', 'g'
        ),
        '&(amp|quot|lt|gt|#39);',
        ' ', 'g'
      ),
      '\s+', ' ', 'g'
    )
  ),
  ''
)
WHERE description ~ '<[^>]+>';