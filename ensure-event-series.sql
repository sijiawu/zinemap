-- Ensure an approved source event has a thin series parent.
-- Creates event_series when needed and links the source without bumping updated_at.

CREATE OR REPLACE FUNCTION public.ensure_event_series(source_event_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  source_row public.events%ROWTYPE;
  series_name TEXT;
  new_series_id TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO source_row
  FROM public.events
  WHERE id = source_event_id
    AND approved = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Approved source event not found';
  END IF;

  IF source_row.series_id IS NOT NULL THEN
    RETURN source_row.series_id;
  END IF;

  series_name := trim(both FROM regexp_replace(source_row.name, '\y(?:19|20)\d{2}\y', '', 'g'));
  series_name := trim(both FROM regexp_replace(series_name, '\s{2,}', ' ', 'g'));
  IF series_name = '' THEN
    series_name := trim(both FROM source_row.name);
  END IF;

  new_series_id := substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);

  INSERT INTO public.event_series (id, name)
  VALUES (new_series_id, series_name);

  ALTER TABLE public.events DISABLE TRIGGER update_events_updated_at;

  UPDATE public.events
  SET series_id = new_series_id
  WHERE id = source_row.id;

  ALTER TABLE public.events ENABLE TRIGGER update_events_updated_at;

  RETURN new_series_id;
EXCEPTION
  WHEN OTHERS THEN
    ALTER TABLE public.events ENABLE TRIGGER update_events_updated_at;
    RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_event_series(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_event_series(TEXT) TO authenticated;

COMMENT ON FUNCTION public.ensure_event_series(TEXT) IS
  'Returns series_id for an approved event; creates a thin parent and links the source without bumping updated_at.';
