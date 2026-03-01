import { TwitterApi } from "twitter-api-v2";
import type { Credentials, UserProfile } from "../types.js";

let client: TwitterApi | null = null;

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
  return { id: result.data.id };
}

export async function deleteTweet(id: string): Promise<boolean> {
  const api = getClient();
  const result = await api.v2.deleteTweet(id);
  return result.data.deleted;
}

export async function verifyCredentials(): Promise<boolean> {
  try {
    const api = getClient();
    await api.v2.me();
    return true;
  } catch {
    return false;
  }
}
