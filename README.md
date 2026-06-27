# Beach-Tracker-
# 🌊 ShoreLine
### *Your Beach, All in One Place*

ShoreLine is a mobile community app for beachgoers — built for the surfer checking conditions before dawn and the family deciding whether it's safe to make the drive. It combines live beach conditions, a local community feed, events, and safety alerts into a single clean interface.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [API Integrations](#api-integrations)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Beachgoers today piece together information from weather apps, Facebook groups, and word-of-mouth. ShoreLine replaces that fragmented experience with one app that knows the wave height *and* whether the car park is full.

**Target users:**
- 🏄 **Surfers** who need fast, accurate swell and wind data with community hazard reports
- 👨‍👩‍👧 **Beach families** who prioritise safety, crowd levels, and family-friendly events

**Success targets (Month 6):**
- 25,000 Monthly Active Users
- 3+ sessions per user per week
- 40%+ Day-30 retention
- 10+ community posts per beach per week
- 70%+ alert open rate

---

## Features

### 🌤 Conditions Dashboard
Real-time beach conditions for any saved beach, loading in under 2 seconds:
- Wave height, wind speed & direction
- UV index, water temperature
- Tide times (next high & low)
- Crowd level (1–5 scale, user-reported, updated hourly)
- Lifeguard status (on duty / off duty / unknown)
- Flag colour (green / yellow / red / purple)
- 7-day wave and wind forecast (swipe to reveal)

### 📋 Community Feed
A local notice board anchored to each beach. Users post in six categories:
- General · Hazard Warning · Wildlife Sighting · Lost & Found · Tips · Free Stuff

Posts support optional photos, upvotes, beach tags, and timestamps. Every post has a report button feeding a moderation queue reviewed within 24 hours. Feed is filterable by category and sortable by newest or most upvoted.

### 📅 Events Board
Discover and create beach events — surf competitions, cleanups, volleyball games, family meetups. Each event includes title, date/time, location, description, capacity, and RSVP count. Filters: this week · family-friendly · surf · cleanup. RSVP triggers reminder notifications at 24h and 1h before the event.

### 🗺 Beach Map
Interactive map with beach pins showing flag colour and crowd level. Tap a pin to expand a compact conditions card. Save favourite beaches for quick access from the home screen.

### 🚨 Safety Alerts
Push notifications for:
- Red or purple flag raised
- Rip current reported
- Jellyfish bloom confirmed
- Shark sighting
- Dangerous UV forecast

Alert preferences are configured per saved beach, so users only receive what's relevant to them.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Mobile (iOS & Android)** | React Native, Expo |
| **Design System** | Tailwind-style design tokens, coastal aesthetic |
| **Backend** | Node.js, Express |
| **Database** | PostgreSQL + PostGIS (geospatial queries) |
| **Authentication** | Firebase Authentication (email, Google, Apple Sign-In) |
| **Push Notifications** | Firebase Cloud Messaging (FCM) |
| **Maps** | Mapbox GL (custom tile styling, marker clustering) |
| **Weather / Marine API** | Open-Meteo (MVP), Stormglass.io (scale-up) |
| **Tide Data** | NOAA CO-OPS API (US), TidesAtlas (international) |
| **Image Storage** | AWS S3 + CloudFront CDN |
| **Hosting** | AWS (EC2 + RDS), auto-scaling group |

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- Expo CLI (`npm install -g expo-cli`)
- PostgreSQL ≥ 14 with PostGIS extension
- Firebase project (Authentication + Cloud Messaging)
- Mapbox account (free tier covers 50,000 map loads/month)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/shoreline.git
cd shoreline

# Install dependencies
npm install

# Create a local database with PostGIS enabled
psql -U postgres -c "CREATE DATABASE shoreline;"
psql -U postgres -d shoreline -c "CREATE EXTENSION IF NOT EXISTS postgis;"

# Copy the example environment file
cp .env.example .env
# Edit .env and set DATABASE_URL and MAPBOX_ACCESS_TOKEN

# Seed beaches from OpenStreetMap
npm run seed

