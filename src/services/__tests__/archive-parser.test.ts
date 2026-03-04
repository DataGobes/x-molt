import { describe, it, expect } from "vitest";
import { join } from "path";
import {
  parseArchiveJs,
  parseTweetsJs,
  parseLikesJs,
  parseFollowersJs,
  parseFollowingJs,
  parseBlocksJs,
  parseMutesJs,
  parseAccountJs,
  parseProfileJs,
  parseDirectMessagesJs,
  parseNoteTweetsJs,
  parseDeletedTweetsJs,
  parseGrokChatItemsJs,
  parseIpAuditJs,
  parsePersonalizationJs,
  parseContactsJs,
  parseAdEngagementsJs,
  parseAdImpressionsJs,
  parseConnectedAppsJs,
  parseDeviceTokensJs,
  parseAppsJs,
  loadArchiveFolder,
} from "../archive-parser.js";
import {
  ArchiveTweetSchema,
  ArchiveLikeSchema,
  ArchiveFollowerSchema,
  ArchiveFollowingSchema,
  ArchiveBlockSchema,
  ArchiveMuteSchema,
  ArchiveAccountSchema,
  ArchiveProfileSchema,
} from "../../types.js";
import { existsSync } from "fs";

// --- Generic parser ---

describe("parseArchiveJs", () => {
  it("strips window.YTD prefix and parses JSON array", () => {
    const content = `window.YTD.like.part0 = [{"like":{"tweetId":"123","fullText":"hello","expandedUrl":"https://x.com"}}]`;
    const result = parseArchiveJs(content, ArchiveLikeSchema);
    expect(result).toHaveLength(1);
    expect(result[0].like.tweetId).toBe("123");
  });

  it("handles multi-digit part numbers", () => {
    const content = `window.YTD.tweets.part12 = [{"tweet":{"id":"1","full_text":"hi","created_at":"Mon Jan 01 00:00:00 +0000 2024"}}]`;
    const result = parseArchiveJs(content, ArchiveTweetSchema);
    expect(result).toHaveLength(1);
  });

  it("skips invalid items and returns valid ones", () => {
    const content = `window.YTD.like.part0 = [
      {"like":{"tweetId":"1","fullText":"good","expandedUrl":"https://x.com"}},
      {"like":{"bad":"data"}},
      {"like":{"tweetId":"2","fullText":"also good","expandedUrl":"https://x.com"}}
    ]`;
    const result = parseArchiveJs(content, ArchiveLikeSchema);
    expect(result).toHaveLength(2);
  });

  it("throws when no items parse successfully", () => {
    const content = `window.YTD.like.part0 = [{"bad":"data"}]`;
    expect(() => parseArchiveJs(content, ArchiveLikeSchema)).toThrow(
      "Failed to parse any items"
    );
  });

  it("throws on non-array JSON", () => {
    const content = `window.YTD.like.part0 = {"not":"array"}`;
    expect(() => parseArchiveJs(content, ArchiveLikeSchema)).toThrow(
      "Expected an array"
    );
  });

  it("returns empty array for empty input array", () => {
    const content = `window.YTD.like.part0 = []`;
    const result = parseArchiveJs(content, ArchiveLikeSchema);
    expect(result).toHaveLength(0);
  });
});

// --- Specific parsers with fixture snippets ---

describe("parseTweetsJs", () => {
  it("parses tweet with all fields", () => {
    const content = `window.YTD.tweets.part0 = [{"tweet":{"id":"999","full_text":"Hello world","created_at":"Mon Jan 01 00:00:00 +0000 2024","favorite_count":"5","retweet_count":"2","in_reply_to_status_id":"123"}}]`;
    const result = parseTweetsJs(content);
    expect(result).toHaveLength(1);
    expect(result[0].tweet.id).toBe("999");
    expect(result[0].tweet.favorite_count).toBe(5);
    expect(result[0].tweet.in_reply_to_status_id).toBe("123");
  });

  it("applies defaults for missing optional numeric fields", () => {
    const content = `window.YTD.tweets.part0 = [{"tweet":{"id":"1","full_text":"test","created_at":"Mon Jan 01 00:00:00 +0000 2024"}}]`;
    const result = parseTweetsJs(content);
    expect(result[0].tweet.favorite_count).toBe(0);
    expect(result[0].tweet.retweet_count).toBe(0);
  });
});

