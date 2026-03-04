import { z } from "zod";

// --- Credentials ---

export const CredentialsSchema = z.object({
  appKey: z.string().min(1),
  appSecret: z.string().min(1),
  accessToken: z.string().min(1),
  accessSecret: z.string().min(1),
});

export type Credentials = z.infer<typeof CredentialsSchema>;

// --- Screens ---

export type Screen =
  | "main-menu"
  | "setup"
  | "post-tweet"
  | "delete-tweet"
  | "profile"
  | "import-archive"
  | "archive-browser"
  | "batch-delete"
  | "analytics"
  | "cost-dashboard"
  | "timeline"
  | "search"
  | "bookmarks"
  | "social"
  | "lists"
  | "dm-inbox"
  | "generate-embeddings";

export type AnalyticsTab = "overview" | "activity" | "engagement" | "ads" | "privacy";

export type EmbeddableType = "tweets" | "likes" | "dms" | "grokChats" | "noteTweets";

// --- Twitter Profile ---

export interface UserProfile {
  id: string;
  name: string;
  username: string;
  description: string;
  publicMetrics: {
    followers: number;
    following: number;
    tweets: number;
    listed: number;
  };
  createdAt: string;
  verified: boolean;
  profileImageUrl?: string;
}

// --- Live Twitter Data ---

export interface TimelineTweet {
  id: string;
  text: string;
  createdAt: string;
  authorId: string;
  authorName?: string;
  authorUsername?: string;
  publicMetrics: {
    likes: number;
    retweets: number;
    replies: number;
    impressions: number;
  };
  isReply: boolean;
  isRetweet: boolean;
}

export interface SearchResult {
  tweets: TimelineTweet[];
  nextToken?: string;
  totalCount?: number;
}

export interface TimelineResult {
  tweets: TimelineTweet[];
  nextToken?: string;
}

export interface BookmarkResult {
  tweets: TimelineTweet[];
  nextToken?: string;
}

// --- Live Social Data ---

export interface LiveUser {
  id: string;
  name: string;
  username: string;
  description?: string;
  publicMetrics?: {
    followers: number;
    following: number;
    tweets: number;
  };
}

export interface LiveUserResult {
  users: LiveUser[];
  nextToken?: string;
}

export interface LiveList {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
  followerCount: number;
  isPrivate: boolean;
  ownerId: string;
}

export interface LiveListResult {
  lists: LiveList[];
  nextToken?: string;
}

export interface LiveDmConversation {
  id: string;
  participantIds: string[];
}

export interface LiveDmMessage {
  id: string;
  text: string;
  senderId: string;
  createdAt: string;
  conversationId: string;
}

export interface LiveDmResult {
  messages: LiveDmMessage[];
  nextToken?: string;
}

// --- API Usage (from X /2/usage/tweets) ---

export interface ApiUsageDaily {
  date: string;
  usage: number;
}

export interface ApiUsageResult {
  projectId: string;
  projectUsage: number;
  projectCap: number;
  capResetDay: number;
  dailyUsage: ApiUsageDaily[];
}

// --- Archive ---

export const ArchiveTweetSchema = z.object({
  tweet: z.object({
    id: z.coerce.string(),
    full_text: z.string(),
    created_at: z.string(),
    favorite_count: z.coerce.number().default(0),
    retweet_count: z.coerce.number().default(0),
    in_reply_to_status_id: z.coerce.string().optional().nullable(),
    in_reply_to_user_id: z.coerce.string().optional().nullable(),
  }),
});

export type ArchiveTweet = z.infer<typeof ArchiveTweetSchema>;

// --- Archive: Likes ---

export const ArchiveLikeSchema = z.object({
  like: z.object({
    tweetId: z.string(),
    fullText: z.string(),
    expandedUrl: z.string(),
  }),
});

export type ArchiveLike = z.infer<typeof ArchiveLikeSchema>;

// --- Archive: Followers ---

export const ArchiveFollowerSchema = z.object({
  follower: z.object({
    accountId: z.string(),
    userLink: z.string(),
  }),
});

