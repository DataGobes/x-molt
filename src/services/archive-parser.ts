import { readFileSync, existsSync } from "fs";
import { join } from "path";
import type { ZodSchema, z } from "zod";
import {
  ArchiveTweetSchema,
  ArchiveLikeSchema,
  ArchiveFollowerSchema,
  ArchiveFollowingSchema,
  ArchiveBlockSchema,
  ArchiveMuteSchema,
  ArchiveAccountSchema,
  ArchiveProfileSchema,
  ArchiveDirectMessageSchema,
  ArchiveNoteTweetSchema,
  ArchiveGrokChatItemSchema,
  ArchiveIpAuditSchema,
  ArchivePersonalizationSchema,
  ArchiveContactSchema,
  ArchiveAdEngagementSchema,
  ArchiveAdImpressionSchema,
  ArchiveConnectedAppSchema,
  ArchiveDeviceTokenSchema,
  ArchiveAppSchema,
  type ArchiveTweet,
  type ArchiveLike,
  type ArchiveFollower,
  type ArchiveFollowing,
  type ArchiveBlock,
  type ArchiveMute,
  type ArchiveAccount,
  type ArchiveProfile,
  type ArchiveDirectMessage,
  type ArchiveNoteTweet,
  type ArchiveGrokChatItem,
  type ArchiveIpAudit,
  type ArchivePersonalization,
  type ArchiveContact,
  type ArchiveAdEngagement,
  type ArchiveAdImpression,
  type ArchiveConnectedApp,
  type ArchiveDeviceToken,
  type ArchiveApp,
  type ArchiveData,
} from "../types.js";
import AdmZip from "adm-zip";

/**
 * Generic parser for X archive .js files.
 * Strips the `window.YTD.{type}.part{N} = ` prefix, then validates each item.
 */
export function parseArchiveJs<S extends ZodSchema>(content: string, schema: S): z.output<S>[] {
  const jsonStr = content.replace(/^window\.YTD\.\w+\.part\d+\s*=\s*/, "");
  const raw = JSON.parse(jsonStr);

  if (!Array.isArray(raw)) {
    throw new Error("Expected an array");
  }

  const items: z.output<S>[] = [];
  const errors: string[] = [];

  for (const item of raw) {
    const result = schema.safeParse(item);
    if (result.success) {
      items.push(result.data);
    } else {
      errors.push(result.error.message);
    }
  }

  if (items.length === 0 && errors.length > 0) {
    throw new Error(`Failed to parse any items. First error: ${errors[0]}`);
  }

  return items;
}

// --- Specific parsers ---

export function parseTweetsJs(content: string): ArchiveTweet[] {
  return parseArchiveJs(content, ArchiveTweetSchema) as ArchiveTweet[];
}

export function parseLikesJs(content: string): ArchiveLike[] {
  return parseArchiveJs(content, ArchiveLikeSchema);
}

export function parseFollowersJs(content: string): ArchiveFollower[] {
  return parseArchiveJs(content, ArchiveFollowerSchema);
}

export function parseFollowingJs(content: string): ArchiveFollowing[] {
  return parseArchiveJs(content, ArchiveFollowingSchema);
}

export function parseBlocksJs(content: string): ArchiveBlock[] {
  return parseArchiveJs(content, ArchiveBlockSchema);
}

export function parseMutesJs(content: string): ArchiveMute[] {
  return parseArchiveJs(content, ArchiveMuteSchema);
}

export function parseAccountJs(content: string): ArchiveAccount | null {
  const items = parseArchiveJs(content, ArchiveAccountSchema);
  return items[0] ?? null;
}

export function parseProfileJs(content: string): ArchiveProfile | null {
  const items = parseArchiveJs(content, ArchiveProfileSchema);
  return items[0] ?? null;
}

export function parseDirectMessagesJs(content: string): ArchiveDirectMessage[] {
  return parseArchiveJs(content, ArchiveDirectMessageSchema);
}

export function parseNoteTweetsJs(content: string): ArchiveNoteTweet[] {
  return parseArchiveJs(content, ArchiveNoteTweetSchema);
}

export function parseDeletedTweetsJs(content: string): ArchiveTweet[] {
  return parseArchiveJs(content, ArchiveTweetSchema);
}

export function parseGrokChatItemsJs(content: string): ArchiveGrokChatItem[] {
  return parseArchiveJs(content, ArchiveGrokChatItemSchema);
}

export function parseIpAuditJs(content: string): ArchiveIpAudit[] {
  return parseArchiveJs(content, ArchiveIpAuditSchema);
}

export function parsePersonalizationJs(content: string): ArchivePersonalization | null {
  const items = parseArchiveJs(content, ArchivePersonalizationSchema);
  return items[0] ?? null;
}

export function parseContactsJs(content: string): ArchiveContact[] {
  return parseArchiveJs(content, ArchiveContactSchema);
}

export function parseAdEngagementsJs(content: string): ArchiveAdEngagement[] {
  return parseArchiveJs(content, ArchiveAdEngagementSchema);
}

export function parseAdImpressionsJs(content: string): ArchiveAdImpression[] {
  return parseArchiveJs(content, ArchiveAdImpressionSchema);
}

export function parseConnectedAppsJs(content: string): ArchiveConnectedApp[] {
  return parseArchiveJs(content, ArchiveConnectedAppSchema);
}

export function parseDeviceTokensJs(content: string): ArchiveDeviceToken[] {
  return parseArchiveJs(content, ArchiveDeviceTokenSchema);
}

