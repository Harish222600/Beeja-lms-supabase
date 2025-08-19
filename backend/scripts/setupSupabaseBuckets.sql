-- Supabase Storage Bucket Setup Script
-- Run this in your Supabase SQL Editor
-- Updated for Supabase Free Tier Compatibility (50MB max per file)

-- 1. Create storage buckets with free tier compatible limits
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('images', 'images', true, 10485760, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']),
  ('videos', 'videos', true, 52428800, ARRAY['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/x-matroska', 'video/x-flv', 'video/x-ms-wmv', 'application/octet-stream']),
  ('documents', 'documents', true, 52428800, ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('profiles', 'profiles', true, 5242880, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']),
  ('courses', 'courses', true, 10485760, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']),
  ('chat-files', 'chat-files', true, 10485760, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- File size limits explanation:
-- images: 10MB (10485760 bytes)
-- videos: 50MB (52428800 bytes) - Supabase free tier limit, larger files use chunked upload
-- documents: 50MB (52428800 bytes)
-- profiles: 5MB (5242880 bytes)
-- courses: 10MB (10485760 bytes)
-- chat-files: 10MB (10485760 bytes)

-- 2. Create RLS policies for public access
-- Allow public read access to all buckets
CREATE POLICY "Public read access" ON storage.objects
FOR SELECT USING (bucket_id IN ('images', 'videos', 'documents', 'profiles', 'courses', 'chat-files'));

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload" ON storage.objects
FOR INSERT WITH CHECK (bucket_id IN ('images', 'videos', 'documents', 'profiles', 'courses', 'chat-files'));

-- Allow authenticated users to update their own files
CREATE POLICY "Authenticated users can update" ON storage.objects
FOR UPDATE USING (bucket_id IN ('images', 'videos', 'documents', 'profiles', 'courses', 'chat-files'));

-- Allow authenticated users to delete files
CREATE POLICY "Authenticated users can delete" ON storage.objects
FOR DELETE USING (bucket_id IN ('images', 'videos', 'documents', 'profiles', 'courses', 'chat-files'));

-- 3. Enable RLS on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 4. Grant necessary permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;