describe("parseLikesJs", () => {
  it("parses likes", () => {
    const content = `window.YTD.like.part0 = [{"like":{"tweetId":"123","fullText":"Great tweet","expandedUrl":"https://twitter.com/i/web/status/123"}}]`;
    const result = parseLikesJs(content);
    expect(result).toHaveLength(1);
    expect(result[0].like.tweetId).toBe("123");
    expect(result[0].like.fullText).toBe("Great tweet");
  });
});

describe("parseFollowersJs", () => {
  it("parses followers", () => {
    const content = `window.YTD.follower.part0 = [{"follower":{"accountId":"456","userLink":"https://twitter.com/intent/user?user_id=456"}}]`;
    const result = parseFollowersJs(content);
    expect(result).toHaveLength(1);
    expect(result[0].follower.accountId).toBe("456");
  });
});

describe("parseFollowingJs", () => {
  it("parses following", () => {
    const content = `window.YTD.following.part0 = [{"following":{"accountId":"789","userLink":"https://twitter.com/intent/user?user_id=789"}}]`;
    const result = parseFollowingJs(content);
    expect(result).toHaveLength(1);
    expect(result[0].following.accountId).toBe("789");
  });
});

describe("parseBlocksJs", () => {
  it("parses blocks (note: key is 'blocking')", () => {
    const content = `window.YTD.block.part0 = [{"blocking":{"accountId":"111","userLink":"https://twitter.com/intent/user?user_id=111"}}]`;
    const result = parseBlocksJs(content);
    expect(result).toHaveLength(1);
    expect(result[0].blocking.accountId).toBe("111");
  });
});

describe("parseMutesJs", () => {
  it("parses mutes (note: key is 'muting')", () => {
    const content = `window.YTD.mute.part0 = [{"muting":{"accountId":"222","userLink":"https://twitter.com/intent/user?user_id=222"}}]`;
    const result = parseMutesJs(content);
    expect(result).toHaveLength(1);
    expect(result[0].muting.accountId).toBe("222");
  });
});

describe("parseAccountJs", () => {
  it("parses account and returns single item", () => {
    const content = `window.YTD.account.part0 = [{"account":{"email":"test@example.com","createdVia":"web","username":"testuser","accountId":"123","createdAt":"2020-01-01T00:00:00.000Z","accountDisplayName":"Test User"}}]`;
    const result = parseAccountJs(content);
    expect(result).not.toBeNull();
    expect(result!.account.username).toBe("testuser");
    expect(result!.account.email).toBe("test@example.com");
  });

  it("returns null for empty array", () => {
    const content = `window.YTD.account.part0 = []`;
    const result = parseAccountJs(content);
    expect(result).toBeNull();
  });
});

describe("parseProfileJs", () => {
  it("parses profile with nested description", () => {
    const content = `window.YTD.profile.part0 = [{"profile":{"description":{"bio":"Hello","website":"https://example.com","location":"Earth"},"avatarMediaUrl":"https://pbs.twimg.com/photo.jpg"}}]`;
    const result = parseProfileJs(content);
    expect(result).not.toBeNull();
    expect(result!.profile.description.bio).toBe("Hello");
    expect(result!.profile.avatarMediaUrl).toContain("twimg.com");
  });
});

// --- Zod schema validation ---

