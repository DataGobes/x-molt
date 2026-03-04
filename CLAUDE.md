# x-molt

Terminal UI for X.com account management, built with Ink 5 (React for the terminal).

## Quick Start

```bash
pnpm install
pnpm dev          # Run with tsx (development)
pnpm build        # Build to dist/index.js
pnpm start        # Run built version
pnpm test         # Run tests with vitest
```

## Stack

- **Ink 5** + **@inkjs/ui** — React-based terminal UI
- **twitter-api-v2** — X API client with OAuth 1.0a
- **better-sqlite3** — Synchronous SQLite for archive storage + FTS5
- **zod** — Runtime validation
- **date-fns** — Date formatting
- **tsup** + **tsx** — Build and dev runner
- **vitest** — Unit testing
- **pnpm** — Package manager

## Architecture

```
src/
├── index.tsx           # Entry point — renders <App />
├── app.tsx             # Root component, screen router, global key handlers
├── types.ts            # All shared types + Zod schemas
├── config.ts           # Credential loading (.env / ~/.config/x-molt/)
├── screens/            # One component per screen (17 screens)
├── components/         # Reusable UI (15 components)
├── services/           # Business logic (8 services)
├── hooks/              # React hooks (6 hooks)
├── scripts/            # CLI utilities (archive-stats)
└── utils/              # Constants and formatting helpers
```

### Screens

| Screen | File | Description |
|--------|------|-------------|
| Main Menu | `main-menu.tsx` | Grouped menu with cost badges per item |
| Setup | `setup.tsx` | First-run credential wizard |
| Profile | `profile.tsx` | Account info display |
| Post Tweet | `post-tweet.tsx` | Compose → preview → post |
| Delete Tweet | `delete-tweet.tsx` | ID input → confirm → delete |
| Timeline | `timeline.tsx` | Home feed / my tweets (tabbed, load more) |
| Search | `search.tsx` | Search recent tweets on X |
| Bookmarks | `bookmarks.tsx` | Bookmarked tweets browser |
| Social | `social.tsx` | Followers/following with follow/block/mute actions |
| Lists | `lists.tsx` | List management (view, create, members) |
| DM Inbox | `dm-inbox.tsx` | Split-pane conversations, compose & send |
| Import Archive | `import-archive.tsx` | Auto-discover → parse → SQLite import |
| Archive Browser | `archive-browser.tsx` | Date tree + FTS5 search + split-pane detail |
| Analytics | `analytics.tsx` | Activity heatmaps, engagement, privacy, ads |
| Batch Delete | `batch-delete.tsx` | Filter → preview → confirm → progress |
| Generate Embeddings | `generate-embeddings.tsx` | Vector embeddings for semantic search |
| Cost Dashboard | `cost-dashboard.tsx` | Spend analytics + X API usage endpoint |

### Key Patterns

- **Screen navigation**: `useNavigation` hook maintains a screen stack. `navigate()` pushes, `goBack()` pops. Global `Esc` = back, `q` on main menu = quit.
- **Twitter client**: Singleton initialized via `initClient()`. All API calls go through `services/twitter-client.ts`. `setCostTracker()` wires up cost recording.
- **Cost tracking**: `services/cost-tracker.ts` records `unit_cost × resource_count` per API call in `api_usage` SQLite table. `CostBadge` component shows `[~$0.050]` or `[FREE]` inline. Cost dashboard shows session/daily/monthly/all-time spend. X Usage tab fetches live data from `/2/usage/tweets`.
- **Per-resource billing**: Read endpoints charge per resource returned (tweet/user/event), not per API call. Write endpoints charge per request. All costs defined in `API_COSTS` map in `utils/constants.ts`.
- **Archive system**: `archive-parser.ts` handles both `.js` and `.zip` formats. `archive-discovery.ts` auto-detects file structure. `archive-store.ts` manages SQLite with FTS5 for full-text search and 20+ query methods.
- **Rate limiting**: Endpoint-aware `Map<string, Bucket>` rate limiter (`services/rate-limiter.ts`). `registerEndpoint()` for custom limits; default bucket preserves backward compat.
- **Batch delete**: AsyncGenerator pattern with AbortController for pause/cancel. Progress tracked in React state and rendered by `ProgressTracker`.
- **Live tweet rendering**: `LiveTweetCard` for API-fetched tweets (has author info), `TweetCard` for archive tweets. `ActionBar` adds like/RT/bookmark/follow actions with cost badges.
- **Grouped main menu**: Flat array with separator entries. `CostBadge` per item. Sections: Archive (FREE), Tweets, Social, Messages, Account, Setup.

### X API Pay-per-use Model

| Category | Unit Cost | Billing Model |
|----------|-----------|---------------|
| Posts: Read | $0.005 | per tweet returned |
| User: Read | $0.010 | per user returned |
| DM Event: Read | $0.010 | per event returned |
| Content: Create | $0.010 | per request |
| DM Interaction: Create | $0.015 | per request |
| User Interaction: Create | $0.015 | per request |

- Costs tracked in `API_COSTS` map (`utils/constants.ts`) — unit cost × resource count
- Archive features are FREE (local SQLite only)
- Cost tracking stored in `api_usage` SQLite table with session/endpoint breakdown
- Default `maxResults`: 10 for tweets, 20 for users/DMs/lists (to limit spend)

### UI Theme

Colors follow X.com's Chirp design system (`utils/constants.ts`):
- `BRAND_COLOR` = `#1D9BF0` (X.com blue)
- `ERROR_COLOR` = `#F4212E` (X.com red)
- `SUCCESS_COLOR` = `#00BA7C` (X.com green)
- `WARNING_COLOR` = `#FFD400` (X.com gold)
- `MUTED_COLOR` = `#71767B` (X.com secondary text)
- `COST_COLOR` = `#F5A623` (amber, for cost displays)

## Credentials

Loaded from (in order):
1. `.env` file (X_APP_KEY, X_APP_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET)
2. `~/.config/x-molt/credentials.json` (saved by setup screen with chmod 600)

## Data

- `data/archive.db` — SQLite database (gitignored)
- Tables: `tweets` (with FTS5), `likes`, `followers`, `following`, `blocks`, `mutes`, `direct_messages`, `dm_conversations`, `note_tweets`, `grok_chats`, `ip_audit`, `ad_engagements`, `ad_impressions`, `ad_targeting`, `connected_apps`, `contacts`, `device_tokens`, `apps`, `account`, `profile`, `post_log`, `api_usage`

## Common Tasks

- **Add a new screen**: Create `src/screens/my-screen.tsx`, add case to `app.tsx` switch, add to `Screen` type in `types.ts`, add menu item in `main-menu.tsx`.
- **Add a new API endpoint**: Add function to `twitter-client.ts` with `costTracker?.record("endpoint", resourceCount)`, add unit cost to `API_COSTS` in `constants.ts`, add wrapper to `use-twitter.ts`.
- **Modify archive schema**: Update `archive-store.ts` `init()` method. Consider migrations for existing DBs.
- **Change rate limits**: Update `ENDPOINT_RATE_LIMITS` in `utils/constants.ts`. Rate limiter reads from there.
- **Change API costs**: Update `API_COSTS` in `utils/constants.ts`. Cost tracker and CostBadge read from there.
- **Change default fetch sizes**: Update `maxResults` defaults in `twitter-client.ts` function signatures AND the corresponding screen files' hardcoded values AND CostBadge `count` props.
