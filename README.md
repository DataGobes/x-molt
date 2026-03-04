<p align="center">
  <h1 align="center">𝕏 molt</h1>
  <p align="center">
    <strong>Full-featured X.com account manager. From the terminal.</strong>
  </p>
  <p align="center">
    <a href="#install">Install</a> &bull;
    <a href="#features">Features</a> &bull;
    <a href="#cost-tracking">Cost Tracking</a> &bull;
    <a href="#archive-system">Archive</a> &bull;
    <a href="#tech-stack">Stack</a>
  </p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/X_API-Pay--per--use-1D9BF0?style=flat-square&logo=x" alt="X API" />
  <img src="https://img.shields.io/badge/UI-Ink_5_(React)-61DAFB?style=flat-square&logo=react" alt="Ink 5" />
  <img src="https://img.shields.io/badge/Search-SQLite_FTS5-003B57?style=flat-square&logo=sqlite" alt="SQLite FTS5" />
  <img src="https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/github/license/DataGobes/Molt?style=flat-square" alt="MIT License" />
</p>

---

```
  𝕏  x-molt v1.0.0
──────────────────────────────────────────────────
  Manage your X.com account from the terminal.

 ── Archive (FREE) ──────────────────────────────
  ❯ Import Archive     Import your X data archive          [FREE]
    Browse Tweets      Search & browse imported tweets      [FREE]
    Analytics          Visualize your archive data          [FREE]
    Batch Delete       Mass delete filtered tweets          [~$0.010]
    Generate Embeddings Enable semantic search on archive   [FREE]
 ── Tweets ──────────────────────────────────────
    Post Tweet         Compose and publish a tweet          [~$0.010]
    Delete Tweet       Delete a tweet by ID                 [~$0.010]
    Timeline           Browse home & your tweets            [~$0.050]
    Search             Search recent tweets on X            [~$0.050]
    Bookmarks          View your bookmarked tweets          [~$0.050]
 ── Social ──────────────────────────────────────
    Followers/Following View & manage social connections    [~$0.200]
    Lists              View & create lists                  [~$0.200]
 ── Messages ────────────────────────────────────
    DM Inbox           Read & send direct messages          [~$0.200]
 ── Account ─────────────────────────────────────
    My Profile         View your account info               [~$0.010]
    Cost Dashboard     View API spend analytics             [FREE]
 ── Setup ───────────────────────────────────────
    Credentials        Configure X API credentials          [FREE]
──────────────────────────────────────────────────
  ↑↓: navigate  │  enter: select  │  q: quit
```

---

## Why x-molt?

Birds molt to shed old feathers and grow new ones. Your X account deserves the same.

**x-molt** is a full-featured terminal UI for managing your X.com account. Import your archive into a local SQLite database with full-text search, browse your timeline, manage followers, send DMs, and batch-delete old tweets — all from the terminal with transparent cost tracking for X's pay-per-use API.

No subscriptions. No third-party services touching your data. Just a TypeScript TUI running on your machine.

## Features

### Archive (FREE — local SQLite only)

| Feature | Details |
|---|---|
| **Import Archive** | Supports `.zip` and extracted `.js` files — auto-discovers archive structure, validates with Zod |
| **Browse Tweets** | FTS5 full-text search, date tree navigation, split-pane detail view |
| **Analytics** | Activity heatmaps, engagement stats, privacy audit, ad targeting analysis |
| **Batch Delete** | Date range, keyword, reply/RT filters, rate-limited (45/15min), pausable with ETA |
| **Generate Embeddings** | Create vector embeddings for semantic search across tweets, DMs, likes, notes |

### Live X API Features

| Feature | Details | Cost |
|---|---|---|
| **Timeline** | Home feed & your tweets, tab switching, load more | ~$0.05/load (10 tweets) |
| **Search** | Search recent tweets on X with pagination | ~$0.05/query (10 results) |
| **Bookmarks** | View and manage bookmarked tweets | ~$0.05/load (10 tweets) |
| **Post Tweet** | Compose with 280-char counter, monthly limit tracking | $0.01/post |
| **Delete Tweet** | Delete by ID with confirmation | $0.01/delete |
| **Followers/Following** | Browse, follow/unfollow, block/mute actions | ~$0.20/load (20 users) |
| **Lists** | View owned lists, create new lists, manage members | ~$0.20/load (20 lists) |
| **DM Inbox** | Split-pane conversation view, compose & send | ~$0.20/load (20 events) |
| **Profile** | Account info, follower counts, join date | $0.01/view |
| **Interactions** | Like, retweet, bookmark, follow from any tweet view | $0.015/action |

