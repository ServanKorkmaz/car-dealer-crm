
# Feedback System Setup

This guide walks you through setting up the feedback system for ForhandlerPRO.

## Required Environment Variables

Set these in Replit Secrets:

### Supabase Configuration
```
SUPABASE_URL=your-supabase-project-url
SUPABASE_SERVICE_ROLE=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_STORAGE_BUCKET=feedback-shots
```

### Email Configuration (Microsoft 365)
```
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=support@forhandlerpro.no
SMTP_PASS=your-app-password-or-account-password
```

### Optional
```
APP_ENV=production
VITE_APP_VERSION=1.0.0
```

## Setup Steps

### 1. Database Migration
The migration will run automatically, but you can also run it manually:
```sql
-- Run the contents of migrations/009_feedback_system.sql
```

### 2. Supabase Storage Bucket
The bucket will be created automatically when the first feedback with screenshot is submitted, or you can create it manually:

1. Go to Supabase Dashboard → Storage
2. Create bucket named `feedback-shots`
3. Set it as public
4. Set file size limit to 5MB
5. Allow MIME types: `image/png`, `image/jpeg`, `image/jpg`

### 3. Email Setup
1. Get Microsoft 365 app password for `support@forhandlerpro.no`
2. Add to Replit Secrets as `SMTP_PASS`
3. Test email configuration by checking server logs

### 4. Test the System
Use the provided `test-feedback.http` file with REST Client:

1. Install REST Client extension in VS Code
2. Open `test-feedback.http`
3. Run the test requests
4. Verify:
   - Feedback appears in Supabase `feedback` table
   - Screenshots upload to `feedback-shots` bucket
   - Emails arrive at `support@forhandlerpro.no`

## Features

### Frontend
- Feedback button in top navigation bar
- Modal with form for type, severity, message, email, screenshot
- File upload with validation (5MB limit, PNG/JPEG only)
- Auto-population of technical context
- Toast notifications for success/error

### Backend
- Rate limiting (10 requests per 15 minutes per IP)
- Input validation with Zod
- Screenshot upload to Supabase Storage
- Email notifications with HTML formatting
- Activity logging
- RLS security policies

### Email Features
- Priority headers for critical issues
- Reply-To user email if provided
- HTML formatted with technical details
- Screenshot links
- Unique feedback ID for tracking

## Troubleshooting

### Email Not Sending
- Check SMTP credentials in Replit Secrets
- Verify `support@forhandlerpro.no` exists and has app password
- Check server logs for email errors

### Screenshots Not Uploading
- Verify `SUPABASE_STORAGE_BUCKET` secret is set
- Check bucket exists and is public
- Verify service role key has storage permissions

### Rate Limiting Issues
Rate limiting is disabled in development mode. In production:
- Each IP is limited to 10 feedback submissions per 15 minutes
- Returns 429 status with Norwegian error message

### Database Issues
- Ensure migration 009 has run successfully
- Check RLS policies are enabled
- Verify service role key has necessary permissions

## Monitoring

Check these for feedback system health:
- Server logs for errors
- Supabase dashboard for feedback entries
- Email inbox at `support@forhandlerpro.no`
- Supabase Storage usage for screenshot files
