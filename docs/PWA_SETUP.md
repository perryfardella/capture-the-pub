# PWA Setup Guide

## Overview

This app is now a Progressive Web App (PWA) with push notification support. Users can install it on their home screen and receive real-time notifications about game events.

## Benefits

- **Installable**: Add to home screen for app-like experience
- **Offline Support**: Cached assets work offline
- **Push Notifications**: Real-time alerts for captures, challenges, and game state changes
- **Faster Loading**: Service worker caches resources
- **Better UX**: Native app feel on mobile devices

## Setup Steps

### 1. Generate VAPID Keys

VAPID keys are required for push notifications. Generate them using:

```bash
npx web-push generate-vapid-keys
```

This will output:

- Public Key (starts with `B...`)
- Private Key (starts with `...`)

### 2. Set Environment Variables

Add these to your `.env.local` file:

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-public-key-here
VAPID_PRIVATE_KEY=your-private-key-here
VAPID_EMAIL=mailto:your-email@example.com
```

**Important**:

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` must be prefixed with `NEXT_PUBLIC_` to be accessible in the browser
- `VAPID_PRIVATE_KEY` should NEVER be exposed to the client
- `VAPID_EMAIL` is just your email address with `mailto:` prefix (e.g., `mailto:you@example.com`) - no account setup needed, it's just for identification

### 3. Create App Icons

Create two icon files in `public/`:

- `icon-192.png` (192x192 pixels)
- `icon-512.png` (512x512 pixels)

These should be square PNG images representing your app. You can use a tool like [PWA Asset Generator](https://github.com/onderceylan/pwa-asset-generator) to generate them.

### 4. Run Database Migration

Apply the push subscriptions migration:

```bash
supabase migration up
```

Or if using Supabase CLI:

```bash
supabase db push
```

### 5. Build and Test

Build the app:

```bash
pnpm build
pnpm start
```

**Note**: PWA features (service worker) are disabled in development mode. Test in production build.

## Testing Push Notifications

1. Build and run the production server
2. Open the app in a mobile browser (or Chrome DevTools mobile emulation)
3. Accept the notification permission prompt
4. Trigger a capture or challenge completion
5. You should receive a push notification

## How It Works

### Service Worker

- Automatically registered by `next-pwa`
- Handles push notifications and offline caching
- Located at `/sw.js` (auto-generated)

### Push Notifications

Notifications are sent when:

- A pub is captured
- A pub challenge is successfully completed (pub locked)
- A global challenge is completed (bonus point earned)

### Notification Flow

1. User grants notification permission
2. Browser creates push subscription
3. Subscription saved to `push_subscriptions` table
4. When game events occur, server sends notifications to all subscribed players (except the actor)

## Troubleshooting

### Notifications Not Working

1. Check VAPID keys are set correctly
2. Ensure you're testing in production build (not dev mode)
3. Check browser console for errors
4. Verify service worker is registered (Chrome DevTools > Application > Service Workers)

### Service Worker Not Registering

- Clear browser cache and reload
- Check `next.config.ts` - PWA is disabled in development
- Ensure HTTPS (required for service workers in production)

### Icons Not Showing

- Verify icon files exist in `public/` directory
- Check `manifest.json` has correct paths
- Clear browser cache

## Production Deployment

When deploying to production:

1. Set environment variables in your hosting platform
2. Ensure HTTPS is enabled (required for service workers)
3. Test push notifications on real devices
4. Monitor push subscription errors in logs

## Additional Resources

- [Web Push Protocol](https://web.dev/push-notifications-overview/)
- [next-pwa Documentation](https://github.com/shadowwalker/next-pwa)
- [VAPID Specification](https://tools.ietf.org/html/rfc8292)
