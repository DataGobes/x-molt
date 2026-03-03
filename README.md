<p align="center">
  <h1 align="center">𝕏 x-molt</h1>
  <p align="center">
    <strong>Shed your old tweets. From the terminal.</strong>
  </p>
  <p align="center">
    <a href="#install">Install</a> &bull;
    <a href="#features">Features</a> &bull;
    <a href="#batch-delete">Batch Delete</a> &bull;
    <a href="#archive-system">Archive</a> &bull;
    <a href="#tech-stack">Stack</a>
  </p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/X_API-Free_Tier-1DA1F2?style=flat-square&logo=x" alt="X API Free Tier" />
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

  ❯ Post Tweet         Compose and publish a tweet
    Delete Tweet       Delete a tweet by ID
    My Profile         View your account info
    Import Archive     Import your X data archive
    Browse Tweets      Search & browse imported tweets
    Batch Delete       Mass delete filtered tweets
──────────────────────────────────────────────────
  ↑↓: navigate  │  enter: select  │  q: quit
```

---

## Why x-molt?

Birds molt to shed old feathers and grow new ones. Your X account deserves the same.

**The problem:** You have 12 years of tweets. Some aged poorly. The X website lets you delete them one. at. a. time.

**x-molt** imports your full archive into a local SQLite database with full-text search, lets you filter by date/keyword/type, and batch-deletes at the maximum rate the Free API tier allows — **~180 tweets/hour**, hands-free, with pause/resume.

No subscriptions. No third-party services touching your data. Just a TypeScript TUI running on your machine.

## Features

| | Feature | Details |
|---|---|---|
| **Post** | Compose tweets | 280-char live counter, monthly limit tracking (1,500/mo) |
| **Delete** | Remove by ID | Paste a tweet ID, confirm, done |
| **Profile** | View your stats | Followers, following, tweets, join date |
| **Import** | Load your archive | Supports `tweets.js` and `.zip` — parsed with Zod validation |
| **Search** | Full-text search | SQLite FTS5 across your entire tweet history |
| **Batch Delete** | Mass delete | Date range, keyword, reply/RT filters, rate-limited, pausable |

## Install

```bash
git clone https://github.com/DataGobes/Molt.git
cd Molt
pnpm install
pnpm dev
```

That's it. First run launches the setup wizard.

## Setup

You need four credentials from the [X Developer Portal](https://developer.x.com/en/portal/dashboard) (Free tier):

```
App Key  ·  App Secret  ·  Access Token  ·  Access Secret
```

Two ways to configure:

**Interactive** (recommended) — `pnpm dev` walks you through it. Credentials are saved to `~/.config/x-molt/credentials.json` with `chmod 600`.

**Manual** — Copy `.env.example` to `.env` and fill in the values.

## Keyboard

```
  ↑/↓        Navigate menus
  Enter      Select
  Esc        Go back
  q          Quit (main menu)
  j/k        Scroll tweet lists
  s          Search (archive browser)
  p          Pause/resume (batch delete)
  c          Cancel (batch delete)
```

## Batch Delete

The killer feature. Here's how it works:

```
┌─ Configure Filters ──────────────────────────────┐
│  Before date:     2023-01-01                      │
│  Keyword:         "crypto"                        │
│  Include replies: NO                              │
│  Include RTs:     NO                              │
│  ─────────────────────────────────────────────── │
│  Preview matching tweets →                        │
└───────────────────────────────────────────────────┘

  ⚠ 2,847 tweets match your filters
  Estimated time: ~15h 49m (45 deletes per 15-min window)

  ❯ Start deleting
    Adjust filters
    Cancel

  [██████████░░░░░░░░░░░░░░░░░░░░] 34%
  ✓ 968  ✗ 3  ⊘ 12  / 2,847
  ETA: 10h 24m
  ─────────────────────────────
  p: pause  │  c: cancel
```

- **Rate-limited** — 45 of 50 slots per 15-min window (5-slot safety buffer)
- **~180 deletes/hour** — ETA shown upfront before you commit
- **Pause/resume** — step away, come back, pick up where you left off
- **Idempotent** — already-deleted tweets are tracked in SQLite and skipped on re-runs
- **Filters** — date range, keyword (FTS5), include/exclude replies and retweets

## Archive System

1. Request your archive at [x.com/settings/download_your_data](https://x.com/settings/download_your_data)
2. Import the `.zip` or extracted `tweets.js` into x-molt
3. All tweets stored in a local SQLite database with FTS5 full-text search
4. Browse, search, and filter — then feed results into batch delete

The archive parser handles X's `window.YTD.tweets.part0 = [...]` format, validates every tweet with Zod, and imports via a single SQLite transaction.

## Tech Stack

| | Tool | Why |
|---|---|---|
| **UI** | [Ink 5](https://github.com/vadimdemedes/ink) + [@inkjs/ui](https://github.com/vadimdemedes/ink-ui) | React components that render to the terminal — same tech behind GitHub Copilot CLI |
| **API** | [twitter-api-v2](https://github.com/PLhery/node-twitter-api-v2) | Fully typed, OAuth 1.0a, handles all the X API quirks |
| **Storage** | [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) | Synchronous SQLite with FTS5 full-text search — no server needed |
| **Validation** | [zod](https://github.com/colinhacks/zod) | Runtime validation of archive data and credentials |
| **Build** | [tsup](https://github.com/egoist/tsup) + [tsx](https://github.com/privatenumber/tsx) | Fast ESM builds and dev runner |

## Project Structure

```
src/
├── index.tsx                 Entry point
├── app.tsx                   Screen router + global keys
├── types.ts                  Shared types + Zod schemas
├── config.ts                 Credential loading (.env / ~/.config/x-molt/)
├── screens/
│   ├── main-menu.tsx         Home
│   ├── setup.tsx             First-run credential wizard
│   ├── post-tweet.tsx        Compose → preview → post
│   ├── delete-tweet.tsx      ID input → confirm → delete
│   ├── profile.tsx           Fetch + display account info
│   ├── import-archive.tsx    File path → parse → SQLite
│   ├── archive-browser.tsx   Search + browse + detail view
│   └── batch-delete.tsx      Filter → preview → confirm → progress
├── components/               Header, footer, tweet card, progress bar, char counter
├── services/
│   ├── twitter-client.ts     Thin wrapper around twitter-api-v2
│   ├── archive-parser.ts     Parse tweets.js + .zip archives
│   ├── archive-store.ts      SQLite schema, FTS5, queries
│   └── rate-limiter.ts       Sliding window rate limiter
├── hooks/                    useNavigation, useTwitter, useArchive
└── utils/                    Constants + formatting
```

## Contributing

PRs welcome. The codebase is standard React — if you've built a web app, you can build a screen for x-molt.

```bash
pnpm dev          # Dev mode with hot reload
pnpm build        # Production build → dist/index.js
```

## License

MIT
