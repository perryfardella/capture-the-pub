# Production Upload Guide

## Overview

This guide covers the media upload implementation, best practices, and production considerations for handling photos and videos in Capture the Pub.

## Current Implementation

### Architecture

- **Direct Uploads**: Files upload directly from client to Supabase Storage (bypassing API route size limits)
- **Client-Side Compression**: Images are compressed before upload to reduce size while maintaining quality
- **Progress Tracking**: Upload progress is displayed to users
- **Validation**: File size and video duration are validated before upload

### Compression Settings

#### Images

- **Max Resolution**: 2560x2560px (increased from 1920px for better quality)
- **Quality**: 0.85 (increased from 0.8 for better quality)
- **Max Size**: 10MB (increased from 5MB)
- **Format**: Maintains original format (JPEG, PNG, WebP)

#### Videos

- **Max Duration**: 60 seconds
- **Max Size**: 100MB (supports 1-minute videos)
- **Compression**: Browser-based compression is limited; videos are validated but not compressed client-side

## Production Considerations

### 1. Supabase Storage Limits

#### Free Tier

- **File Size Limit**: 50MB per file
- **Storage**: 1GB total
- **Bandwidth**: 2GB/month

#### Pro Tier ($25/month)

- **File Size Limit**: 50GB per file (configurable)
- **Storage**: 100GB
- **Bandwidth**: 200GB/month

**Recommendation**: For 1-minute videos (often 50-200MB), you'll likely need the Pro tier or implement server-side compression.

### 2. File Size Management

**Current Limits**:

- Images: Up to 10MB (compressed)
- Videos: Up to 100MB (validated, not compressed)

**For 1-minute videos**:

- Typical smartphone video (1080p, 30fps): 50-150MB
- High-quality video (4K): 200-500MB+

**Options**:

1. **Upgrade to Supabase Pro** - Simplest solution, supports up to 50GB files
2. **Server-Side Compression** - Use FFmpeg or Cloudinary to compress videos
3. **Client-Side Recording Limits** - Limit video resolution/bitrate during recording

### 3. Upload Reliability

**Current Implementation**:

- Standard uploads for files < 6MB
- Resumable uploads recommended for files > 6MB (not yet implemented)

**Improvements Needed**:

- Implement true resumable uploads using Supabase's resumable upload API
- Add retry logic for failed uploads
- Handle network interruptions gracefully

### 4. Quality vs Speed Trade-offs

**Current Settings** (Balanced):

- Image quality: 0.85 (good balance)
- Max resolution: 2560px (high quality)
- Max size: 10MB (reasonable for mobile networks)

**For Faster Uploads** (Lower Quality):

```typescript
{
  maxImageSizeMB: 5,
  imageQuality: 0.75,
  maxImageWidth: 1920,
  maxImageHeight: 1920,
}
```

**For Better Quality** (Slower Uploads):

```typescript
{
  maxImageSizeMB: 15,
  imageQuality: 0.9,
  maxImageWidth: 3840, // 4K
  maxImageHeight: 3840,
}
```

### 5. Video Compression

**Current State**: Videos are validated but not compressed client-side.

**Why**: Browser-based video compression is complex and resource-intensive.

**Options**:

1. **Cloudinary** - Automatic video compression and optimization
2. **Supabase Edge Function + FFmpeg** - Server-side compression
3. **Client Recording Limits** - Limit resolution/bitrate at capture time

### 6. Error Handling

**Current Implementation**:

- File size validation
- Video duration validation
- Upload error display
- Basic error messages

**Improvements**:

- Retry failed uploads automatically
- Better error messages for common issues
- Network connectivity detection
- Offline queue for uploads

### 7. Security

**Storage Policies**:

- Public bucket with upload/read/delete policies
- Files are publicly accessible via URL
- Consider adding authentication checks if needed

**Recommendations**:

- Add RLS policies if you need authenticated-only uploads
- Consider signed URLs for private content
- Implement file type validation on server side

## Testing Checklist

Before going to production:

- [ ] Test with various image formats (JPEG, PNG, WebP, HEIC)
- [ ] Test with videos of different lengths (10s, 30s, 60s)
- [ ] Test with large files (near size limits)
- [ ] Test on slow network connections (3G simulation)
- [ ] Test upload interruption and recovery
- [ ] Test on different devices (iOS, Android, various screen sizes)
- [ ] Verify Supabase storage limits match your needs
- [ ] Test error handling (network failures, invalid files)
- [ ] Monitor upload success rates
- [ ] Check storage costs and bandwidth usage

## Monitoring

**Key Metrics to Track**:

- Upload success rate
- Average upload time
- File size distribution
- Storage usage
- Bandwidth usage
- Error rates by error type

**Supabase Dashboard**:

- Monitor storage usage in Supabase dashboard
- Set up alerts for storage limits
- Track API usage and costs

## Recommended Next Steps

1. **For Production**:

   - Upgrade to Supabase Pro if handling videos > 50MB
   - Implement server-side video compression (Cloudinary or FFmpeg)
   - Add retry logic for failed uploads
   - Set up monitoring and alerts

2. **For Better Performance**:

   - Implement true resumable uploads
   - Add offline upload queue
   - Optimize image compression further
   - Consider CDN for media delivery

3. **For Better UX**:
   - Add thumbnail previews
   - Show estimated upload time
   - Allow canceling uploads
   - Better error messages

## Code Examples

### Current Usage (CaptureDialog)

```typescript
const compressedFile = await compressMedia(file, {
  maxImageSizeMB: 10,
  maxVideoSizeMB: 100,
  imageQuality: 0.85,
  maxImageWidth: 2560,
  maxImageHeight: 2560,
});
```

### Adjusting for Your Needs

```typescript
// Faster uploads (lower quality)
const compressedFile = await compressMedia(file, {
  maxImageSizeMB: 5,
  imageQuality: 0.75,
  maxImageWidth: 1920,
  maxImageHeight: 1920,
});

// Better quality (slower uploads)
const compressedFile = await compressMedia(file, {
  maxImageSizeMB: 15,
  imageQuality: 0.9,
  maxImageWidth: 3840,
  maxImageHeight: 3840,
});
```

## Support

For issues or questions:

1. Check Supabase Storage documentation
2. Review error messages in browser console
3. Check Supabase dashboard for storage limits
4. Monitor network requests in browser DevTools
