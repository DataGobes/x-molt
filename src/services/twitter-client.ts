import { TwitterApi } from "twitter-api-v2";
import type {
  Credentials, UserProfile, TimelineTweet, TimelineResult, SearchResult, BookmarkResult,
  LiveUser, LiveUserResult, LiveList, LiveListResult, LiveDmMessage, LiveDmResult,
  ApiUsageResult, ApiUsageDaily,
} from "../types.js";
import type { CostTracker } from "./cost-tracker.js";

let client: TwitterApi | null = null;
let costTracker: CostTracker | null = null;

export function setCostTracker(tracker: CostTracker): void {
  costTracker = tracker;
}

export function initClient(creds: Credentials): TwitterApi {
  client = new TwitterApi({
    appKey: creds.appKey,
    appSecret: creds.appSecret,
    accessToken: creds.accessToken,
    accessSecret: creds.accessSecret,
  });
  return client;
}

export function getClient(): TwitterApi {
  if (!client) throw new Error("Twitter client not initialized. Call initClient() first.");
  return client;
}

export async function fetchProfile(): Promise<UserProfile> {
  const api = getClient();
  const me = await api.v2.me({
    "user.fields": [
      "description",
      "public_metrics",
      "created_at",
      "verified",
      "profile_image_url",
    ],
  });

  costTracker?.record("users/me");
  const u = me.data;
  return {
    id: u.id,
    name: u.name,
    username: u.username,
    description: u.description ?? "",
    publicMetrics: {
      followers: u.public_metrics?.followers_count ?? 0,
      following: u.public_metrics?.following_count ?? 0,
      tweets: u.public_metrics?.tweet_count ?? 0,
      listed: u.public_metrics?.listed_count ?? 0,
    },
    createdAt: u.created_at ?? "",
    verified: u.verified ?? false,
    profileImageUrl: u.profile_image_url,
  };
}

export async function postTweet(text: string): Promise<{ id: string }> {
  const api = getClient();
  const result = await api.v2.tweet(text);
  costTracker?.record("tweets/create");
  return { id: result.data.id };
}

export async function deleteTweet(id: string): Promise<boolean> {
  const api = getClient();
  const result = await api.v2.deleteTweet(id);
  costTracker?.record("tweets/delete");
  return result.data.deleted;
}

export async function verifyCredentials(): Promise<boolean> {
  try {
    const api = getClient();
    await api.v2.me();
    costTracker?.record("users/me");
    return true;
  } catch {
    return false;
  }
}

// --- Tweet fields shared across read endpoints ---

const TWEET_FIELDS = [
  "created_at",
  "public_metrics",
  "author_id",
  "in_reply_to_user_id",
  "referenced_tweets",
] as const;

const USER_FIELDS = ["name", "username"] as const;

function mapTweet(t: any, users?: Map<string, { name: string; username: string }>): TimelineTweet {
  const author = users?.get(t.author_id);
  return {
    id: t.id,
    text: t.text,
    createdAt: t.created_at ?? "",
    authorId: t.author_id ?? "",
    authorName: author?.name,
    authorUsername: author?.username,
    publicMetrics: {
      likes: t.public_metrics?.like_count ?? 0,
      retweets: t.public_metrics?.retweet_count ?? 0,
      replies: t.public_metrics?.reply_count ?? 0,
      impressions: t.public_metrics?.impression_count ?? 0,
    },
    isReply: !!t.in_reply_to_user_id,
    isRetweet: t.referenced_tweets?.some((r: any) => r.type === "retweeted") ?? false,
  };
}

function buildUserMap(includes?: any): Map<string, { name: string; username: string }> {
  const map = new Map<string, { name: string; username: string }>();
  if (includes?.users) {
    for (const u of includes.users) {
      map.set(u.id, { name: u.name, username: u.username });
    }
  }
  return map;
}

// --- Read endpoints ---

export async function getHomeTimeline(maxResults = 10, paginationToken?: string): Promise<TimelineResult> {
  const api = getClient();
  const result = await api.v2.homeTimeline({
    max_results: maxResults,
    "tweet.fields": [...TWEET_FIELDS],
    "user.fields": [...USER_FIELDS],
    expansions: ["author_id"],
    ...(paginationToken ? { pagination_token: paginationToken } : {}),
  });
  const tweets = (result.data.data ?? []).map((t) => mapTweet(t, buildUserMap(result.includes)));
  costTracker?.record("users/timeline", tweets.length);
  return {
    tweets,
    nextToken: result.data.meta?.next_token,
  };
}

