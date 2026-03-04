import { existsSync, statSync } from "fs";
import Database from "better-sqlite3";
import { format } from "date-fns";
import { ArchiveStore } from "../services/archive-store.js";
import { getDbPath } from "../config.js";
import { parseTweetDate } from "../utils/format.js";

const dbPath = getDbPath();

if (!existsSync(dbPath)) {
  console.log(`
No archive database found at ${dbPath}.

Import an archive first:
  pnpm dev  →  Import Archive
`);
  process.exit(0);
}

const sizeBytes = statSync(dbPath).size;
const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(1);

const store = new ArchiveStore(dbPath);
const stats = store.getStats();
const account = store.getAccount();
const profile = store.getProfile();

// FTS5 health check via separate read-only connection
let ftsStatus: string;
try {
  const readDb = new Database(dbPath, { readonly: true });
  const row = readDb.prepare("SELECT count(*) as count FROM tweets_fts").get() as { count: number };
  ftsStatus = `healthy (${row.count.toLocaleString()} rows)`;
  readDb.close();
} catch {
  ftsStatus = "ERROR — index may be corrupt";
}

store.close();

// --- Format helpers ---

function formatDate(raw: string | undefined): string {
  if (!raw) return "—";
  try {
    return format(parseTweetDate(raw), "MMM d, yyyy");
  } catch {
    return raw;
  }
}

function pad(label: string, value: string | number, width = 12): string {
  return `   ${label.padEnd(width)}${typeof value === "number" ? value.toLocaleString() : value}`;
}

// --- Output ---

console.log(`
╔══════════════════════════════════════╗
║         x-molt Archive Stats        ║
╚══════════════════════════════════════╝

📦 Database: ${dbPath} (${sizeMB} MB)`);

if (account) {
  console.log(`
👤 Account: @${account.username} (${account.displayName})
   Created: ${formatDate(account.createdAt)} via ${account.createdVia}`);
}

if (profile?.bio) {
  console.log(`   Bio:     ${profile.bio.slice(0, 60)}${profile.bio.length > 60 ? "…" : ""}`);
}

console.log(`
🐦 Tweets
${pad("Total:", stats.total)}
${pad("Active:", stats.active)}
${pad("Deleted:", stats.deleted)}
   ─────────────────
${pad("Original:", stats.original)}
${pad("Replies:", stats.replies)}
${pad("Retweets:", stats.retweets)}
   ─────────────────
${pad("Oldest:", formatDate(stats.oldestDate))}
${pad("Newest:", formatDate(stats.newestDate))}

🔍 FTS5 Index: ${ftsStatus}

👥 Social Graph
${pad("Followers:", stats.followers)}
${pad("Following:", stats.following)}
${pad("Blocks:", stats.blocks)}
${pad("Mutes:", stats.mutes)}

❤️  Likes: ${stats.likes.toLocaleString()}

💬 Direct Messages
${pad("Conversations:", stats.dmConversations)}
${pad("Messages:", stats.directMessages)}

📝 Note Tweets: ${stats.noteTweets.toLocaleString()}

🤖 Grok Chats: ${stats.grokChats.toLocaleString()}

🌐 IP Audit: ${stats.ipAudit.toLocaleString()} login records

🎯 Personalization
${pad("Interests:", stats.interests)}
${pad("Demographics:", stats.demographics)}

📇 Contacts: ${stats.contacts.toLocaleString()}

📢 Advertising
${pad("Engagements:", stats.adEngagements)}
${pad("Impressions:", stats.adImpressions)}

🔗 Connected Apps: ${stats.connectedApps.toLocaleString()}

📱 Device Tokens: ${stats.deviceTokens.toLocaleString()}

📦 Apps: ${stats.apps.toLocaleString()}
`);
