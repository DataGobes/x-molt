import { readdirSync, existsSync, statSync } from "fs";
import { join } from "path";

export interface DiscoveredArchive {
  path: string;
  folderName: string;
  hasTweets: boolean;
  hasLikes: boolean;
  hasFollowers: boolean;
  hasFollowing: boolean;
  hasBlocks: boolean;
  hasMutes: boolean;
  hasAccount: boolean;
  hasProfile: boolean;
  hasDirectMessages: boolean;
  hasNoteTweets: boolean;
  hasDeletedTweets: boolean;
  hasGrokChats: boolean;
  hasIpAudit: boolean;
  hasPersonalization: boolean;
  hasContacts: boolean;
  hasAdEngagements: boolean;
  hasAdImpressions: boolean;
  hasConnectedApps: boolean;
  hasDeviceTokens: boolean;
  hasApps: boolean;
}

const DATA_FILES = {
  hasTweets: "tweets.js",
  hasLikes: "like.js",
  hasFollowers: "follower.js",
  hasFollowing: "following.js",
  hasBlocks: "block.js",
  hasMutes: "mute.js",
  hasAccount: "account.js",
  hasProfile: "profile.js",
  hasDirectMessages: "direct-messages.js",
  hasNoteTweets: "note-tweet.js",
  hasDeletedTweets: "deleted-tweets.js",
  hasGrokChats: "grok-chat-item.js",
  hasIpAudit: "ip-audit.js",
  hasPersonalization: "personalization.js",
  hasContacts: "contact.js",
  hasAdEngagements: "ad-engagements.js",
  hasAdImpressions: "ad-impressions.js",
  hasConnectedApps: "connected-application.js",
  hasDeviceTokens: "device-token.js",
  hasApps: "app.js",
} as const;

/**
 * Scan a directory for X/Twitter archive folders.
 * An archive folder is identified by containing `data/tweets.js`.
 */
export function discoverArchives(dataDir: string): DiscoveredArchive[] {
  if (!existsSync(dataDir)) return [];

  const entries = readdirSync(dataDir);
  const archives: DiscoveredArchive[] = [];

  for (const entry of entries) {
    const fullPath = join(dataDir, entry);

    // Must be a directory
    if (!statSync(fullPath).isDirectory()) continue;

    // Must contain data/tweets.js (the definitive marker)
    const archiveDataDir = join(fullPath, "data");
    if (!existsSync(join(archiveDataDir, "tweets.js"))) continue;

    const archive: DiscoveredArchive = {
      path: fullPath,
      folderName: entry,
      hasTweets: true,
      hasLikes: false,
      hasFollowers: false,
      hasFollowing: false,
      hasBlocks: false,
      hasMutes: false,
      hasAccount: false,
      hasProfile: false,
      hasDirectMessages: false,
      hasNoteTweets: false,
      hasDeletedTweets: false,
      hasGrokChats: false,
      hasIpAudit: false,
      hasPersonalization: false,
      hasContacts: false,
      hasAdEngagements: false,
      hasAdImpressions: false,
      hasConnectedApps: false,
      hasDeviceTokens: false,
      hasApps: false,
    };

    // Check which data files are available
    for (const [key, filename] of Object.entries(DATA_FILES)) {
      (archive as any)[key] = existsSync(join(archiveDataDir, filename));
    }

    archives.push(archive);
  }

  return archives;
}