export async function getUserTimeline(userId?: string, maxResults = 10, paginationToken?: string): Promise<TimelineResult> {
  const api = getClient();
  const uid = userId ?? (await api.v2.me()).data.id;
  if (!userId) costTracker?.record("users/me");
  const result = await api.v2.userTimeline(uid, {
    max_results: maxResults,
    "tweet.fields": [...TWEET_FIELDS],
    "user.fields": [...USER_FIELDS],
    expansions: ["author_id"],
    ...(paginationToken ? { pagination_token: paginationToken } : {}),
  });
  const tweets = (result.data.data ?? []).map((t) => mapTweet(t, buildUserMap(result.includes)));
  costTracker?.record("users/timeline", tweets.length);
  return {
    tweets,
    nextToken: result.data.meta?.next_token,
  };
}

export async function searchRecentTweets(query: string, maxResults = 10, nextToken?: string): Promise<SearchResult> {
  const api = getClient();
  const result = await api.v2.search(query, {
    max_results: maxResults,
    "tweet.fields": [...TWEET_FIELDS],
    "user.fields": [...USER_FIELDS],
    expansions: ["author_id"],
    ...(nextToken ? { next_token: nextToken } : {}),
  });
  const tweets = (result.data.data ?? []).map((t) => mapTweet(t, buildUserMap(result.includes)));
  costTracker?.record("tweets/search/recent", tweets.length);
  return {
    tweets,
    nextToken: result.data.meta?.next_token,
    totalCount: result.data.meta?.result_count,
  };
}

export async function getTweetById(id: string): Promise<TimelineTweet | null> {
  const api = getClient();
  const result = await api.v2.singleTweet(id, {
    "tweet.fields": [...TWEET_FIELDS],
    "user.fields": [...USER_FIELDS],
    expansions: ["author_id"],
  });
  costTracker?.record("tweets/lookup", 1);
  if (!result.data) return null;
  const users = buildUserMap(result.includes);
  return mapTweet(result.data, users);
}

export async function getTweetsByIds(ids: string[]): Promise<TimelineTweet[]> {
  if (ids.length === 0) return [];
  const api = getClient();
  const result = await api.v2.tweets(ids, {
    "tweet.fields": [...TWEET_FIELDS],
    "user.fields": [...USER_FIELDS],
    expansions: ["author_id"],
  });
  const data = result.data ?? [];
  costTracker?.record("tweets/lookup", data.length);
  const users = buildUserMap(result.includes);
  return data.map((t) => mapTweet(t, users));
}

export async function getBookmarks(maxResults = 10, paginationToken?: string): Promise<BookmarkResult> {
  const api = getClient();
  const result = await api.v2.bookmarks({
    max_results: maxResults,
    "tweet.fields": [...TWEET_FIELDS],
    "user.fields": [...USER_FIELDS],
    expansions: ["author_id"],
    ...(paginationToken ? { pagination_token: paginationToken } : {}),
  });
  const tweets = (result.data.data ?? []).map((t) => mapTweet(t, buildUserMap(result.includes)));
  costTracker?.record("bookmarks", tweets.length);
  return {
    tweets,
    nextToken: result.data.meta?.next_token,
  };
}

// --- Interaction endpoints ---

let cachedUserId: string | null = null;

async function getMyUserId(): Promise<string> {
  if (cachedUserId) return cachedUserId;
  const api = getClient();
  const me = await api.v2.me();
  costTracker?.record("users/me");
  cachedUserId = me.data.id;
  return cachedUserId;
}

export async function likeTweet(tweetId: string): Promise<boolean> {
  const api = getClient();
  const userId = await getMyUserId();
  const result = await api.v2.like(userId, tweetId);
  costTracker?.record("tweets/like");
  return result.data.liked;
}

export async function unlikeTweet(tweetId: string): Promise<boolean> {
  const api = getClient();
  const userId = await getMyUserId();
  const result = await api.v2.unlike(userId, tweetId);
  costTracker?.record("tweets/unlike");
  return !result.data.liked;
}

export async function retweet(tweetId: string): Promise<boolean> {
  const api = getClient();
  const userId = await getMyUserId();
  const result = await api.v2.retweet(userId, tweetId);
  costTracker?.record("tweets/retweet");
  return result.data.retweeted;
}

