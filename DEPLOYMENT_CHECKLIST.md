# 🚀 Deployment Checklist - Capture the Pub

## ✅ Critical Fixes Applied

- [x] **Race condition in captures fixed** - Added optimistic locking
- [x] **Environment validation added** - Will fail fast if config is missing
- [x] **Error boundaries added** - App won't crash completely on errors
- [x] **Admin password secured** - Moved to server-side authentication
- [x] **Database indexes added** - Performance optimization migration created
- [x] **Push notification health checks** - Auto re-subscribe when expired

## 📝 Pre-Deployment Tasks

### 1. Environment Setup
- [ ] Copy `.env.example` to `.env`
- [ ] Set `NEXT_PUBLIC_SUPABASE_URL` from Supabase dashboard
- [ ] Set `NEXT_PUBLIC_SUPABASE_ANON_KEY` from Supabase dashboard
- [ ] Set `SUPABASE_SERVICE_ROLE_KEY` from Supabase dashboard
- [ ] Generate VAPID keys: `npx web-push generate-vapid-keys`
- [ ] Set `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (from VAPID generation)
- [ ] Set `VAPID_PRIVATE_KEY` (from VAPID generation)
- [ ] Set `VAPID_EMAIL` (e.g., `mailto:you@example.com`)
- [ ] Set strong `NEXT_PUBLIC_ADMIN_PASSWORD`

### 2. Database Migrations
Run all migrations in Supabase SQL Editor or via CLI:

```bash
# Connect to your production database
supabase link --project-ref YOUR_PROJECT_REF

# Push all migrations
supabase db push
```

**Verify these 20 migrations ran successfully**:
1. `202501010001_init_core_tables.sql` - Teams, players, pubs
2. `202501010002_gameplay_tables.sql` - Captures, challenges
3. `202501010003_game_state.sql` - Game state table
4. `202501010004_realtime_and_rls.sql` - Security policies
5. `202501010005_game_state_update_policy.sql`
6. `202501010006_toggle_game_state_function.sql`
7. `202501010007_enable_realtime_game_state.sql`
8. `202501010008_add_player_insert_policy.sql`
9. `202501010009_seed_teams.sql` - **Initial team data**
10. `202501010010_seed_pubs.sql` - **Initial pub data**
11. `202501010011_enable_realtime_tables.sql`
12. `202501010012_seed_challenges.sql` - **Challenge data**
13. `202501010013_add_media_to_bonus_points.sql`
14. `202501010014_storage_bucket_policies.sql`
15. `202501010015_allow_multiple_teams_global_challenges.sql`
16. `202501010016_add_player_id_to_activity_tables.sql`
17. `202501010017_push_subscriptions.sql`
18. `202501010018_add_pub_coordinates.sql`
19. `202501010019_fix_player_foreign_keys.sql` - **Player deletion fix**
20. `202501010020_add_performance_indexes.sql` - **NEW: Performance indexes**

### 3. Supabase Storage Setup
- [ ] Create `evidence` bucket in Supabase Storage
- [ ] Set bucket to **Public**
- [ ] Set file size limit to 100MB (or 500MB if needed)
- [ ] Verify upload policies allow authenticated uploads

### 4. Deploy to Production
- [ ] Push code to main branch (triggers Vercel deploy)
- [ ] Set all environment variables in Vercel dashboard
- [ ] Wait for deployment to complete
- [ ] Verify deployment URL is accessible

### 5. Post-Deployment Testing

#### Basic Functionality
- [ ] Open app in browser
- [ ] Install as PWA on your phone
- [ ] Join game with a test player
- [ ] Create a capture (test photo upload)
- [ ] Verify capture appears in activity feed
- [ ] Verify capture updates scoreboard
- [ ] Test challenge completion

#### Push Notifications
- [ ] Enable push notifications
- [ ] Create a capture from another device
- [ ] Verify push notification received
- [ ] Open notification - verify it navigates correctly
- [ ] Check service worker is active (DevTools > Application)

#### Admin Panel
- [ ] Navigate to `/admin`
- [ ] Login with admin password
- [ ] Toggle game state (active/inactive)
- [ ] Test player team reassignment
- [ ] Test deleting a test player
- [ ] Verify all admin functions work

#### Multi-Device Testing
- [ ] Test simultaneous captures from 2 devices
- [ ] Verify only one succeeds (optimistic locking working)
- [ ] Test on iOS Safari
- [ ] Test on Android Chrome
- [ ] Test on desktop browser

### 6. Pre-Event Preparation (Day Before)

#### Data Cleanup
- [ ] Delete all test players from admin panel
- [ ] Verify teams are correctly seeded
- [ ] Verify pubs are correctly seeded with coordinates
- [ ] Verify challenges are correctly seeded
- [ ] Set game_state to **INACTIVE**

#### Monitoring Setup
- [ ] Open Vercel dashboard for live logs
- [ ] Open Supabase dashboard for database monitoring
- [ ] Have admin panel ready in a browser tab
- [ ] Test push notification cleanup: `POST /api/push/cleanup`

#### Communication
- [ ] Share app URL with participants
- [ ] Share installation instructions (how to install PWA)
- [ ] Explain notification permission (important!)
- [ ] Set expectations about honor system

### 7. Event Day (Game Start)

30 Minutes Before:
- [ ] Give participants access to app URL
- [ ] Help them install PWA
- [ ] Have them enable push notifications
- [ ] Verify all players have joined

At Start Time:
- [ ] Open admin panel
- [ ] Toggle game state to **ACTIVE**
- [ ] Announce game has started
- [ ] Monitor Vercel logs for errors

During Event:
- [ ] Watch for 409 conflicts (simultaneous captures - this is working correctly!)
- [ ] Monitor push notification delivery
- [ ] Watch for 410 errors (subscriptions expiring - cleanup happens automatically)
- [ ] Be ready to use admin panel if needed

At End:
- [ ] Toggle game state to **INACTIVE**
- [ ] Announce winner
- [ ] Keep app running - activity feed is the memory log!

## 🆘 Emergency Procedures

### If Push Notifications Stop Working
1. Check Vercel logs for 410 errors
2. Run cleanup endpoint: `curl -X POST https://your-app.com/api/push/cleanup`
3. Have users close and reopen app (triggers health check)
4. Worst case: Have them manually refresh to see updates