export type ArchiveFollower = z.infer<typeof ArchiveFollowerSchema>;

// --- Archive: Following ---

export const ArchiveFollowingSchema = z.object({
  following: z.object({
    accountId: z.string(),
    userLink: z.string(),
  }),
});

export type ArchiveFollowing = z.infer<typeof ArchiveFollowingSchema>;

// --- Archive: Blocks ---

export const ArchiveBlockSchema = z.object({
  blocking: z.object({
    accountId: z.string(),
    userLink: z.string(),
  }),
});

export type ArchiveBlock = z.infer<typeof ArchiveBlockSchema>;

// --- Archive: Mutes ---

export const ArchiveMuteSchema = z.object({
  muting: z.object({
    accountId: z.string(),
    userLink: z.string(),
  }),
});

export type ArchiveMute = z.infer<typeof ArchiveMuteSchema>;

// --- Archive: Account ---

export const ArchiveAccountSchema = z.object({
  account: z.object({
    email: z.string(),
    createdVia: z.string(),
    username: z.string(),
    accountId: z.string(),
    createdAt: z.string(),
    accountDisplayName: z.string(),
  }),
});

export type ArchiveAccount = z.infer<typeof ArchiveAccountSchema>;

// --- Archive: Profile ---

export const ArchiveProfileSchema = z.object({
  profile: z.object({
    description: z.object({
      bio: z.string(),
      website: z.string(),
      location: z.string(),
    }),
    avatarMediaUrl: z.string(),
  }),
});

export type ArchiveProfile = z.infer<typeof ArchiveProfileSchema>;

// --- Archive: Direct Messages ---

export const ArchiveDirectMessageSchema = z.object({
  dmConversation: z.object({
    conversationId: z.string(),
    messages: z.array(z.object({
      messageCreate: z.object({
        id: z.string(),
        senderId: z.string(),
        recipientId: z.string(),
        createdAt: z.string(),
        text: z.string(),
        reactions: z.array(z.any()).optional().default([]),
        urls: z.array(z.any()).optional().default([]),
        mediaUrls: z.array(z.string()).optional().default([]),
      }),
    })),
  }),
});

export type ArchiveDirectMessage = z.infer<typeof ArchiveDirectMessageSchema>;

// --- Archive: Note Tweets ---

export const ArchiveNoteTweetSchema = z.object({
  noteTweet: z.object({
    noteTweetId: z.string(),
    createdAt: z.string(),
    updatedAt: z.string().optional().default(""),
    lifecycle: z.object({ name: z.string() }).optional(),
    core: z.object({
      text: z.string(),
      urls: z.array(z.any()).optional().default([]),
      mentions: z.array(z.any()).optional().default([]),
      hashtags: z.array(z.any()).optional().default([]),
    }),
  }),
});

export type ArchiveNoteTweet = z.infer<typeof ArchiveNoteTweetSchema>;

// --- Archive: Grok Chat Items ---

export const ArchiveGrokChatItemSchema = z.object({
  grokChatItem: z.object({
    chatId: z.string(),
    accountId: z.string().optional().default(""),
    createdAt: z.string(),
    sender: z.object({ name: z.string() }),
    message: z.string(),
    grokMode: z.object({ name: z.string() }).optional(),
    attachments: z.array(z.any()).optional().default([]),
    postIds: z.array(z.string()).optional().default([]),
  }),
});

export type ArchiveGrokChatItem = z.infer<typeof ArchiveGrokChatItemSchema>;

// --- Archive: IP Audit ---

export const ArchiveIpAuditSchema = z.object({
  ipAudit: z.object({
    accountId: z.string(),
    createdAt: z.string(),
    loginIp: z.string(),
    loginPortNumber: z.coerce.string().optional().default(""),
  }),
});

export type ArchiveIpAudit = z.infer<typeof ArchiveIpAuditSchema>;

// --- Archive: Personalization ---

