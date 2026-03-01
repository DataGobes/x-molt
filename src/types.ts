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
  | "batch-delete";

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

// --- Batch Delete ---

export interface BatchDeleteFilter {
  beforeDate?: Date;
  afterDate?: Date;
  keyword?: string;
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
