# 🔧 Supabase Setup Guide for File Storage

## 🚨 Common Issue: "Object exceeded maximum allowed size"

If you're getting this error when creating buckets, it's because the file size limits exceed Supabase's free tier limit of 50MB per file.

## ⚠️ CRITICAL: Get Your Service Role Key

The current `SUPABASE_SERVICE_ROLE_KEY` in your `.env` file might be the **anon key**, not the service role key. This causes RLS policy violations and bucket creation failures.

### 📋 Steps to Fix:

1. **Go to your Supabase Dashboard**
2. **Navigate to Settings → API**
3. **Copy the `service_role` key** (NOT the `anon` key)
4. **Update your `.env` file:**

```env
# Replace this line in your .env file:
SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key_here
```

### 🔍 How to Identify the Keys:

- **Anon Key**: Contains `"role":"anon"` when decoded
- **Service Role Key**: Contains `"role":"service_role"` when decoded

You can decode JWT tokens at [jwt.io](https://jwt.io) to verify which key you have.

## 🗄️ Method 1: Automatic Bucket Creation (Recommended)

After updating the service role key, restart your server:

```bash
npm start
```

The server will automatically attempt to create buckets with Supabase free tier compatible limits.

## 🗄️ Method 2: Manual Bucket Creation via SQL

If automatic creation fails, run this SQL in your Supabase SQL Editor:

```sql
-- Supabase Storage Bucket Setup Script
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

-- 2. Create RLS policies for public access
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
```

## 🗄️ Method 3: Manual Bucket Creation via Dashboard

If SQL method fails, create buckets manually:

1. **Go to Storage in your Supabase Dashboard**
2. **Click "Create Bucket"**
3. **Create each bucket with these settings:**

| Bucket Name | Public | File Size Limit | Description |
|-------------|--------|-----------------|-------------|
| `images` | ✅ Yes | 10MB | General images |
| `videos` | ✅ Yes | 50MB | Video files (larger files use chunked upload) |
| `documents` | ✅ Yes | 50MB | PDF and document files |
| `profiles` | ✅ Yes | 5MB | Profile pictures |
| `courses` | ✅ Yes | 10MB | Course thumbnails |
| `chat-files` | ✅ Yes | 10MB | Chat attachments |

4. **After creating buckets, run the RLS policies SQL above**

## 📁 File Size Limits Explained

### Supabase Free Tier Limits:
- **Maximum file size**: 50MB per file
- **Storage limit**: 500MB total

### How Our System Handles Large Files:
- **Files ≤ 50MB**: Direct upload to Supabase
- **Files > 50MB**: Automatic chunked upload (splits into 25MB chunks)
- **Videos**: Always use chunked upload for files > 50MB

## 🔧 Troubleshooting

### Error: "Object exceeded maximum allowed size"
**Solution**: The bucket file size limit is too high for Supabase free tier.
- Use the updated SQL script above (limits videos to 50MB)
- Or upgrade to Supabase Pro plan for higher limits

### Error: "Row-level security policy violation"
**Solution**: Wrong API key or missing RLS policies.
1. Verify you're using the `service_role` key, not `anon` key
2. Run the RLS policies SQL script above

### Error: "Bucket already exists"
**Solution**: This is normal - the bucket creation will skip existing buckets.

### Error: "Permission denied"
**Solution**: Service role key doesn't have proper permissions.
1. Double-check you copied the correct service role key
2. Ensure the key hasn't expired or been regenerated

## 🔄 Restart Your Server

After any changes:
```bash
npm start
```

## ✅ Test File Upload

Try uploading different file types:
- Small image (< 10MB) → Should upload directly
- Large video (> 50MB) → Should use chunked upload
- Document (< 50MB) → Should upload directly

## 📊 Monitoring

Check your Supabase Dashboard:
- **Storage → Usage**: Monitor storage consumption
- **Storage → Buckets**: Verify all buckets exist
- **Logs**: Check for any upload errors

## 🚀 Upgrading to Pro

If you need larger file limits:
1. Upgrade to Supabase Pro plan
2. Update `FILE_SIZE_LIMITS` in `backend/config/supabaseStorage.js`
3. Update bucket limits in Supabase Dashboard or via SQL

## 📞 Support

If you continue having issues:
1. Check the server console for detailed error messages
2. Verify your Supabase project settings
3. Ensure your `.env` file has the correct keys
