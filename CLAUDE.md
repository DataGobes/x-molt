# x-molt

Terminal UI for X.com account management, built with Ink 5 (React for the terminal).

## Quick Start

```bash
pnpm install
pnpm dev          # Run with tsx (development)
pnpm build        # Build to dist/index.js
pnpm start        # Run built version
```

## Stack

- **Ink 5** + **@inkjs/ui** — React-based terminal UI
- **twitter-api-v2** — X API client with OAuth 1.0a
- **better-sqlite3** — Synchronous SQLite for archive storage + FTS5
- **zod** — Runtime validation
- **date-fns** — Date formatting
- **tsup** + **tsx** — Build and dev runner
- **pnpm** — Package manager

## Architecture

```
src/
├── index.tsx           # Entry point — renders <App />
├── app.tsx             # Root component, screen router, global key handlers
├── types.ts            # All shared types + Zod schemas
├── config.ts           # Credential loading (.env / ~/.config/x-molt/)
├── screens/            # One component per screen (main-menu, setup, profile, etc.)
├── components/         # Reusable UI (header, footer, tweet-card, tweet-list, etc.)
├── services/           # Business logic (twitter-client, archive-parser, archive-store, rate-limiter)
├── hooks/              # React hooks (use-navigation, use-twitter, use-archive)
└── utils/              # Constants and formatting helpers
```

### Key Patterns

- **Screen navigation**: `useNavigation` hook maintains a screen stack. `navigate()` pushes, `goBack()` pops. Global `Esc` = back, `q` on main menu = quit.
- **Twitter client**: Singleton initialized via `initClient()`. All API calls go through `services/twitter-client.ts`. `setCostTracker()` wires up cost recording.
- **Cost tracking**: `services/cost-tracker.ts` records per-endpoint costs in `api_usage` SQLite table. `CostBadge` component shows `[~$0.01]` or `[FREE]` inline. Cost dashboard shows session/daily/monthly/all-time spend.
- **Archive system**: `archive-parser.ts` handles both `.js` and `.zip` formats. `archive-store.ts` manages SQLite with FTS5 for full-text search.
- **Rate limiting**: Endpoint-aware `Map<string, Bucket>` rate limiter (`services/rate-limiter.ts`). `registerEndpoint()` for custom limits; default bucket preserves backward compat.
- **Batch delete**: AsyncGenerator pattern with AbortController for pause/cancel. Progress tracked in React state and rendered by `ProgressTracker`.
- **Live tweet rendering**: `LiveTweetCard` for API-fetched tweets (has author info), `TweetCard` for archive tweets. `ActionBar` adds like/RT/bookmark/follow actions with cost badges.
- **Grouped main menu**: Flat array with separator entries. `CostBadge` per item. Sections: Archive (FREE), Tweets, Social, Messages, Account, Setup.

### X API Pay-per-use Model

- Per-request pricing ($0.005-$0.01/call) tracked in `API_COSTS` map (`utils/constants.ts`)
- Archive features are FREE (local SQLite only)
- Cost tracking stored in `api_usage` SQLite table with session/endpoint breakdown

## Credentials

Loaded from (in order):
1. `.env` file (X_APP_KEY, X_APP_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET)
2. `~/.config/x-molt/credentials.json` (saved by setup screen with chmod 600)

## Data

- `data/archive.db` — SQLite database (gitignored)
- Tables: `tweets` (with FTS5 virtual table), `post_log`, `api_usage`

## Common Tasks

- **Add a new screen**: Create `src/screens/my-screen.tsx`, add case to `app.tsx` switch, add to `Screen` type in `types.ts`, add menu item in `main-menu.tsx`.
- **Modify archive schema**: Update `archive-store.ts` `init()` method. Consider migrations for existing DBs.
- **Change rate limits**: Update `utils/constants.ts`. Rate limiter reads from there.
