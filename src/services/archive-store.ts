import Database from "better-sqlite3";
import type { StoredTweet, BatchDeleteFilter } from "../types.js";
import { parseTweetDate } from "../utils/format.js";

export class ArchiveStore {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.init();
  }

  private init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tweets (
        id TEXT PRIMARY KEY,
        full_text TEXT NOT NULL,
        created_at TEXT NOT NULL,
        created_at_ts INTEGER NOT NULL,
        favorite_count INTEGER DEFAULT 0,
        retweet_count INTEGER DEFAULT 0,
        is_reply INTEGER DEFAULT 0,
        is_retweet INTEGER DEFAULT 0,
        deleted INTEGER DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_tweets_created_at_ts ON tweets(created_at_ts);
      CREATE INDEX IF NOT EXISTS idx_tweets_deleted ON tweets(deleted);

      CREATE VIRTUAL TABLE IF NOT EXISTS tweets_fts USING fts5(
        id,
        full_text,
        content=tweets,
        content_rowid=rowid
      );

      -- Triggers to keep FTS in sync
      CREATE TRIGGER IF NOT EXISTS tweets_ai AFTER INSERT ON tweets BEGIN
        INSERT INTO tweets_fts(rowid, id, full_text) VALUES (new.rowid, new.id, new.full_text);
      END;

      CREATE TRIGGER IF NOT EXISTS tweets_ad AFTER DELETE ON tweets BEGIN
        INSERT INTO tweets_fts(tweets_fts, rowid, id, full_text) VALUES('delete', old.rowid, old.id, old.full_text);
      END;

      CREATE TRIGGER IF NOT EXISTS tweets_au AFTER UPDATE ON tweets BEGIN
        INSERT INTO tweets_fts(tweets_fts, rowid, id, full_text) VALUES('delete', old.rowid, old.id, old.full_text);
        INSERT INTO tweets_fts(rowid, id, full_text) VALUES (new.rowid, new.id, new.full_text);
      END;

      -- Post tracking table
      CREATE TABLE IF NOT EXISTS post_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tweet_id TEXT NOT NULL,
        posted_at TEXT NOT NULL DEFAULT (datetime('now')),
        month TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_post_log_month ON post_log(month);
    `);
  }

  insertTweet(tweet: {
    id: string;
    fullText: string;
    createdAt: string;
    favoriteCount: number;
    retweetCount: number;
    isReply: boolean;
    isRetweet: boolean;
  }): void {
    const ts = Math.floor(parseTweetDate(tweet.createdAt).getTime() / 1000);
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO tweets (id, full_text, created_at, created_at_ts, favorite_count, retweet_count, is_reply, is_retweet)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      tweet.id,
      tweet.fullText,
      tweet.createdAt,
      ts,
      tweet.favoriteCount,
      tweet.retweetCount,
      tweet.isReply ? 1 : 0,
      tweet.isRetweet ? 1 : 0
    );
  }

  insertMany(tweets: Parameters<ArchiveStore["insertTweet"]>[0][]): number {
    const insert = this.db.transaction((items: typeof tweets) => {
      let count = 0;
      for (const t of items) {
        this.insertTweet(t);
        count++;
      }
      return count;
    });
    return insert(tweets);
  }

  getTweetCount(): number {
    const row = this.db.prepare("SELECT COUNT(*) as count FROM tweets").get() as { count: number };
    return row.count;
  }

  searchTweets(query: string, limit = 50): StoredTweet[] {
    const rows = this.db.prepare(`
      SELECT t.* FROM tweets t
      JOIN tweets_fts fts ON t.id = fts.id
      WHERE tweets_fts MATCH ?
      ORDER BY t.created_at_ts DESC
      LIMIT ?
    `).all(query, limit) as any[];
    return rows.map(this.rowToTweet);
  }

  getTweetsByDateRange(start: Date, end: Date, limit = 50): StoredTweet[] {
    const startTs = Math.floor(start.getTime() / 1000);
    const endTs = Math.floor(end.getTime() / 1000);
    const rows = this.db.prepare(`
      SELECT * FROM tweets
      WHERE created_at_ts >= ? AND created_at_ts <= ?
      ORDER BY created_at_ts DESC
      LIMIT ?
    `).all(startTs, endTs, limit) as any[];
    return rows.map(this.rowToTweet);
  }

  getFilteredTweets(filter: BatchDeleteFilter, limit?: number): StoredTweet[] {
    const conditions: string[] = ["deleted = 0"];
    const params: any[] = [];

    if (filter.beforeDate) {
      conditions.push("created_at_ts <= ?");
      params.push(Math.floor(filter.beforeDate.getTime() / 1000));
    }
    if (filter.afterDate) {
      conditions.push("created_at_ts >= ?");
      params.push(Math.floor(filter.afterDate.getTime() / 1000));
    }
    if (!filter.includeReplies) {
      conditions.push("is_reply = 0");
    }
    if (!filter.includeRetweets) {
      conditions.push("is_retweet = 0");
    }
    if (filter.minLikes !== undefined) {
      conditions.push("favorite_count >= ?");
      params.push(filter.minLikes);
    }
    if (filter.maxLikes !== undefined) {
      conditions.push("favorite_count <= ?");
      params.push(filter.maxLikes);
    }

    let sql: string;
    let queryParams: any[];

    if (filter.keyword) {
      sql = `
        SELECT t.* FROM tweets t
        JOIN tweets_fts fts ON t.id = fts.id
        WHERE tweets_fts MATCH ? AND ${conditions.join(" AND ")}
        ORDER BY t.created_at_ts ASC
      `;
      queryParams = [filter.keyword, ...params];
    } else {
      sql = `SELECT * FROM tweets WHERE ${conditions.join(" AND ")} ORDER BY created_at_ts ASC`;
      queryParams = [...params];
    }

    if (limit) {
      sql += ` LIMIT ?`;
      queryParams.push(limit);
    }

    const rows = this.db.prepare(sql).all(...queryParams) as any[];
    return rows.map(this.rowToTweet);
  }

  markDeleted(id: string): void {
    this.db.prepare("UPDATE tweets SET deleted = 1 WHERE id = ?").run(id);
  }

  isDeleted(id: string): boolean {
    const row = this.db.prepare("SELECT deleted FROM tweets WHERE id = ?").get(id) as { deleted: number } | undefined;
    return row?.deleted === 1;
  }

  logPost(tweetId: string): void {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    this.db.prepare("INSERT INTO post_log (tweet_id, month) VALUES (?, ?)").run(tweetId, month);
  }

  getMonthlyPostCount(): number {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const row = this.db.prepare("SELECT COUNT(*) as count FROM post_log WHERE month = ?").get(month) as { count: number };
    return row.count;
  }

  getStats() {
    const total = this.getTweetCount();
    const deleted = (this.db.prepare("SELECT COUNT(*) as count FROM tweets WHERE deleted = 1").get() as { count: number }).count;
    const replies = (this.db.prepare("SELECT COUNT(*) as count FROM tweets WHERE is_reply = 1").get() as { count: number }).count;
    const retweets = (this.db.prepare("SELECT COUNT(*) as count FROM tweets WHERE is_retweet = 1").get() as { count: number }).count;
    const oldest = this.db.prepare("SELECT created_at FROM tweets ORDER BY created_at_ts ASC LIMIT 1").get() as { created_at: string } | undefined;
    const newest = this.db.prepare("SELECT created_at FROM tweets ORDER BY created_at_ts DESC LIMIT 1").get() as { created_at: string } | undefined;

    return {
      total,
      deleted,
      active: total - deleted,
      replies,
      retweets,
      original: total - replies - retweets,
      oldestDate: oldest?.created_at,
      newestDate: newest?.created_at,
    };
  }

  private rowToTweet(row: any): StoredTweet {
    return {
      id: row.id,
      fullText: row.full_text,
      createdAt: row.created_at,
      createdAtTs: row.created_at_ts,
      favoriteCount: row.favorite_count,
      retweetCount: row.retweet_count,
      isReply: row.is_reply === 1,
      isRetweet: row.is_retweet === 1,
      deleted: row.deleted === 1,
    };
  }

  close(): void {
    this.db.close();
  }
}