describe("Zod schema validation", () => {
  it("ArchiveLikeSchema rejects missing fields", () => {
    const result = ArchiveLikeSchema.safeParse({ like: { tweetId: "1" } });
    expect(result.success).toBe(false);
  });

  it("ArchiveFollowerSchema rejects wrong key name", () => {
    const result = ArchiveFollowerSchema.safeParse({
      following: { accountId: "1", userLink: "x" },
    });
    expect(result.success).toBe(false);
  });

  it("ArchiveTweetSchema coerces string numbers", () => {
    const result = ArchiveTweetSchema.safeParse({
      tweet: {
        id: 12345,
        full_text: "test",
        created_at: "Mon Jan 01 00:00:00 +0000 2024",
        favorite_count: "10",
        retweet_count: "3",
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tweet.id).toBe("12345");
      expect(result.data.tweet.favorite_count).toBe(10);
    }
  });
});

// --- New data type parsers ---

describe("parseDirectMessagesJs", () => {
  it("parses DM conversations with messages", () => {
    const content = `window.YTD.direct_messages.part0 = [{"dmConversation":{"conversationId":"conv-1","messages":[{"messageCreate":{"id":"msg-1","senderId":"100","recipientId":"200","createdAt":"2024-01-01","text":"Hello","reactions":[],"urls":[],"mediaUrls":[]}}]}}]`;
    const result = parseDirectMessagesJs(content);
    expect(result).toHaveLength(1);
    expect(result[0].dmConversation.conversationId).toBe("conv-1");
    expect(result[0].dmConversation.messages).toHaveLength(1);
    expect(result[0].dmConversation.messages[0].messageCreate.text).toBe("Hello");
  });
});

describe("parseNoteTweetsJs", () => {
  it("parses note tweets", () => {
    const content = `window.YTD.note_tweet.part0 = [{"noteTweet":{"noteTweetId":"nt-1","createdAt":"2024-01-01","core":{"text":"Long form content","urls":[],"mentions":[],"hashtags":[]}}}]`;
    const result = parseNoteTweetsJs(content);
    expect(result).toHaveLength(1);
    expect(result[0].noteTweet.core.text).toBe("Long form content");
  });
});

describe("parseDeletedTweetsJs", () => {
  it("parses deleted tweets using ArchiveTweetSchema", () => {
    const content = `window.YTD.deleted_tweets.part0 = [{"tweet":{"id":"del-1","full_text":"Was deleted","created_at":"Mon Jan 01 00:00:00 +0000 2024"}}]`;
    const result = parseDeletedTweetsJs(content);
    expect(result).toHaveLength(1);
    expect(result[0].tweet.id).toBe("del-1");
  });
});

describe("parseGrokChatItemsJs", () => {
  it("parses grok chat items", () => {
    const content = `window.YTD.grok_chat_item.part0 = [{"grokChatItem":{"chatId":"gc-1","accountId":"100","createdAt":"2024-01-01","sender":{"name":"User"},"message":"Hello Grok"}}]`;
    const result = parseGrokChatItemsJs(content);
    expect(result).toHaveLength(1);
    expect(result[0].grokChatItem.message).toBe("Hello Grok");
    expect(result[0].grokChatItem.sender.name).toBe("User");
  });
});

describe("parseIpAuditJs", () => {
  it("parses IP audit entries", () => {
    const content = `window.YTD.ip_audit.part0 = [{"ipAudit":{"accountId":"100","createdAt":"2024-01-01","loginIp":"1.2.3.4"}}]`;
    const result = parseIpAuditJs(content);
    expect(result).toHaveLength(1);
    expect(result[0].ipAudit.loginIp).toBe("1.2.3.4");
  });
});

describe("parsePersonalizationJs", () => {
  it("parses personalization as single item", () => {
    const content = `window.YTD.personalization.part0 = [{"p13nData":{"demographics":{"languages":[{"language":"English"}]},"interests":{"interests":[{"name":"Technology"}]}}}]`;
    const result = parsePersonalizationJs(content);
    expect(result).not.toBeNull();
    expect(result!.p13nData.interests?.interests).toHaveLength(1);
  });

  it("returns null for empty array", () => {
    const content = `window.YTD.personalization.part0 = []`;
    const result = parsePersonalizationJs(content);
    expect(result).toBeNull();
  });
});

describe("parseContactsJs", () => {
  it("parses contacts with emails and phones", () => {
    const content = `window.YTD.contact.part0 = [{"contact":{"emails":["test@example.com"],"phoneNumbers":["555-1234"]}}]`;
    const result = parseContactsJs(content);
    expect(result).toHaveLength(1);
    expect(result[0].contact.emails).toContain("test@example.com");
  });
});

describe("parseConnectedAppsJs", () => {
  it("parses connected applications", () => {
    const content = `window.YTD.connected_application.part0 = [{"connectedApplication":{"id":"app-1","name":"TestApp","approvedAt":"2024-01-01"}}]`;
    const result = parseConnectedAppsJs(content);
    expect(result).toHaveLength(1);
    expect(result[0].connectedApplication.name).toBe("TestApp");
  });
});

describe("parseDeviceTokensJs", () => {
  it("parses device tokens", () => {
    const content = `window.YTD.device_token.part0 = [{"deviceToken":{"clientApplicationId":"app-1","token":"tok-123","createdAt":"2024-01-01"}}]`;
    const result = parseDeviceTokensJs(content);
    expect(result).toHaveLength(1);
    expect(result[0].deviceToken.token).toBe("tok-123");
  });
});

describe("parseAppsJs", () => {
  it("parses apps", () => {
    const content = `window.YTD.app.part0 = [{"app":{"appId":"app-1","appNames":["MyApp"]}}]`;
    const result = parseAppsJs(content);
    expect(result).toHaveLength(1);
    expect(result[0].app.appId).toBe("app-1");
  });
});

// --- loadArchiveFolder against real data ---

describe("loadArchiveFolder", () => {
  const archiveDir = join(process.cwd(), "data");
  const archiveFolders = existsSync(archiveDir)
    ? require("fs")
        .readdirSync(archiveDir)
        .filter((e: string) =>
          existsSync(join(archiveDir, e, "data", "tweets.js"))
        )
    : [];

  const realArchivePath =
    archiveFolders.length > 0
      ? join(archiveDir, archiveFolders[0])
      : null;

  it.skipIf(!realArchivePath)(
    "loads all data types from real archive",
    () => {
      const data = loadArchiveFolder(realArchivePath!);

      expect(data.tweets.length).toBeGreaterThan(0);
      expect(data.likes.length).toBeGreaterThan(0);
      expect(data.followers.length).toBeGreaterThan(0);
      expect(data.following.length).toBeGreaterThan(0);
      expect(data.blocks.length).toBeGreaterThan(0);
      expect(data.mutes.length).toBeGreaterThan(0);
      expect(data.account).not.toBeNull();
      expect(data.profile).not.toBeNull();
    }
  );

  it("returns empty data for nonexistent folder", () => {
    const data = loadArchiveFolder("/tmp/nonexistent-archive-folder");
    expect(data.tweets).toHaveLength(0);
    expect(data.likes).toHaveLength(0);
    expect(data.account).toBeNull();
    // New fields should also be empty/null
    expect(data.directMessages).toHaveLength(0);
    expect(data.noteTweets).toHaveLength(0);
    expect(data.deletedTweets).toHaveLength(0);
    expect(data.grokChats).toHaveLength(0);
    expect(data.ipAudit).toHaveLength(0);
    expect(data.personalization).toBeNull();
    expect(data.contacts).toHaveLength(0);
    expect(data.adEngagements).toHaveLength(0);
    expect(data.adImpressions).toHaveLength(0);
    expect(data.connectedApps).toHaveLength(0);
    expect(data.deviceTokens).toHaveLength(0);
    expect(data.apps).toHaveLength(0);
  });
});
