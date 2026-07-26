ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS activity_level text,
  ADD COLUMN IF NOT EXISTS cycle_regularity text,
  ADD COLUMN IF NOT EXISTS cycle_energy_impact text,
  ADD COLUMN IF NOT EXISTS work_style text;