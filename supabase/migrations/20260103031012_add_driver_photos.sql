/*
  # Add Driver Photos Support

  1. Changes to profiles table
    - Add `photo_url` (text) - URL to driver's profile photo
  
  2. Storage
    - Create `driver-photos` storage bucket for profile images
    - Bucket is private with 5MB file size limit
    - Accepts JPEG, PNG, and WebP images
  
  3. Notes
    - Storage bucket policies will be managed through Supabase Storage UI
    - Photo URLs will be generated through Supabase Storage API
*/

-- Add photo_url to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'photo_url'
  ) THEN
    ALTER TABLE profiles ADD COLUMN photo_url text;
  END IF;
END $$;

-- Create storage bucket for driver photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'driver-photos',
  'driver-photos',
  false,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;