# Start the backend and static app
npm start
```

---

## Environment Variables

Create a `.env` file at the project root. See `.env.example` for the full template.

```env
DATABASE_URL=postgresql://user:password@localhost:5432/shoreline
MAPBOX_ACCESS_TOKEN=pk.your_mapbox_token
PORT=3000
```

---

## Project Structure

```
shoreline/
├── mobile/                    # React Native app (Expo)
│   ├── src/
│   │   ├── screens/
│   │   │   ├── HomeScreen.tsx          # Conditions dashboard
│   │   │   ├── FeedScreen.tsx          # Community feed
│   │   │   ├── EventsScreen.tsx        # Events board
│   │   │   ├── MapScreen.tsx           # Beach map
│   │   │   └── AlertsScreen.tsx        # Alert preferences
│   │   ├── components/                 # Shared UI components
│   │   ├── hooks/                      # Custom React hooks
│   │   ├── services/                   # API client functions
│   │   └── design/                     # Design tokens & theme
│   └── app.json
│
├── server/                    # Node.js + Express backend
│   ├── src/
│   │   ├── routes/
│   │   │   ├── beaches.js              # Beach lookup & conditions
│   │   │   ├── feed.js                 # Community posts
│   │   │   ├── events.js               # Events RSVP
│   │   │   ├── alerts.js               # Alert preferences
│   │   │   └── users.js                # Auth & user profile
│   │   ├── services/
│   │   │   ├── conditions.js           # Open-Meteo / Stormglass integration
│   │   │   ├── tides.js                # NOAA / TidesAtlas integration
│   │   │   ├── notifications.js        # FCM push notification service
│   │   │   └── moderation.js           # Post flagging & review queue
│   │   ├── middleware/
│   │   │   ├── auth.js                 # Firebase token verification
│   │   │   └── rateLimit.js
│   │   └── db/
│   │       ├── migrations/
│   │       └── queries/
│   └── package.json
│
├── .env.example
├── AGENTS.md
└── README.md
```

---

## API Integrations

### Wave & Marine Data

| API | Use | Cost |
|---|---|---|
| **Open-Meteo Marine** | Waves, swell, wind (MVP) | Free, no key required |
| **Stormglass.io** | Multi-source marine data (scale-up) | Free tier / from $29/mo |
| **World Weather Online** | Waves, tides, sea temp (international) | From $4/month |

### Tides

| API | Use | Cost |
|---|---|---|
| **NOAA CO-OPS** | Tide predictions — US only | Free, no key required |
| **TidesAtlas** | Tides — 112 countries, 3,000 stations | From $9/month |

### Other Services

| Service | Use | Cost |
|---|---|---|
| **Mapbox GL** | Beach map, custom styling, clustering | Free ≤ 50k loads/mo |
| **Firebase FCM** | Push notifications (iOS + Android) | Free |
| **Firebase Auth** | User authentication | Free |
| **AWS S3 + CloudFront** | Community post image storage & delivery | Pay-as-you-go |

---

## Roadmap

| Phase | Timeline | Deliverables |
|---|---|---|
| **Phase 1 — MVP** | Months 1–2 | Conditions dashboard, beach map, user auth, saved beaches, push alerts |
| **Phase 2 — Community** | Months 3–4 | Community feed, posts, photos, upvotes, categories, moderation tools |
| **Phase 3 — Events** | Months 4–5 | Events board, RSVP, event reminders, event map pins |
| **Phase 4 — Growth** | Month 6+ | 7-day forecast, shareable conditions cards, onboarding improvements, analytics dashboard |

**Out of scope for v1.0:**
- Monetisation / advertising
- Business listings or sponsored content
- Real-time chat or direct messaging
- User profile pages or follower system
- Surf brand API integrations
- AI-generated surf coaching

---

## Non-Functional Requirements

| Requirement | Target |
|---|---|
| Dashboard load time | < 2 seconds on 4G |
| App uptime | ≥ 99.5% |
| Data in transit | TLS 1.3 encrypted |
| Data at rest | AES-256 encrypted |
| Concurrent users | Supports 100,000 without degradation |
| Accessibility | WCAG 2.1 AA compliant |
| Privacy | Location data never shared with third parties |
| Offline | Last known conditions cached on device |

---

## Contributing

1. Fork the repository and create a feature branch (`git checkout -b feature/your-feature`)
2. Commit your changes with clear messages following [Conventional Commits](https://www.conventionalcommits.org/)
3. Open a pull request against `main` with a description of what changed and why
4. All PRs require one review and passing CI checks before merge

---

## License

Confidential — ShoreLine · v1.0 · June 2026