export async function unretweet(tweetId: string): Promise<boolean> {
  const api = getClient();
  const userId = await getMyUserId();
  const result = await api.v2.unretweet(userId, tweetId);
  costTracker?.record("tweets/unretweet");
  return !result.data.retweeted;
}

export async function bookmarkTweet(tweetId: string): Promise<boolean> {
  const api = getClient();
  const result = await api.v2.bookmark(tweetId);
  costTracker?.record("bookmarks/create");
  return result.data.bookmarked;
}

export async function removeBookmark(tweetId: string): Promise<boolean> {
  const api = getClient();
  const result = await api.v2.deleteBookmark(tweetId);
  costTracker?.record("bookmarks/delete");
  return !result.data.bookmarked;
}

export async function followUser(targetUserId: string): Promise<boolean> {
  const api = getClient();
  const userId = await getMyUserId();
  const result = await api.v2.follow(userId, targetUserId);
  costTracker?.record("users/follow");
  return result.data.following;
}

export async function unfollowUser(targetUserId: string): Promise<boolean> {
  const api = getClient();
  const userId = await getMyUserId();
  const result = await api.v2.unfollow(userId, targetUserId);
  costTracker?.record("users/unfollow");
  return !result.data.following;
}

// --- Social endpoints ---

const SOCIAL_USER_FIELDS = ["name", "username", "description", "public_metrics"] as const;

function mapUser(u: any): LiveUser {
  return {
    id: u.id,
    name: u.name,
    username: u.username,
    description: u.description,
    publicMetrics: u.public_metrics ? {
      followers: u.public_metrics.followers_count ?? 0,
      following: u.public_metrics.following_count ?? 0,
      tweets: u.public_metrics.tweet_count ?? 0,
    } : undefined,
  };
}

export async function getFollowers(maxResults = 20, paginationToken?: string): Promise<LiveUserResult> {
  const api = getClient();
  const userId = await getMyUserId();
  const result = await api.v2.followers(userId, {
    max_results: maxResults,
    "user.fields": [...SOCIAL_USER_FIELDS],
    ...(paginationToken ? { pagination_token: paginationToken } : {}),
  });
  const users = (result.data ?? []).map(mapUser);
  costTracker?.record("users/followers", users.length);
  return {
    users,
    nextToken: result.meta?.next_token,
  };
}

export async function getFollowing(maxResults = 20, paginationToken?: string): Promise<LiveUserResult> {
  const api = getClient();
  const userId = await getMyUserId();
  const result = await api.v2.following(userId, {
    max_results: maxResults,
    "user.fields": [...SOCIAL_USER_FIELDS],
    ...(paginationToken ? { pagination_token: paginationToken } : {}),
  });
  const users = (result.data ?? []).map(mapUser);
  costTracker?.record("users/following", users.length);
  return {
    users,
    nextToken: result.meta?.next_token,
  };
}

export async function blockUser(targetUserId: string): Promise<boolean> {
  const api = getClient();
  const userId = await getMyUserId();
  const result = await api.v2.block(userId, targetUserId);
  costTracker?.record("users/block");
  return result.data.blocking;
}

export async function unblockUser(targetUserId: string): Promise<boolean> {
  const api = getClient();
  const userId = await getMyUserId();
  const result = await api.v2.unblock(userId, targetUserId);
  costTracker?.record("users/unblock");
  return !result.data.blocking;
}

export async function muteUser(targetUserId: string): Promise<boolean> {
  const api = getClient();
  const userId = await getMyUserId();
  const result = await api.v2.mute(userId, targetUserId);
  costTracker?.record("users/mute");
  return result.data.muting;
}

export async function unmuteUser(targetUserId: string): Promise<boolean> {
  const api = getClient();
  const userId = await getMyUserId();
  const result = await api.v2.unmute(userId, targetUserId);
  costTracker?.record("users/unmute");
  return !result.data.muting;
}

// --- Lists endpoints ---

function mapList(l: any): LiveList {
  return {
    id: l.id,
    name: l.name,
    description: l.description ?? "",
    memberCount: l.member_count ?? 0,
    followerCount: l.follower_count ?? 0,
    isPrivate: l.private ?? false,
    ownerId: l.owner_id ?? "",
  };
}

