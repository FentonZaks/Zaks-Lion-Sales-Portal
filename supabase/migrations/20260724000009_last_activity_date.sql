
-- Add last_activity_date column
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS last_activity_date TIMESTAMPTZ;

-- Function to update last_activity_date
CREATE OR REPLACE FUNCTION public.update_last_activity_date()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.customers
    SET last_activity_date = (
      SELECT MAX(activity_date)
      FROM public.activities
      WHERE customer_id = NEW.customer_id
    )
    WHERE id = NEW.customer_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.customers
    SET last_activity_date = (
      SELECT MAX(activity_date)
      FROM public.activities
      WHERE customer_id = OLD.customer_id
    )
    WHERE id = OLD.customer_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to maintain last_activity_date
DROP TRIGGER IF EXISTS trg_update_last_activity_date ON public.activities;
CREATE TRIGGER trg_update_last_activity_date
AFTER INSERT OR UPDATE OR DELETE ON public.activities
FOR EACH ROW EXECUTE FUNCTION public.update_last_activity_date();

-- Retroactively populate the column for existing data
UPDATE public.customers c
SET last_activity_date = (
    SELECT MAX(activity_date)
    FROM public.activities a
    WHERE a.customer_id = c.id
);
