# Production Readiness Review - Capture the Pub

## 🚨 CRITICAL ISSUES (Must Fix Before Launch)

### 1. Race Condition in Pub Captures ⚠️ **CRITICAL**

**File**: `app/api/capture/route.ts:42-78`

**Issue**: Multiple teams can capture the same pub simultaneously. There's no transaction or optimistic locking.

**Scenario**:
1. Team A reads pub (drink_count = 5)
2. Team B reads pub (drink_count = 5)
3. Team A inserts capture with drink_count = 6
4. Team B inserts capture with drink_count = 6 (should be 7!)
5. Both captures succeed, but data is inconsistent

**Impact**: During the actual game with multiple teams competing simultaneously, this WILL happen and cause disputes.

**Fix**: Add optimistic locking or use database transactions with row-level locking.

---

### 2. No Environment Variables Validation

**Issue**: No `.env.example` file and no validation that required env vars are set.

**Impact**: App will crash in production if any env var is missing, with cryptic errors.

**Required Env Vars**:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_EMAIL`
- `NEXT_PUBLIC_ADMIN_PASSWORD`

**Fix**: Create `.env.example` and add startup validation.

---

### 3. No Error Boundaries

**Issue**: No React Error Boundaries anywhere in the app.

**Impact**: If any component crashes, the entire app goes blank with no recovery.

**Fix**: Add error boundaries at key points (especially around real-time subscriptions and the main game view).

---

## ⚠️ HIGH PRIORITY ISSUES (Should Fix)

### 4. Admin Password in Client Code ⚠️

**File**: `app/admin/page.tsx:187, 196`

**Issue**: Admin password is compared client-side: `password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD`

**Impact**:
- Password is visible in client bundle
- Anyone can access admin panel by reading source code
- `NEXT_PUBLIC_*` vars are exposed to the browser

**Fix**: Move admin auth to a secure API route.

---

### 5. Video Upload Size Mismatch

**Files**:
- PRD says: 20MB max (`docs/capture-the-pub-prd.md:164`)
- Code says: 100MB max (`lib/hooks/useMediaUpload.ts:17`)
- Validation says: 500MB max (`lib/utils/media-compression.ts:71`)

**Impact**: Inconsistency and potential storage/bandwidth issues.

**Fix**: Standardize to 50MB for videos, 10MB for images (good mobile balance).

---

### 6. No Database Indexes on Hot Paths

**Issue**: No indexes on frequently queried columns:
- `captures(pub_id, created_at)` - EXISTS but good
- `captures(team_id)` - MISSING
- `challenge_attempts(team_id)` - MISSING
- `bonus_points(team_id, challenge_id)` - MISSING

**Impact**: Slow queries during active gameplay with many captures/challenges.

**Fix**: Add indexes before game starts.

---

### 7. Console.log Statements Everywhere

**Issue**: 148 console.log/warn/error statements across the codebase.

**Impact**:
- Performance overhead
- Potential security leaks (sensitive data in logs)
- Console spam in production

**Fix**: Wrap in development-only checks or use proper logging library.

---

## 📋 MEDIUM PRIORITY ISSUES

### 8. TypeScript `any` Types

**Issue**: Multiple `// TODO` comments with `any` types:
- `app/page.tsx:45, 48`
- `components/Scoreboard.tsx:27, 30, 33, 36`
- Multiple other files

**Impact**: Loss of type safety, potential runtime errors.

**Fix**: Define proper types for challenges, players, teams, etc.

---

### 9. No Offline Queue for Captures

**Issue**: If network drops during a capture, it fails completely.

**Impact**: Users lose their capture in spotty pub WiFi.

**Fix**: Implement offline queue with retry logic (or accept this limitation).

---

### 10. Push Notification Error Handling

**Issue**: `waitUntil` with `.catch()` that only logs errors.

**Impact**: Silent failures for push notifications - you won't know if they're working.

**Fix**: Add monitoring/alerting for failed notifications (already partially addressed with cleanup endpoint).

---

## ✅ DEPLOYMENT CHECKLIST

### Pre-Deploy

- [ ] Fix race condition in capture route (CRITICAL)
- [ ] Create `.env.example` file
- [ ] Validate all required env vars at startup
- [ ] Add error boundaries (at minimum around main game view)
- [ ] Move admin password check to server-side API route
- [ ] Standardize upload size limits
- [ ] Add missing database indexes
- [ ] Review and reduce console.log statements (keep only critical ones)
- [ ] Run database migrations on production database
- [ ] Test push notifications end-to-end in production
- [ ] Test PWA installation on iOS and Android
- [ ] Verify service worker updates correctly

### Environment Setup

