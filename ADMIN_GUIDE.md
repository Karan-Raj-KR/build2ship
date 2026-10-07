# Admin Guide — Opportunity Workspace

## Overview

The admin panel is at `/admin`. It allows you to review, publish, and unpublish imported opportunities.

## Accessing Admin

In production, admin access requires the `is_admin` flag on your profile:

```sql
UPDATE profiles SET is_admin = true WHERE id = 'your-user-id';
```

In demo mode, all users have admin access.

## Publishing Opportunities

### From Import

1. Go to Discover → Import
2. Paste a URL or opportunity text
3. Review the extracted details
4. Edit any incorrect fields
5. Save — it goes to admin as "draft"
6. Go to Admin → click "Publish"

### Curated Feed

The 10 seed opportunities (GSoC, HackMIT, etc.) are pre-published. To update:

1. Go to Admin
2. Find the opportunity
3. Click "Unpublish" to remove from feed
4. Import the updated version from the source URL
5. Publish the new version

## Updating Stale Opportunities

Opportunities can become stale (deadlines pass, programs end). Review weekly:

1. Check deadlines in the admin list
2. Unpublish opportunities with past deadlines
3. Import updated versions if the program is recurring

## Monitoring Usage

### Admin Analytics

Go to `/api/admin/analytics` to see:

- Total users
- Funnel: onboarding → save → analysis → draft → submit
- Activation rate (saved + analyzed + drafted)

### Razorpay Dashboard

Monitor payments at dashboard.razorpay.com:
- Orders: check for successful captures
- Refunds: process refund requests
- Webhooks: verify delivery

### OpenAI Usage

Monitor at platform.openai.com/usage:
- Set billing alerts
- Watch for unusual spikes

## Common Issues

### User reports "extraction failed"

- Check if `OPENAI_API_KEY` is set
- Check OpenAI status page
- User can retry with text paste mode

### User reports "payment not verified"

- Check Razorpay dashboard for the payment
- Check webhook delivery logs
- Manually verify via Razorpay API if needed

### User reports "analysis seems wrong"

- Check if the user's profile is complete
- Check if the opportunity requirements are well-structured
- The analysis is advisory — remind users to verify on source

## Emergency Procedures

### Disable AI

Remove `OPENAI_API_KEY` from env vars. App will use regex fallback.

### Disable Checkout

Set `ENABLE_CHECKOUT=false`. Billing page will show "not enabled."

### Take Site Down (Vercel)

1. Go to Vercel Dashboard → Project → Settings
2. Under "General" → "Deployment Protection"
3. Enable "Password Protection" or "Deployment Suspension"

### Database Emergency

1. Go to Supabase Dashboard → Database
2. Check connection pool status
3. If needed, pause and resume the database
4. Restore from backup if data is corrupted
