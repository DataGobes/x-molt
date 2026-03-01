# molt

A terminal UI for managing your X.com (Twitter) account — built for the **Free API tier**.

Post tweets, delete tweets, view your profile, import your X data archive, and batch-delete old tweets with full-text search and rate limiting — all from the terminal.

```
  𝕏  molt v1.0.0
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

## Features

- **Post tweets** with a 280-character live counter and monthly limit tracking (1,500/month on Free tier)
- **Delete tweets** by ID with confirmation
- **View your profile** — followers, following, tweet count, bio
- **Import your X data archive** — supports both `tweets.js` and `.zip` formats
- **Full-text search** across your entire tweet history using SQLite FTS5
- **Batch delete** with filters (date range, keyword, replies/retweets) and built-in rate limiting
- **First-run setup** guides you through pasting your API credentials
- **Credential security** — config saved with `chmod 600` permissions

## Install

```bash
git clone https://github.com/yourusername/molt.git
cd molt
pnpm install
```

## Setup

You need X API credentials on the [Free tier](https://developer.x.com/en/portal/dashboard). You'll need four values:

| Credential | Where to find it |
|---|---|
| App Key (API Key) | Developer Portal → Project → Keys and Tokens |
| App Secret (API Secret) | Same page |
| Access Token | Same page → Generate |
| Access Secret | Same page → Generate |

There are two ways to configure credentials:

**Option A** — Interactive setup (recommended): Just run `pnpm dev` and the setup wizard will walk you through it. Credentials are saved to `~/.config/molt/credentials.json`.

**Option B** — Environment file: Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

## Usage

```bash
pnpm dev      # Development mode (tsx)
pnpm build    # Build to dist/
pnpm start    # Run built version
```

### Navigation

| Key | Action |
|-----|--------|
| `↑` / `↓` | Navigate menus |
| `Enter` | Select |
| `Esc` | Go back |
| `q` | Quit (from main menu) |
| `j` / `k` | Scroll tweet lists |
| `s` | Search (in archive browser) |
| `p` | Pause/resume (during batch delete) |
| `c` | Cancel (during batch delete) |

### Importing Your Archive

1. Request your data archive at [x.com/settings/download_your_data](https://x.com/settings/download_your_data)
2. Wait for the download link (can take 24+ hours)
3. In molt, select **Import Archive** and paste the path to the `.zip` file or the extracted `tweets.js`

Tweets are stored in a local SQLite database with full-text search indexing. You can search by keyword and filter by date range.

### Batch Delete

The batch delete feature respects X's Free tier rate limits:

- **50 deletes per 15-minute window** (uses 45 with a 5-slot safety buffer)
- **~180 deletes per hour** — the UI shows an ETA before you start
- **Pause/resume** with `p`, cancel with `c`
- **Idempotent** — already-deleted tweets are skipped on re-runs
- **Filters**: date range, keyword, include/exclude replies and retweets

## Tech Stack

| Tool | Purpose |
|------|---------|
| [Ink 5](https://github.com/vadimdemedes/ink) + [@inkjs/ui](https://github.com/vadimdemedes/ink-ui) | React-based terminal UI |
| [twitter-api-v2](https://github.com/PLhery/node-twitter-api-v2) | Fully typed X API client |
| [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) | SQLite with FTS5 full-text search |
| [zod](https://github.com/colinhacks/zod) | Runtime validation of archive data |
| [date-fns](https://date-fns.org/) | Date formatting |
| [tsup](https://github.com/egoist/tsup) | Build |
| [tsx](https://github.com/privatenumber/tsx) | Dev runner |

## Project Structure

```
src/
├── index.tsx              # Entry point
├── app.tsx                # Root component + screen router
├── types.ts               # Shared types + Zod schemas
├── config.ts              # Credential loading
├── screens/
│   ├── main-menu.tsx      # Home menu
│   ├── setup.tsx          # First-run credential wizard
│   ├── post-tweet.tsx     # Compose + publish
│   ├── delete-tweet.tsx   # Delete by ID
│   ├── profile.tsx        # View account info
│   ├── import-archive.tsx # Import X data archive
│   ├── archive-browser.tsx# Browse/search tweets
│   └── batch-delete.tsx   # Filter + mass delete
├── components/            # Reusable UI components
├── services/
│   ├── twitter-client.ts  # X API wrapper
│   ├── archive-parser.ts  # Parse tweets.js / .zip
│   ├── archive-store.ts   # SQLite + FTS5
│   └── rate-limiter.ts    # Sliding window limiter
├── hooks/                 # React hooks
└── utils/                 # Constants + formatting
```

## License

MIT
