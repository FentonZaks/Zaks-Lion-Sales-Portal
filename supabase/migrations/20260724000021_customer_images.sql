
-- Create table for image metadata
CREATE TABLE IF NOT EXISTS public.customer_images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.customer_images ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access to customer_images metadata
CREATE POLICY "Enable full access for authenticated users" ON public.customer_images
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create the private storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('customer-images', 'customer-images', false)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for 'customer-images' bucket
CREATE POLICY "Allow authenticated users to read images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'customer-images');

CREATE POLICY "Allow authenticated users to upload images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'customer-images');

CREATE POLICY "Allow authenticated users to delete images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'customer-images');
