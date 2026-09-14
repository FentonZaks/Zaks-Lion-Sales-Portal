-- Drop the old constraint and add the new one allowing DRAFT_ORDER
ALTER TABLE public.activities DROP CONSTRAINT IF EXISTS activities_activity_type_check;
ALTER TABLE public.activities ADD CONSTRAINT activities_activity_type_check CHECK (activity_type IN ('VISIT', 'CALL', 'NOTE', 'DRAFT_ORDER'));

-- Add attachment_url column
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS attachment_url TEXT;

-- Create the private storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('draft-orders', 'draft-orders', false)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for 'draft-orders' bucket
CREATE POLICY "Allow authenticated users to read draft orders"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'draft-orders');

CREATE POLICY "Allow authenticated users to upload draft orders"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'draft-orders');

CREATE POLICY "Allow authenticated users to delete draft orders"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'draft-orders');