### If Database Seems Slow
1. Check Supabase dashboard for active connections
2. Verify indexes are present: `SELECT * FROM pg_indexes WHERE tablename IN ('captures', 'pubs', 'challenges');`
3. If needed, manually add indexes from migration 202501010020

### If Simultaneous Captures Cause Issues
The 409 response is expected and correct! It means:
- Two teams tried to capture at exact same time
- One succeeded, one was told to retry
- This is working as designed
- Losing team should try again

### If Storage Fills Up
- Supabase free tier: 1GB storage
- Each game uses ~400MB
- Should handle 2-3 games before filling
- Can manually delete old evidence if needed

## 📊 Expected Load

- **Players**: ~20
- **Concurrent connections**: ~20 (realtime subscriptions)
- **Captures**: ~60 total
- **Push notifications**: ~1,200 total (60 captures × 19 recipients)
- **Storage**: ~400MB
- **Bandwidth**: ~1GB

All well within Supabase free tier limits! 🎉

## 🎯 Success Criteria

After deployment, you should have:
- ✅ App accessible at production URL
- ✅ PWA installable on iOS and Android
- ✅ Push notifications working
- ✅ All database tables seeded
- ✅ Admin panel accessible and functional
- ✅ Service worker registered and active
- ✅ Realtime updates working
- ✅ No console errors in browser
- ✅ Test captures working end-to-end

## 💡 Final Tips

1. **Do a full rehearsal** with 2-3 test devices the day before
2. **Take screenshots** during testing to compare against live
3. **Have a backup phone** to monitor if your main device is playing
4. **Don't panic** if minor issues occur - they add to the story!
5. **Trust the system** - error boundaries and health checks will handle most issues
6. **Remember** - It's a bucks party, not production banking software! 🍻

---

**You're ready to go live! Good luck with the event! 🎉**

Any questions or issues? Check the detailed docs in `/docs/` folder:
- `PRODUCTION_READINESS.md` - Comprehensive production review
- `PUSH_NOTIFICATION_MAINTENANCE.md` - Push notification troubleshooting
- `NOTIFICATION_TROUBLESHOOTING.md` - Device-specific notification issues
- `PWA_SETUP.md` - PWA installation guide
