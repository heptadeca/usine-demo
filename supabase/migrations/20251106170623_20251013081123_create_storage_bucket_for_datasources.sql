/*
  # Create Storage Bucket for Datasources

  1. Storage
    - Create a new public bucket called `datasource-files` to store uploaded files
    - Enable public access for reading files
    - Set up RLS policies for secure uploads

  2. Security
    - Only authenticated users can upload files
    - Files are publicly readable (for n8n webhook access)
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('datasource-files', 'datasource-files', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload datasource files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'datasource-files');

CREATE POLICY "Public can read datasource files"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'datasource-files');