- [ ] Set all required environment variables in Vercel/hosting
- [ ] Configure Supabase production database
- [ ] Set up Supabase storage bucket with correct permissions
- [ ] Generate new VAPID keys for production (don't reuse dev keys)
- [ ] Set secure admin password
- [ ] Enable Supabase RLS in production
- [ ] Configure CORS if needed

### Database Setup

- [ ] Run all 19 migration files in order
- [ ] Seed teams (migration 202501010009)
- [ ] Seed pubs (migration 202501010010)
- [ ] Seed challenges (migration 202501010012)
- [ ] Verify RLS policies are active
- [ ] Add missing indexes (captures.team_id, etc.)
- [ ] Set up database backups

### Testing

- [ ] Test complete game flow end-to-end
- [ ] Test simultaneous captures from multiple devices
- [ ] Test challenge completion (pub and global)
- [ ] Test push notifications
- [ ] Test offline behavior
- [ ] Test admin panel functions
- [ ] Test on actual phones (iOS + Android)
- [ ] Test with slow/intermittent network

### Monitoring

- [ ] Set up error tracking (Sentry, etc.)
- [ ] Set up uptime monitoring
- [ ] Set up database query monitoring
- [ ] Monitor Supabase storage usage
- [ ] Set up alerts for API errors
- [ ] Create admin dashboard to monitor game state

### Day-Of Prep

- [ ] Clear test data from database
- [ ] Reset game_state to inactive
- [ ] Test admin controls (start/stop game)
- [ ] Have backup plan if push notifications fail (reload app shows updates)
- [ ] Have backup plan if database goes down (graceful degradation)
- [ ] Monitor logs actively during event
- [ ] Have admin credentials ready
- [ ] Test `/api/push/cleanup` endpoint

---

## 🔧 QUICK FIXES YOU CAN DO NOW

### 1. Environment Variables

Create `.env.example`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Push Notifications (generate with: npx web-push generate-vapid-keys)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_public_key
VAPID_PRIVATE_KEY=your_private_key
VAPID_EMAIL=mailto:your_email

# Admin
NEXT_PUBLIC_ADMIN_PASSWORD=your_secure_password
```

### 2. Add Startup Validation

Create `lib/config/validate-env.ts`:

```typescript
export function validateEnv() {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_VAPID_PUBLIC_KEY',
    'VAPID_PRIVATE_KEY',
    'VAPID_EMAIL',
    'NEXT_PUBLIC_ADMIN_PASSWORD',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      `Please check your .env file`
    );
  }
}
```

Call this in your API routes or root layout.

---

## 🎯 PRODUCTION RECOMMENDATIONS

### What You MUST Fix
1. Race condition in captures (CRITICAL)
2. Admin password security
3. Add error boundaries

### What You SHOULD Fix
4. Environment variable validation
5. Standardize upload sizes
6. Add database indexes

### What You CAN Skip (Accept Risk)
7. Console.log cleanup (reduce but don't need to eliminate all)
8. TypeScript `any` types (annoying but won't break anything)
9. Offline queue (acceptable limitation for this use case)

---

## 📊 PERFORMANCE EXPECTATIONS

### Database Load
- 20 players × 17 pubs = 340 potential captures
- Assuming 3-4 captures per pub = ~60 captures total
- Realtime subscriptions: 20 concurrent connections
- Push notifications: 19 per capture/challenge (exclude sender)

### Storage
- ~60 captures × 5MB average = ~300MB
- ~8 pub challenges × 5MB = ~40MB
- ~2 global challenges × 2 teams × 5MB = ~20MB
- **Total: ~400MB for one game**

### Bandwidth
- Supabase free tier: 2GB/month egress
- Realtime: Minimal (just JSON)
- Storage: 400MB upload + viewing = ~1GB
- **Should be fine for one event**

---

## 🚀 LAUNCH DAY TIPS

1. **Start game 30 minutes early** - Give people time to install PWA and enable notifications
2. **Have admin panel open** - Monitor activity in real-time
3. **Watch logs** - Keep terminal open with Vercel logs streaming
4. **Phone a friend** - Have someone technical on standby
5. **Screenshot everything** - Capture funny moments for memories
6. **Backup plan** - Manual scoreboard on paper if everything fails
7. **Stay calm** - Minor bugs are expected and fun becomes part of the story!

---

## ❓ QUESTIONS TO ANSWER

1. **What happens if two teams capture at exact same time?**
   - Currently: Race condition, one might win unfairly
   - Fix: Implement optimistic locking

2. **What if someone's phone dies mid-game?**
   - Good: PWA will restore session when they reopen
   - Their notifications are gone but new ones will work

3. **What if push notifications stop working?**
   - Fallback: Users can manually refresh to see updates
   - Activity feed shows everything

4. **What if someone cheats?**
   - Admin can undo captures
   - Honor system is part of the game
   - Remember: It's a bucks party, not a bank!

---

## 📞 NEED HELP?

If something breaks during the game:

1. Check Vercel logs for errors
2. Check Supabase dashboard for database issues
3. Use `/api/push/cleanup` to fix notification issues
4. Use admin panel to manually fix game state
5. Worst case: Stop game, fix issue, restart

**Remember**: The goal is fun, not perfection! 🍻
