# Push Notification Troubleshooting Guide

If notifications are being sent (visible in Chrome DevTools) but you're not seeing them on screen, check the following:

## Browser Settings

### Chrome
1. **Check Site Settings:**
   - Click the lock icon in the address bar
   - Click "Site settings"
   - Ensure "Notifications" is set to "Allow"
   - Check "Sound" is enabled if you want audio

2. **Check Chrome Notification Settings:**
   - Go to `chrome://settings/content/notifications`
   - Ensure your site is in the "Allowed" list
   - Disable "Quiet notification requests" if enabled

3. **Check Focus Mode:**
   - Chrome may suppress notifications when the tab is in focus
   - Try minimizing the browser or switching to another tab
   - Notifications should appear when the browser is in the background

### System Settings

#### macOS
1. **System Preferences → Notifications & Focus:**
   - Ensure Chrome is allowed to send notifications
   - Check "Do Not Disturb" is disabled
   - Check "Focus" modes aren't blocking notifications

2. **Notification Center:**
   - Open Notification Center (swipe from right edge or click date/time)
   - Check if notifications are appearing there but not as popups

#### Windows
1. **Settings → System → Notifications & actions:**
   - Ensure Chrome is allowed to send notifications
   - Check "Focus assist" is disabled
   - Check "Do not disturb" is disabled

2. **Action Center:**
   - Open Action Center (Windows key + A)
   - Check if notifications are appearing there

## Testing

1. **Test with browser minimized:**
   - Minimize Chrome completely
   - Send a test notification
   - It should appear as a system notification

2. **Test with browser in background:**
   - Open another application
   - Send a test notification
   - It should appear as a system notification

3. **Check notification history:**
   - Chrome DevTools → Application → Service Workers
   - Check the "Notifications" tab to see if notifications are being created

## Common Issues

- **Notifications only work when browser is in background:** This is normal browser behavior
- **Notifications appear in notification center but not as popups:** Check OS notification settings
- **No sound/vibration:** Check browser and OS sound settings, ensure `silent: false` in notification options
- **Notifications disappear immediately:** Check if `requireInteraction: true` is set (it is in our code)

## Mobile (PWA)

On mobile devices, notifications should appear as system notifications:
- **iOS:** Notifications appear in Notification Center and lock screen
- **Android:** Notifications appear in the notification shade

Ensure the PWA is installed and has notification permissions granted.

