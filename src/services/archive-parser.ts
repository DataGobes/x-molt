import { readFileSync } from "fs";
import { ArchiveTweetSchema, type ArchiveTweet } from "../types.js";
import AdmZip from "adm-zip";

export function parseTweetsJs(content: string): ArchiveTweet[] {
  // X archive format: window.YTD.tweets.part0 = [...]
  const jsonStr = content.replace(/^window\.YTD\.tweets\.part\d+\s*=\s*/, "");
  const raw = JSON.parse(jsonStr);

  if (!Array.isArray(raw)) {
    throw new Error("Expected an array of tweets");
  }

  const tweets: ArchiveTweet[] = [];
  const errors: string[] = [];

  for (const item of raw) {
    const result = ArchiveTweetSchema.safeParse(item);
    if (result.success) {
      tweets.push(result.data);
    } else {
      errors.push(`Tweet parse error: ${result.error.message}`);
    }
  }

  if (tweets.length === 0 && errors.length > 0) {
    throw new Error(`Failed to parse any tweets. First error: ${errors[0]}`);
  }

  return tweets;
}

export function loadArchiveFromFile(filePath: string): ArchiveTweet[] {
  const content = readFileSync(filePath, "utf-8");
  return parseTweetsJs(content);
}

export function loadArchiveFromZip(zipPath: string): ArchiveTweet[] {
  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries();

  // Look for tweets.js in the archive
  const tweetsEntry = entries.find(
    (e) => e.entryName.endsWith("tweets.js") || e.entryName.includes("data/tweets.js")
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