export const ArchivePersonalizationSchema = z.object({
  p13nData: z.object({
    demographics: z.object({
      languages: z.array(z.object({
        language: z.string(),
        isDisabled: z.boolean().optional().default(false),
      })).optional().default([]),
      genderInfo: z.object({ gender: z.string() }).optional(),
    }).optional(),
    interests: z.object({
      interests: z.array(z.object({
        name: z.string(),
        isDisabled: z.boolean().optional().default(false),
      })).optional().default([]),
    }).optional(),
  }),
});

export type ArchivePersonalization = z.infer<typeof ArchivePersonalizationSchema>;

// --- Archive: Contacts ---

export const ArchiveContactSchema = z.object({
  contact: z.object({
    emails: z.array(z.string()).optional().default([]),
    phoneNumbers: z.array(z.string()).optional().default([]),
  }),
});

export type ArchiveContact = z.infer<typeof ArchiveContactSchema>;

// --- Archive: Ad Engagements & Impressions ---

const AdImpressionAttributesSchema = z.object({
  displayLocation: z.string().optional().default(""),
  promotedTweetInfo: z.object({
    tweetId: z.string(),
    tweetText: z.string().optional().default(""),
  }).optional(),
  advertiserInfo: z.object({
    advertiserName: z.string().optional().default(""),
    screenName: z.string().optional().default(""),
  }).optional(),
  matchedTargetingCriteria: z.array(z.object({
    targetingType: z.string(),
    targetingValue: z.string().optional().default(""),
  })).optional().default([]),
  deviceInfo: z.object({
    osType: z.string().optional().default(""),
    deviceType: z.string().optional().default(""),
  }).optional(),
});

export const ArchiveAdEngagementSchema = z.object({
  ad: z.object({
    adsUserData: z.object({
      adEngagements: z.object({
        engagements: z.array(z.object({
          impressionAttributes: AdImpressionAttributesSchema,
        })),
      }),
    }),
  }),
});

export type ArchiveAdEngagement = z.infer<typeof ArchiveAdEngagementSchema>;

export const ArchiveAdImpressionSchema = z.object({
  ad: z.object({
    adsUserData: z.object({
      adImpressions: z.object({
        impressions: z.array(AdImpressionAttributesSchema),
      }),
    }),
  }),
});

export type ArchiveAdImpression = z.infer<typeof ArchiveAdImpressionSchema>;

// --- Archive: Connected Applications ---

export const ArchiveConnectedAppSchema = z.object({
  connectedApplication: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional().default(""),
    permissions: z.array(z.string()).optional().default([]),
    approvedAt: z.string(),
    organization: z.object({
      name: z.string().optional().default(""),
      url: z.string().optional().default(""),
      privacyPolicyUrl: z.string().optional().default(""),
      termsAndConditionsUrl: z.string().optional().default(""),
    }).optional(),
  }),
});

export type ArchiveConnectedApp = z.infer<typeof ArchiveConnectedAppSchema>;

// --- Archive: Device Tokens ---

export const ArchiveDeviceTokenSchema = z.object({
  deviceToken: z.object({
    clientApplicationId: z.string(),
    clientApplicationName: z.string().optional().default(""),
    token: z.string(),
    createdAt: z.string(),
    lastSeenAt: z.string().optional().default(""),
  }),
});

export type ArchiveDeviceToken = z.infer<typeof ArchiveDeviceTokenSchema>;

// --- Archive: Apps ---

export const ArchiveAppSchema = z.object({
  app: z.object({
    appId: z.string(),
    appNames: z.array(z.string()).optional().default([]),
  }),
});

export type ArchiveApp = z.infer<typeof ArchiveAppSchema>;

// --- Archive: Full parsed data ---

export interface ArchiveData {
  tweets: ArchiveTweet[];
  likes: ArchiveLike[];
  followers: ArchiveFollower[];
  following: ArchiveFollowing[];
  blocks: ArchiveBlock[];
  mutes: ArchiveMute[];
  account: ArchiveAccount | null;
  profile: ArchiveProfile | null;
  directMessages: ArchiveDirectMessage[];
  noteTweets: ArchiveNoteTweet[];
  deletedTweets: ArchiveTweet[];
  grokChats: ArchiveGrokChatItem[];
  ipAudit: ArchiveIpAudit[];
  personalization: ArchivePersonalization | null;
  contacts: ArchiveContact[];
  adEngagements: ArchiveAdEngagement[];
  adImpressions: ArchiveAdImpression[];
  connectedApps: ArchiveConnectedApp[];
  deviceTokens: ArchiveDeviceToken[];
  apps: ArchiveApp[];
}