export async function getOwnedLists(maxResults = 20, paginationToken?: string): Promise<LiveListResult> {
  const api = getClient();
  const userId = await getMyUserId();
  const result = await api.v2.listsOwned(userId, {
    max_results: maxResults,
    "list.fields": ["member_count", "follower_count", "private", "owner_id", "description"],
    ...(paginationToken ? { pagination_token: paginationToken } : {}),
  });
  const lists = (result.lists ?? []).map(mapList);
  costTracker?.record("lists", lists.length);
  return {
    lists,
    nextToken: result.meta?.next_token,
  };
}

export async function createList(name: string, description?: string, isPrivate = false): Promise<LiveList> {
  const api = getClient();
  const result = await api.v2.createList({
    name,
    ...(description ? { description } : {}),
    private: isPrivate,
  });
  costTracker?.record("lists/create");
  return mapList(result.data);
}

export async function addListMember(listId: string, userId: string): Promise<boolean> {
  const api = getClient();
  const result = await api.v2.addListMember(listId, userId);
  costTracker?.record("lists/members/add");
  return result.data.is_member;
}

export async function removeListMember(listId: string, userId: string): Promise<boolean> {
  const api = getClient();
  const result = await api.v2.removeListMember(listId, userId);
  costTracker?.record("lists/members/remove");
  return !result.data.is_member;
}

// --- DM endpoints ---

export async function getDmEvents(maxResults = 20, paginationToken?: string): Promise<LiveDmResult> {
  const api = getClient();
  const result = await api.v2.listDmEvents({
    max_results: maxResults,
    "dm_event.fields": ["id", "text", "sender_id", "created_at", "dm_conversation_id"],
    ...(paginationToken ? { pagination_token: paginationToken } : {}),
  });
  const messages = (result.events ?? []).map((e: any) => ({
    id: e.id,
    text: e.text ?? "",
    senderId: e.sender_id ?? "",
    createdAt: e.created_at ?? "",
    conversationId: e.dm_conversation_id ?? "",
  }));
  costTracker?.record("dm/conversations", messages.length);
  return {
    messages,
    nextToken: result.meta?.next_token,
  };
}

export async function getDmConversationMessages(conversationId: string, maxResults = 20, paginationToken?: string): Promise<LiveDmResult> {
  const api = getClient();
  const result = await api.v2.listDmEventsOfConversation(conversationId, {
    max_results: maxResults,
    "dm_event.fields": ["id", "text", "sender_id", "created_at", "dm_conversation_id"],
    ...(paginationToken ? { pagination_token: paginationToken } : {}),
  });
  const messages = (result.events ?? []).map((e: any) => ({
    id: e.id,
    text: e.text ?? "",
    senderId: e.sender_id ?? "",
    createdAt: e.created_at ?? "",
    conversationId: e.dm_conversation_id ?? conversationId,
  }));
  costTracker?.record("dm/messages", messages.length);
  return {
    messages,
    nextToken: result.meta?.next_token,
  };
}

export async function sendDm(conversationId: string, text: string): Promise<boolean> {
  const api = getClient();
  await api.v2.sendDmInConversation(conversationId, { text });
  costTracker?.record("dm/send");
  return true;
}

// --- Usage endpoint (free, no cost) ---

export async function getUsage(days = 30): Promise<ApiUsageResult> {
  const api = getClient();
  const result = await api.v2.usage({
    days,
    "usage.fields": ["cap_reset_day", "daily_project_usage", "project_cap", "project_id", "project_usage"],
  });
  const data = result.data;
  const dailyUsage: ApiUsageDaily[] = [];
  if (data.daily_project_usage) {
    for (const project of data.daily_project_usage) {
      for (const entry of project.usage ?? []) {
        dailyUsage.push({
          date: typeof entry.date === "string" ? entry.date.slice(0, 10) : String(entry.date),
          usage: typeof entry.usage === "string" ? parseInt(entry.usage, 10) : (entry.usage as number),
        });
      }
    }
  }
  return {
    projectId: data.project_id ?? "",
    projectUsage: typeof data.project_usage === "string" ? parseInt(data.project_usage, 10) : (data.project_usage ?? 0),
    projectCap: typeof data.project_cap === "string" ? parseInt(data.project_cap, 10) : (data.project_cap ?? 0),
    capResetDay: data.cap_reset_day ?? 0,
    dailyUsage,
  };
}
