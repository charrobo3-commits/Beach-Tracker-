# AGENTS.md — ShoreLine
 
This file defines the roles, responsibilities, boundaries, and conventions for any AI agent (or human developer acting in an agent capacity) working on the ShoreLine codebase. Read this before opening a file, writing a line of code, or making any architectural decision.
 
---
 
## What Is ShoreLine?
 
ShoreLine is a mobile community app for beachgoers — families and surfers — that combines real-time beach conditions, a local community feed, events discovery, an interactive beach map, and push safety alerts. The stack is React Native (Expo) on the frontend, Node.js + Express on the backend, PostgreSQL + PostGIS for the database, and Firebase for auth and push notifications.
 
---
 
## Agent Roles
 
ShoreLine's agent system is divided into five specialised roles. Each agent operates within its defined scope and must not silently modify areas owned by another.
 
---
 
### 1. `conditions-agent`
 
**Owns:** All beach condition data fetching, caching, and transformation.
 
**Responsibilities:**
- Fetch wave height, wind speed/direction, UV index, water temperature, and swell data from Open-Meteo Marine API (MVP) or Stormglass.io (scale-up)
- Fetch tide times (high/low) from NOAA CO-OPS (US) or TidesAtlas (international)
- Cache conditions data with a 10-minute refresh window to reduce API call volume and keep the dashboard fast under load
- Transform raw API responses into a normalised `BeachConditions` object consumed by the frontend
- Serve a 7-day forecast when requested (extended API call, not included in the default conditions payload)
**Key files:**
```
server/src/services/conditions.js
server/src/services/tides.js
server/src/routes/beaches.js
```
 
**Rules:**
- Never expose raw API keys in responses or logs
- If the conditions API is unavailable, return the cached value and include a `stale: true` flag in the response — do not return an error to the client
- Crowd level is NOT sourced here; it comes from the `community-agent` and is merged at the route layer
- Flag colour and lifeguard status are NOT sourced from weather APIs; they come from user reports managed by the `community-agent`
**Output shape (`BeachConditions`):**
```typescript
{
  beachId: string
  updatedAt: string             // ISO 8601
  stale: boolean
  waveHeight: number            // metres
  swellHeight: number
  swellPeriod: number           // seconds
  swellDirection: number        // degrees
  windSpeed: number             // km/h
  windDirection: number         // degrees
  uvIndex: number
  waterTemp: number             // °C
  tides: {
    nextHigh: { time: string; height: number }
    nextLow:  { time: string; height: number }
  }
  forecast?: DailyForecast[]    // 7 items when requested
}
```
 
---
 
### 2. `community-agent`
 
**Owns:** Community feed posts, crowd level reporting, flag colour, lifeguard status, and content moderation.
 
**Responsibilities:**
- Accept new posts with text, optional image URL (post-S3 upload), beach tag, and category
- Validate post category against the allowed set: `General | Hazard Warning | Wildlife Sighting | Lost & Found | Tips | Free Stuff`
- Store and serve upvote counts; handle upvote toggle (one upvote per user per post)
- Accept crowd level reports (1–5) and compute the hourly aggregate for each beach; apply time-decay so old reports reduce in weight
- Accept flag colour and lifeguard status reports and surface the most recent verified value
- Accept post reports and write flagged posts to the moderation queue (target: reviewed within 24 hours)
- Support feed filtering by category and sorting by `newest` (default) or `most_upvoted`
**Key files:**
```
server/src/routes/feed.js
server/src/services/moderation.js
server/src/db/queries/posts.js
server/src/db/queries/crowd.js
```
 
**Rules:**
- A user may not upvote their own post — enforce at the API layer, not just the client
- Crowd level reports older than 3 hours should carry no weight in the aggregate
- Image uploads are handled upstream by the `storage-agent`; this agent receives only the final S3 URL, never raw file bytes
- Do not delete flagged posts automatically — move them to `moderation_queue` with status `pending`; a human or moderation tool reviews and resolves
**Database tables owned:**
- `posts`
- `upvotes`
- `crowd_reports`
- `flag_reports`
- `moderation_queue`
---
 
### 3. `events-agent`
 
**Owns:** Event creation, discovery, RSVP, and event-related notifications.
 
**Responsibilities:**
- Accept event creation with: title, date/time, location (beach ID + lat/lng pin), description, capacity, and event type
- Validate event type against the allowed set: `Surf | Cleanup | Family | Volleyball | Other`
- Store RSVP records; enforce capacity limits (reject RSVP when `rsvp_count >= capacity`)
- Trigger RSVP confirmation notifications via the `notifications-agent`
- Schedule RSVP reminder notifications at T-24h and T-1h before event start
- Support event listing filtered by: `this_week | family_friendly | surf | cleanup`
- Expose event pins (lat/lng + event type) for the beach map via a dedicated endpoint
**Key files:**
```
server/src/routes/events.js
server/src/db/queries/events.js
```
 
**Rules:**
- Event location must be associated with a valid `beach_id` from the `beaches` table — do not allow free-form location strings
- When capacity is 0, treat it as unlimited (do not block RSVPs)
- Cancelled events must be flagged with `status: cancelled` — do not delete them, as RSVPs reference them
- Reminder notifications are the responsibility of this agent to schedule; the `notifications-agent` handles delivery only
**Database tables owned:**
- `events`
- `rsvps`
---
 
### 4. `notifications-agent`
 
**Owns:** All push notification delivery and per-beach alert preference management.
 
