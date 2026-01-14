# Push Notification Subscription Maintenance

## Overview

Push notification subscriptions in PWAs can expire or become invalid for various reasons. This document explains how the app handles subscription maintenance and what to expect.

## Why Subscriptions Expire

Push subscriptions can expire due to:

1. **FCM Token Rotation**: Firebase Cloud Messaging (FCM) rotates tokens periodically for security
2. **Browser Updates**: Major browser updates may invalidate existing subscriptions
3. **User Actions**: Clearing browser data, uninstalling PWA, or revoking permissions
4. **Inactivity**: Long periods without app usage may cause tokens to expire
5. **Device Changes**: OS updates or device resets

## Automatic Subscription Management

The app now includes automatic subscription health monitoring:

### Health Check System

The `useSubscriptionHealthCheck` hook runs automatically when:
- App loads (after 10 seconds)
- App comes back into focus
- App visibility changes (tab becomes visible)
- Every 30 minutes while app is active

### What It Does

1. **Detects Mismatches**: Identifies when browser subscription doesn't match app state
2. **Auto Re-subscribes**: Attempts to re-subscribe users who previously granted permission
3. **Cleans Up**: Removes invalid subscriptions and resets notification prompts
4. **Silent Recovery**: Most issues are fixed automatically without user intervention

### Error Handling (410 Status)

When a notification fails with error 410 (expired/unsubscribed):
1. Server logs the failure with detailed info
2. Expired subscription is automatically removed from database
3. Client health check detects the missing subscription
4. User is prompted to re-subscribe on next app visit

## Manual Maintenance

### Cleanup Endpoint

For manual subscription cleanup (useful for debugging or periodic maintenance):

```bash
curl -X POST http://localhost:3000/api/push/cleanup
```

This endpoint:
- Validates all subscriptions in the database
- Removes subscriptions with invalid format
- Logs subscriptions older than 90 days (for review)
- Returns statistics on valid/invalid subscriptions

### Debug Panel

Add `?debug` to any URL to show the debug panel:
- View current subscription status
- Check service worker state
- Send test notifications
- View server-side subscription count

Example: `https://your-app.com/?debug`

## Best Practices

### For Users

1. **Keep App Updated**: Regular app visits help maintain subscription health
2. **Don't Clear Browser Data**: This will invalidate subscriptions
3. **Keep Permissions Granted**: Revoking notification permission breaks subscriptions

### For Developers

1. **Monitor Logs**: Watch for 410 errors in production logs
2. **Regular Cleanup**: Run cleanup endpoint weekly to maintain database hygiene
3. **Check Health**: Use debug panel to verify subscription health
4. **TTL Settings**: Current TTL is 1 hour - adjust in `lib/utils/push-notifications.ts` if needed

## Monitoring

### Server Logs

Look for these log patterns:

✅ Success:
```
Push notification sent successfully
```

⚠️ Expired Subscription:
```
⚠️ Subscription expired/invalid (410), removing from database
✅ Expired subscription removed from database
```

### Client Logs

Look for these health check patterns:

```
[SubscriptionHealthCheck] Running health check...
[SubscriptionHealthCheck] ✅ Health check complete
```

Or issues:
```
[SubscriptionHealthCheck] ⚠️ Subscription mismatch
[SubscriptionHealthCheck] 🔄 Attempting automatic re-subscription...
```

## Troubleshooting

### Notifications Not Working

1. Check debug panel (`?debug`):
   - Is subscription active?
   - Is service worker running?
   - Does test notification work?

2. Check browser console for health check logs

3. Try manual cleanup endpoint

4. Clear `notification-prompt-dismissed` from localStorage to force re-subscription

### High 410 Error Rate

If seeing many 410 errors:

1. Check if users are clearing browser data frequently
2. Verify VAPID keys haven't changed
3. Run cleanup endpoint to remove stale subscriptions
4. Consider adjusting TTL (currently 1 hour)

## Expected Behavior

### Normal Operation

- Subscriptions should last weeks/months without issues
- Occasional 410 errors are normal (< 1% of sends)
- Health check runs silently in background
- Most users never see re-subscription prompt

### After Subscription Expires

1. Server detects 410 error on next notification send
2. Expired subscription removed from database
3. Client health check runs within 30 minutes
4. User sees notification prompt again on next app visit
5. User re-subscribes (one tap)
6. Notifications resume working

## Future Improvements

Consider implementing:

1. **Proactive Validation**: Periodically test all subscriptions with dummy notifications
2. **Subscription Renewal Reminders**: Notify users before subscriptions expire
3. **Analytics**: Track subscription churn rate and causes
4. **Graceful Degradation**: Fall back to polling if notifications unavailable
