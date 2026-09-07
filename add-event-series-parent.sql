-- Thin optional parent for concrete events.
-- Additive only: does not drop columns and does not touch occurrence_dates.

CREATE TABLE IF NOT EXISTS public.event_series (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS series_id TEXT
  REFERENCES public.event_series(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_events_series_id ON public.events(series_id);

ALTER TABLE public.event_series ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view event series" ON public.event_series;
CREATE POLICY "Anyone can view event series"
  ON public.event_series FOR SELECT
  USING (TRUE);

GRANT SELECT ON public.event_series TO anon, authenticated;

COMMENT ON TABLE public.event_series IS
  'Optional identity parent for related concrete events. Dates, posters, and attendance stay on events.';