### Cost Dashboard (FREE)

| Feature | Details |
|---|---|
| **Overview** | Session, daily, monthly, and all-time spend |
| **Endpoints** | Per-endpoint breakdown with call counts |
| **History** | 30-day sparkline chart of daily spend |
| **X Usage** | Live data from X's `/2/usage/tweets` endpoint — project cap, daily consumption |

## Install

```bash
git clone https://github.com/DataGobes/Molt.git
cd Molt
pnpm install
pnpm dev
```

That's it. First run launches the setup wizard.

## Setup

You need four credentials from the [X Developer Portal](https://developer.x.com/en/portal/dashboard):

```
App Key  ·  App Secret  ·  Access Token  ·  Access Secret
```

Two ways to configure:

**Interactive** (recommended) — `pnpm dev` walks you through it. Credentials are saved to `~/.config/x-molt/credentials.json` with `chmod 600`.

**Manual** — Copy `.env.example` to `.env` and fill in the values.

## Cost Tracking

X's API uses a pay-per-use model. x-molt tracks every cent so you're never surprised.

### X API Pricing

| Category | Unit Cost | Billing Model |
|----------|-----------|---------------|
| Posts: Read | $0.005 | per tweet returned |
| User: Read | $0.010 | per user returned |
| DM Event: Read | $0.010 | per event returned |
| Content: Create | $0.010 | per request |
| DM Interaction: Create | $0.015 | per request |
| User Interaction: Create | $0.015 | per request |

**Key distinction:** Read endpoints charge per *resource returned*, not per API call. Fetching 10 tweets costs 10 × $0.005 = $0.05.

### How x-molt tracks costs

- Every API call records `unit_cost × resource_count` in a local SQLite `api_usage` table
- `CostBadge` shows estimated cost inline before you take any action (e.g. `[~$0.050]`)
- Archive features are always `[FREE]` — they only use local SQLite
- Cost Dashboard shows session/daily/monthly/all-time breakdowns
- X Usage tab fetches live data from X's `/2/usage/tweets` to cross-check

### Spending safeguards

- Default `maxResults` kept low (10 tweets, 20 users) to limit per-load cost
- Cost shown upfront on every menu item and "load more" button
- All costs logged for full audit trail

## Keyboard

```
  ↑/↓ or j/k   Navigate menus and lists
  Enter         Select
  Esc           Go back
  q             Quit (main menu only)
  Tab or t      Switch tabs (timeline, social)
  m             Load more results
  R             Refresh current view
  /             New search (search screen)
  c             Compose message (DM inbox)
  s             Search (archive browser)
  p             Pause/resume (batch delete)
  n             New list (lists screen)

  ── Tweet Interactions (ActionBar) ──
  l             Like / Unlike
  r             Retweet / Unretweet
  b             Bookmark / Remove bookmark
  f             Follow / Unfollow author
```

## Batch Delete

```
┌─ Configure Filters ──────────────────────────────┐
│  Before date:     2023-01-01                      │
│  Keyword:         "crypto"                        │
│  Include replies: NO                              │
│  Include RTs:     NO                              │
└───────────────────────────────────────────────────┘

  ⚠ 2,847 tweets match your filters
  Estimated time: ~15h 49m (45 deletes per 15-min window)

  [██████████░░░░░░░░░░░░░░░░░░░░] 34%
  ✓ 968  ✗ 3  ⊘ 12  / 2,847
  ETA: 10h 24m
```

- **Rate-limited** — 45 of 50 slots per 15-min window (5-slot safety buffer)
- **~180 deletes/hour** — ETA shown upfront before you commit
- **Pause/resume** — step away, come back, pick up where you left off
- **Idempotent** — already-deleted tweets tracked in SQLite and skipped
- **Filters** — date range, keyword (FTS5), reply/retweet toggles, like count range

## Archive System

1. Request your archive at [x.com/settings/download_your_data](https://x.com/settings/download_your_data)
2. Import the `.zip` or extracted folder into x-molt (auto-discovers structure)
3. All data stored in local SQLite with FTS5 full-text search
4. Browse, search, analyze — then feed results into batch delete

### What gets imported

| Data | Storage |
|------|---------|
| Tweets + deleted tweets | `tweets` table with FTS5 |
| Likes | `likes` table |
| Followers / Following | `followers`, `following` tables |
| Blocks / Mutes | `blocks`, `mutes` tables |
| Direct Messages | `dm_conversations`, `direct_messages` tables |
| Note Tweets | `note_tweets` table |
| Grok Chats | `grok_chats` table |
| Ad Engagements & Impressions | `ad_engagements`, `ad_impressions`, `ad_targeting` tables |
| Account, Profile, IP Audit | `account`, `profile`, `ip_audit` tables |
| Connected Apps, Contacts | `connected_apps`, `contacts` tables |

## Tech Stack

| Tool | Why |
|---|---|
| [Ink 5](https://github.com/vadimdemedes/ink) + [@inkjs/ui](https://github.com/vadimdemedes/ink-ui) | React components that render to the terminal |
| [twitter-api-v2](https://github.com/PLhery/node-twitter-api-v2) | Fully typed X API client with OAuth 1.0a |
| [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) | Synchronous SQLite with FTS5 full-text search |
| [zod](https://github.com/colinhacks/zod) | Runtime validation of archive data and credentials |
| [date-fns](https://github.com/date-fns/date-fns) | Date formatting |
| [tsup](https://github.com/egoist/tsup) + [tsx](https://github.com/privatenumber/tsx) | Fast ESM builds and dev runner |
| [vitest](https://vitest.dev/) | Unit testing |

## Project Structure

```
src/
├── index.tsx                 Entry point
├── app.tsx                   Screen router + global key handlers
├── types.ts                  All shared types + Zod schemas
├── config.ts                 Credential loading (.env / ~/.config/x-molt/)
├── screens/
│   ├── main-menu.tsx         Grouped menu with cost badges
│   ├── setup.tsx             First-run credential wizard
│   ├── profile.tsx           Account info display
│   ├── post-tweet.tsx        Compose → preview → post
│   ├── delete-tweet.tsx      ID input → confirm → delete
│   ├── timeline.tsx          Home feed / my tweets (tabbed)
│   ├── search.tsx            Search recent tweets
│   ├── bookmarks.tsx         Bookmarked tweets browser
│   ├── social.tsx            Followers/following with actions
│   ├── lists.tsx             List management
│   ├── dm-inbox.tsx          Split-pane DM conversations
│   ├── import-archive.tsx    File path → parse → SQLite
│   ├── archive-browser.tsx   Date tree + FTS5 search + detail
│   ├── analytics.tsx         Archive data visualization
│   ├── batch-delete.tsx      Filter → preview → confirm → progress
│   ├── generate-embeddings.tsx  Vector embedding generation
│   └── cost-dashboard.tsx    Spend analytics + X usage
├── components/
│   ├── header.tsx / footer.tsx      Chrome
│   ├── tweet-card.tsx               Archive tweet display
│   ├── live-tweet-card.tsx          API tweet display (with author)
│   ├── action-bar.tsx               Like/RT/bookmark/follow actions
│   ├── cost-badge.tsx               Inline [~$0.050] / [FREE] display
│   ├── cost-confirm.tsx             Cost confirmation dialog
│   ├── date-tree.tsx                Year → Month → Day navigation
│   ├── detail-pane.tsx              Tweet detail view
│   ├── split-pane.tsx               Left/right split layout
│   ├── full-screen.tsx              Full-screen wrapper with header/footer
│   ├── tab-bar.tsx                  Tab switcher
│   ├── sparkline.tsx                Terminal sparkline chart
│   ├── bar-chart.tsx                Terminal bar chart
│   └── stat-grid.tsx                Stats grid display
├── services/
│   ├── twitter-client.ts     ~30 exported functions (read/write/interact/social/DM/usage)
│   ├── archive-parser.ts     Parse .js + .zip archives with Zod validation
│   ├── archive-store.ts      SQLite schema, FTS5, 20+ query methods
│   ├── archive-discovery.ts  Auto-detect archive file structure
│   ├── rate-limiter.ts       Endpoint-aware sliding window limiter
│   ├── cost-tracker.ts       Per-resource cost recording in SQLite
│   ├── embeddings.ts         Vector embedding generation
│   └── vector-store.ts       Vector similarity search
├── hooks/
│   ├── use-navigation.ts     Screen stack (push/pop)
│   ├── use-twitter.ts        Twitter API hook with error handling
│   ├── use-archive.ts        Archive store hook
│   ├── use-cost-tracker.ts   Cost tracking hook
│   ├── use-date-tree.ts      Date hierarchy navigation
│   └── use-terminal-size.ts  Responsive terminal dimensions
└── utils/
    ├── constants.ts          API costs, rate limits, X.com Chirp colors
    └── format.ts             Number/date/string formatting
```

## Contributing

PRs welcome. The codebase is standard React — if you've built a web app, you can build a screen for x-molt.

```bash
pnpm dev          # Dev mode with hot reload
pnpm build        # Production build → dist/index.js
pnpm test         # Run tests with vitest
```

## License

MIT
