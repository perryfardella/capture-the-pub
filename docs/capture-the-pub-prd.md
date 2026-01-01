# Capture the Pub — Product Requirements Document (PRD)

## Overview
Capture the Pub is a mobile-first web app designed for a bucks party game. Teams compete to capture and recapture pubs by drinking, completing challenges, and submitting photo/video evidence. The app tracks everything in real time and serves as both the live game engine and a memory log of the night.

The game never ends automatically — it only ends when the admin turns it off.

---

## Goals
- Extremely fast, mobile-first gameplay
- Real-time updates for all players
- Low-friction, honour-system based rules
- Fun activity feed with photos and videos
- Minimal admin intervention during play

---

## Non-Goals
- Desktop optimisation
- GPS or player tracking
- Anti-cheat enforcement
- Complex moderation workflows

---

## Users

### Player
- Joins a team
- Captures and recaptures pubs
- Attempts challenges
- Views scoreboard and activity feed

### Admin
- Controls game state
- Can override captures and teams
- Manages edge cases

---

## Game Rules

### Teams
- Pre-created by admin
- Colour-coded
- Players cannot change teams after joining (admin override only)

---

### Pubs
Each pub has:
- Name
- Current controlling team
- Current drink count
- Locked state (boolean)

Pubs can be captured and recaptured unlimited times unless locked.

---

### Capturing a Pub
To capture or recapture a pub:
1. The pub must not be locked
2. The team must submit:
   - Drink count = previous count + 1
   - One photo or video as evidence
3. Capture is submitted via a form

Rules:
- Captures are processed server-side
- If multiple teams submit, the **first valid submission wins**
- Ownership updates immediately for all players

---

### Pub-Specific Challenges (Locking Pubs)

Each pub has a unique challenge.

#### Step 1 — Start Challenge (Pay the Price)
- Team must consume at least one drink
- Evidence (photo/video) is required
- This action is logged in the activity feed
- Starting a challenge **does not affect pub control**

#### Step 2 — Attempt Challenge
- Team reports the outcome:
  - Success → pub becomes permanently locked and ownership transfers to the team
  - Failure → no effect
- Challenges can be retried
- Each retry requires another drink and evidence

Once locked, a pub cannot be recaptured.

---

### Global Challenges (Bonus Points)
- Do not lock pubs
- When completed:
  - Grant the team +1 bonus point
  - Bonus points count as extra pubs on the scoreboard
- Each global challenge can only be completed once total

---

## Scoreboard
Teams are ranked by:
- Number of pubs currently controlled
- Plus bonus points from global challenges

Updates in real time.

---

## Activity Feed
The feed displays:
- Pub captures and recaptures
- Challenge starts
- Challenge success or failure
- All uploaded photos and videos

All players can see all feed items.

---

## Game State
- Game has two states:
  - Active → captures and challenges allowed
  - Inactive → read-only mode
- Game only ends when admin turns it off
- After game end:
  - Feed, scoreboard, and media remain visible

---

## Session Persistence
- Players are restored automatically after refresh or reconnect
- No data loss during the game

---

## Admin Capabilities (MVP)
- Toggle game active/inactive
- Undo captures
- Reassign players to teams
- Lock or unlock pubs manually

Admin access via hidden route and password.

---

## Technical Stack (High Level)
- Frontend: Next.js (App Router), shadcn/ui, Tailwind
- Backend: Supabase (Postgres, Realtime, Storage)
- Media: Supabase Storage (public bucket)
- Realtime updates via Supabase subscriptions

---

## Constraints
- Mobile-first only
- Max media upload size: ~20MB
- One media file per submission
- Internet connection required to submit actions