**Responsibilities:**
- Manage user alert preferences per saved beach (stored as a per-beach toggle set)
- Deliver push notifications via Firebase Cloud Messaging (FCM) using topic subscriptions keyed to `beach:{beach_id}:{alert_type}`
- Handle the following alert types: `red_flag | purple_flag | rip_current | jellyfish | shark | uv_danger`
- Deliver event reminders on behalf of the `events-agent` (T-24h, T-1h)
- Deliver RSVP confirmation notifications on behalf of the `events-agent`
**Key files:**
```
server/src/services/notifications.js
server/src/routes/alerts.js
```
 
**Rules:**
- Never send a notification without verifying the user has opted in to that alert type for that specific beach
- Use FCM topic subscriptions (`beach:{beach_id}:{alert_type}`) rather than maintaining per-user device token lists in the database — this scales without per-user targeting logic
- If FCM delivery fails, log the failure with `beach_id`, `alert_type`, and timestamp — do not retry more than twice
- Alert triggers come from the `community-agent` (flag/rip reports) and `conditions-agent` (UV) — this agent does not own the trigger logic, only delivery
**Alert topic naming convention:**
```
beach:{beach_id}:red_flag
beach:{beach_id}:purple_flag
beach:{beach_id}:rip_current
beach:{beach_id}:jellyfish
beach:{beach_id}:shark
beach:{beach_id}:uv_danger
```
 
---
 
### 5. `storage-agent`
 
**Owns:** User-uploaded image handling (community post photos).
 
**Responsibilities:**
- Accept image uploads from authenticated users
- Validate file type (`image/jpeg`, `image/png`, `image/webp` only) and size (max 5MB)
- Upload validated files to AWS S3 under the `posts/` prefix with a UUID filename
- Return the final CloudFront CDN URL to the caller (typically the `community-agent` flow)
- Never store image bytes in the database — S3 URL only
**Key files:**
```
server/src/routes/upload.js
server/src/services/storage.js
```
 
**Rules:**
- Every upload must be tied to an authenticated user (verified Firebase token required)
- File names must be UUIDs — never use original filenames from the client
- Images are write-once; there is no update or overwrite operation
- Do not expose the raw S3 bucket URL; always return the CloudFront URL
---
 
## Cross-Agent Conventions
 
### Authentication
All protected endpoints verify a Firebase ID token via `server/src/middleware/auth.js`. The decoded `uid` is available as `req.user.uid` downstream. Agents must not implement their own auth logic.
 
### Error Responses
All agents return errors in this shape:
```json
{
  "error": true,
  "code": "HUMAN_READABLE_CODE",
  "message": "Plain English description of what went wrong."
}
```
Standard HTTP status codes apply: `400` for bad input, `401` for missing/invalid auth, `403` for permission violations, `404` for not found, `500` for unexpected failures.
 
### Geospatial Queries
All location-based queries use PostGIS. Use `ST_DWithin` for radius searches and `ST_Distance` for sorting by proximity. Never perform distance calculations in application code when PostGIS can do it.
 
### Data Ownership
Each agent owns specific database tables (listed above). An agent must not write to another agent's tables. Read access across tables is permitted where required (e.g. `conditions-agent` reads `beach_id` from the `beaches` table, which is shared/read-only).
 
### Logging
- Use structured JSON logs in production
- Always include `beach_id` and `user_id` (where applicable) in log entries
- Never log raw API keys, Firebase tokens, or user location coordinates
### Caching
- Conditions data: 10-minute TTL (managed by `conditions-agent`)
- Crowd level aggregate: recomputed hourly (managed by `community-agent`)
- All other data: no server-side cache in v1.0; rely on client-side React Query or SWR
---
 
## Shared Database Tables (Read-Only for All Agents)
 
| Table | Description |
|---|---|
| `beaches` | Master list of beach locations with name, lat/lng, and PostGIS geometry |
| `users` | User records synced from Firebase Auth (uid, email, display name) |
| `saved_beaches` | Junction table: user ↔ saved beach associations |
 
---
 
## Out of Scope for All Agents (v1.0)
 
The following must not be implemented by any agent without an explicit product decision and PRD update:
 
- Direct messaging or real-time chat between users
- User profile pages, follower relationships, or social graphs
- Monetisation, advertising, or sponsored content
- Surf brand or equipment API integrations
- AI-generated personalised recommendations or surf coaching
- Business listings or verified venue accounts
If a request touches any of these areas, the agent must flag it and halt rather than implement silently.
 
---
 
## Testing Expectations
 
Every agent is expected to maintain:
- **Unit tests** for all service-layer functions (conditions transformation, crowd level aggregation, etc.)
- **Integration tests** for all route handlers using a test database with PostGIS enabled
- **Mocks** for all external APIs (Open-Meteo, NOAA, Firebase, Mapbox) — no live API calls in CI
Test files live alongside source files: `conditions.test.js` next to `conditions.js`.
 
---
 
## Non-Functional Constraints (All Agents Must Respect)
 
| Constraint | Requirement |
|---|---|
| Transport encryption | TLS 1.3 on all external connections |
| Data at rest | AES-256 on RDS; S3 server-side encryption enabled |
| Privacy | User location coordinates are never logged or returned to third-party APIs beyond what is required for the conditions/tile query |
| GDPR | No user data shared with third parties; privacy policy shown at onboarding |
| Accessibility | API responses must support the frontend meeting WCAG 2.1 AA (correct data types, no truncation of screen-reader-relevant fields) |
| Performance | Conditions endpoint must respond in < 500ms (cache hit) or < 2000ms (cache miss) at the 95th percentile |
 
---
 
*ShoreLine · AGENTS.md · v1.0 · June 2026 · Confidential*