export function parseAppsJs(content: string): ArchiveApp[] {
  return parseArchiveJs(content, ArchiveAppSchema);
}

// --- File loaders ---

function tryReadFile(filePath: string): string | null {
  if (!existsSync(filePath)) return null;
  return readFileSync(filePath, "utf-8");
}

/**
 * Load all available data from an unzipped archive folder.
 * Expects folderPath to contain a `data/` subfolder with .js files.
 */
export function loadArchiveFolder(folderPath: string): ArchiveData {
  const dataDir = existsSync(join(folderPath, "data"))
    ? join(folderPath, "data")
    : folderPath;

  const result: ArchiveData = {
    tweets: [],
    likes: [],
    followers: [],
    following: [],
    blocks: [],
    mutes: [],
    account: null,
    profile: null,
    directMessages: [],
    noteTweets: [],
    deletedTweets: [],
    grokChats: [],
    ipAudit: [],
    personalization: null,
    contacts: [],
    adEngagements: [],
    adImpressions: [],
    connectedApps: [],
    deviceTokens: [],
    apps: [],
  };

  const tweetsContent = tryReadFile(join(dataDir, "tweets.js"));
  if (tweetsContent) result.tweets = parseTweetsJs(tweetsContent);

  const likesContent = tryReadFile(join(dataDir, "like.js"));
  if (likesContent) result.likes = parseLikesJs(likesContent);

  const followersContent = tryReadFile(join(dataDir, "follower.js"));
  if (followersContent) result.followers = parseFollowersJs(followersContent);

  const followingContent = tryReadFile(join(dataDir, "following.js"));
  if (followingContent) result.following = parseFollowingJs(followingContent);

  const blocksContent = tryReadFile(join(dataDir, "block.js"));
  if (blocksContent) result.blocks = parseBlocksJs(blocksContent);

  const mutesContent = tryReadFile(join(dataDir, "mute.js"));
  if (mutesContent) result.mutes = parseMutesJs(mutesContent);

  const accountContent = tryReadFile(join(dataDir, "account.js"));
  if (accountContent) result.account = parseAccountJs(accountContent);

  const profileContent = tryReadFile(join(dataDir, "profile.js"));
  if (profileContent) result.profile = parseProfileJs(profileContent);

  const dmContent = tryReadFile(join(dataDir, "direct-messages.js"));
  if (dmContent) result.directMessages = parseDirectMessagesJs(dmContent);

  const noteContent = tryReadFile(join(dataDir, "note-tweet.js"));
  if (noteContent) result.noteTweets = parseNoteTweetsJs(noteContent);

  const deletedContent = tryReadFile(join(dataDir, "deleted-tweets.js"));
  if (deletedContent) result.deletedTweets = parseDeletedTweetsJs(deletedContent);

  const grokContent = tryReadFile(join(dataDir, "grok-chat-item.js"));
  if (grokContent) result.grokChats = parseGrokChatItemsJs(grokContent);

  const ipContent = tryReadFile(join(dataDir, "ip-audit.js"));
  if (ipContent) result.ipAudit = parseIpAuditJs(ipContent);

  const p13nContent = tryReadFile(join(dataDir, "personalization.js"));
  if (p13nContent) result.personalization = parsePersonalizationJs(p13nContent);

  const contactContent = tryReadFile(join(dataDir, "contact.js"));
  if (contactContent) result.contacts = parseContactsJs(contactContent);

  const adEngContent = tryReadFile(join(dataDir, "ad-engagements.js"));
  if (adEngContent) result.adEngagements = parseAdEngagementsJs(adEngContent);

  const adImpContent = tryReadFile(join(dataDir, "ad-impressions.js"));
  if (adImpContent) result.adImpressions = parseAdImpressionsJs(adImpContent);

  const connAppsContent = tryReadFile(join(dataDir, "connected-application.js"));
  if (connAppsContent) result.connectedApps = parseConnectedAppsJs(connAppsContent);

  const devTokenContent = tryReadFile(join(dataDir, "device-token.js"));
  if (devTokenContent) result.deviceTokens = parseDeviceTokensJs(devTokenContent);

  const appsContent = tryReadFile(join(dataDir, "app.js"));
  if (appsContent) result.apps = parseAppsJs(appsContent);

  return result;
}

// --- Legacy loaders (kept for backward compatibility) ---

export function loadArchiveFromFile(filePath: string): ArchiveTweet[] {
  const content = readFileSync(filePath, "utf-8");
  return parseTweetsJs(content);
}

export function loadArchiveFromZip(zipPath: string): ArchiveTweet[] {
  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries();

  const tweetsEntry = entries.find(
    (e) =>
      e.entryName.endsWith("tweets.js") ||
      e.entryName.includes("data/tweets.js")
  );

  if (!tweetsEntry) {
    throw new Error(
      "Could not find tweets.js in archive. Expected path: data/tweets.js"
    );
  }

  const content = tweetsEntry.getData().toString("utf-8");
  return parseTweetsJs(content);
}

export function loadArchive(filePath: string): ArchiveTweet[] {
  if (filePath.endsWith(".zip")) {
    return loadArchiveFromZip(filePath);
  }
  return loadArchiveFromFile(filePath);
}

export function archiveTweetToInsert(tweet: ArchiveTweet) {
  const t = tweet.tweet;
  return {
    id: t.id,
    fullText: t.full_text,
    createdAt: t.created_at,
    favoriteCount: t.favorite_count,
    retweetCount: t.retweet_count,
    isReply: !!t.in_reply_to_status_id,
    isRetweet: t.full_text.startsWith("RT @"),
  };
}