// --- Stored rows ---

export interface StoredLike {
  tweetId: string;
  fullText: string;
  expandedUrl: string;
}

export interface StoredFollower {
  accountId: string;
  userLink: string;
}

export interface StoredFollowing {
  accountId: string;
  userLink: string;
}

export interface StoredBlock {
  accountId: string;
  userLink: string;
}

export interface StoredMute {
  accountId: string;
  userLink: string;
}

export interface StoredAccount {
  id: string;
  email: string;
  username: string;
  displayName: string;
  createdAt: string;
  createdVia: string;
}

export interface StoredProfile {
  bio: string;
  website: string;
  location: string;
  avatarUrl: string;
}

export interface StoredTweet {
  id: string;
  fullText: string;
  createdAt: string;
  createdAtTs: number;
  favoriteCount: number;
  retweetCount: number;
  isReply: boolean;
  isRetweet: boolean;
  deleted: boolean;
}

export interface StoredDmConversation {
  conversationId: string;
  messageCount: number;
}

export interface StoredDirectMessage {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  text: string;
  createdAt: string;
}

export interface StoredNoteTweet {
  noteTweetId: string;
  text: string;
  createdAt: string;
  updatedAt: string;
  lifecycle: string;
}

export interface StoredGrokChat {
  chatId: string;
  accountId: string;
  sender: string;
  message: string;
  createdAt: string;
  grokMode: string;
}

export interface StoredIpAudit {
  accountId: string;
  loginIp: string;
  loginPort: string;
  createdAt: string;
}

export interface StoredInterest {
  name: string;
  isDisabled: boolean;
}

export interface StoredDemographic {
  type: string;
  value: string;
}

export interface StoredContact {
  type: "email" | "phone";
  value: string;
}

export interface StoredAdEngagement {
  id: number;
  tweetId: string;
  tweetText: string;
  advertiserName: string;
  advertiserScreenName: string;
  displayLocation: string;
  osType: string;
  deviceType: string;
}

export interface StoredAdImpression {
  id: number;
  tweetId: string;
  tweetText: string;
  advertiserName: string;
  advertiserScreenName: string;
  displayLocation: string;
  osType: string;
  deviceType: string;
}

export interface StoredAdTargeting {
  eventId: number;
  eventType: "engagement" | "impression";
  targetingType: string;
  targetingValue: string;
}

export interface StoredConnectedApp {
  id: string;
  name: string;
  description: string;
  permissions: string;
  approvedAt: string;
  orgName: string;
  orgUrl: string;
}

export interface StoredDeviceToken {
  clientApplicationId: string;
  clientApplicationName: string;
  token: string;
  createdAt: string;
  lastSeenAt: string;
}

export interface StoredApp {
  appId: string;
  appNames: string;
}

// --- Date Hierarchy (for archive browser tree view) ---

export interface DayBucket {
  day: string;
  count: number;
}

export interface MonthBucket {
  month: string;
  count: number;
  days: DayBucket[];
}

export interface YearBucket {
  year: string;
  count: number;
  months: MonthBucket[];
}

export type DateHierarchy = YearBucket[];

// --- Batch Delete ---

export interface BatchDeleteFilter {
  beforeDate?: Date;
  afterDate?: Date;
  keyword?: string;
  semanticQuery?: string;
  includeReplies: boolean;
  includeRetweets: boolean;
  minLikes?: number;
  maxLikes?: number;
}

export interface DeleteProgress {
  total: number;
  completed: number;
  failed: number;
  skipped: number;
  currentTweetId?: string;
  isPaused: boolean;
  estimatedTimeRemaining?: number;
}
