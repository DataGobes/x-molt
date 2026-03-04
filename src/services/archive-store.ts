import Database from "better-sqlite3";
import { VectorStore, VECTOR_CONFIGS } from "./vector-store.js";
import type {
  StoredTweet,
  StoredLike,
  StoredFollower,
  StoredFollowing,
  StoredBlock,
  StoredMute,
  StoredAccount,
  StoredProfile,
  StoredDmConversation,
  StoredDirectMessage,
  StoredNoteTweet,
  StoredGrokChat,
  StoredIpAudit,
  StoredInterest,
  StoredDemographic,
  StoredContact,
  StoredAdEngagement,
  StoredAdImpression,
  StoredAdTargeting,
  StoredConnectedApp,
  StoredDeviceToken,
  StoredApp,
  BatchDeleteFilter,
  DateHierarchy,
  YearBucket,
  MonthBucket,
  EmbeddableType,
  ArchiveDirectMessage,
  ArchiveAdEngagement,
  ArchiveAdImpression,
} from "../types.js";
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

      -- Likes
      CREATE TABLE IF NOT EXISTS likes (
        tweet_id TEXT PRIMARY KEY,
        full_text TEXT NOT NULL,
        expanded_url TEXT NOT NULL
      );

      -- Followers
      CREATE TABLE IF NOT EXISTS followers (
        account_id TEXT PRIMARY KEY,
        user_link TEXT NOT NULL
      );

      -- Following
      CREATE TABLE IF NOT EXISTS following (
        account_id TEXT PRIMARY KEY,
        user_link TEXT NOT NULL
      );

      -- Blocks
      CREATE TABLE IF NOT EXISTS blocks (
        account_id TEXT PRIMARY KEY,
        user_link TEXT NOT NULL
      );

      -- Mutes
      CREATE TABLE IF NOT EXISTS mutes (
        account_id TEXT PRIMARY KEY,
        user_link TEXT NOT NULL
      );

      -- Account info
      CREATE TABLE IF NOT EXISTS account (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        username TEXT NOT NULL,
        display_name TEXT NOT NULL,
        created_at TEXT NOT NULL,
        created_via TEXT NOT NULL
      );

      -- Profile info
      CREATE TABLE IF NOT EXISTS profile (
        id INTEGER PRIMARY KEY DEFAULT 1,
        bio TEXT NOT NULL,
        website TEXT NOT NULL,
        location TEXT NOT NULL,
        avatar_url TEXT NOT NULL
      );

      -- DM Conversations
      CREATE TABLE IF NOT EXISTS dm_conversations (
        conversation_id TEXT PRIMARY KEY,
        message_count INTEGER DEFAULT 0
      );

      -- Direct Messages
      CREATE TABLE IF NOT EXISTS direct_messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        sender_id TEXT NOT NULL,
        recipient_id TEXT NOT NULL,
        text TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (conversation_id) REFERENCES dm_conversations(conversation_id)
      );

      CREATE INDEX IF NOT EXISTS idx_dm_conversation ON direct_messages(conversation_id);

      -- Note Tweets
      CREATE TABLE IF NOT EXISTS note_tweets (
        note_tweet_id TEXT PRIMARY KEY,
        text TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT '',
        lifecycle TEXT NOT NULL DEFAULT ''
      );

      -- Grok Chats
      CREATE TABLE IF NOT EXISTS grok_chats (
        chat_id TEXT NOT NULL,
        account_id TEXT NOT NULL DEFAULT '',
        sender TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at TEXT NOT NULL,
        grok_mode TEXT NOT NULL DEFAULT '',
        PRIMARY KEY (chat_id, created_at)
      );

      -- IP Audit
      CREATE TABLE IF NOT EXISTS ip_audit (
        account_id TEXT NOT NULL,
        login_ip TEXT NOT NULL,
        login_port TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        PRIMARY KEY (account_id, created_at, login_ip)
      );

      -- Interests (from personalization)
      CREATE TABLE IF NOT EXISTS interests (
        name TEXT PRIMARY KEY,
        is_disabled INTEGER DEFAULT 0
      );

      -- Demographics (from personalization)
      CREATE TABLE IF NOT EXISTS demographics (
        type TEXT NOT NULL,
        value TEXT NOT NULL,
        PRIMARY KEY (type, value)
      );

      -- Contacts
      CREATE TABLE IF NOT EXISTS contacts (
        type TEXT NOT NULL,
        value TEXT NOT NULL,
        PRIMARY KEY (type, value)
      );

      -- Ad Engagements
      CREATE TABLE IF NOT EXISTS ad_engagements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tweet_id TEXT NOT NULL DEFAULT '',
        tweet_text TEXT NOT NULL DEFAULT '',
        advertiser_name TEXT NOT NULL DEFAULT '',
        advertiser_screen_name TEXT NOT NULL DEFAULT '',
        display_location TEXT NOT NULL DEFAULT '',
        os_type TEXT NOT NULL DEFAULT '',
        device_type TEXT NOT NULL DEFAULT ''
      );

      CREATE INDEX IF NOT EXISTS idx_ad_eng_advertiser ON ad_engagements(advertiser_name);

      -- Ad Impressions
      CREATE TABLE IF NOT EXISTS ad_impressions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tweet_id TEXT NOT NULL DEFAULT '',
        tweet_text TEXT NOT NULL DEFAULT '',
        advertiser_name TEXT NOT NULL DEFAULT '',
        advertiser_screen_name TEXT NOT NULL DEFAULT '',
        display_location TEXT NOT NULL DEFAULT '',
        os_type TEXT NOT NULL DEFAULT '',
        device_type TEXT NOT NULL DEFAULT ''
      );

      CREATE INDEX IF NOT EXISTS idx_ad_imp_advertiser ON ad_impressions(advertiser_name);

      -- Ad Targeting (shared by engagements + impressions)
      CREATE TABLE IF NOT EXISTS ad_targeting (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id INTEGER NOT NULL,
        event_type TEXT NOT NULL,
        targeting_type TEXT NOT NULL,
        targeting_value TEXT NOT NULL DEFAULT ''
      );

      CREATE INDEX IF NOT EXISTS idx_ad_targeting_event ON ad_targeting(event_id, event_type);

      -- Connected Apps
      CREATE TABLE IF NOT EXISTS connected_apps (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        permissions TEXT NOT NULL DEFAULT '',
        approved_at TEXT NOT NULL,
        org_name TEXT NOT NULL DEFAULT '',
        org_url TEXT NOT NULL DEFAULT ''
      );

      -- Device Tokens
      CREATE TABLE IF NOT EXISTS device_tokens (
        client_application_id TEXT NOT NULL,
        token TEXT NOT NULL,
        client_application_name TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL DEFAULT '',
        PRIMARY KEY (client_application_id, token)
      );

      -- Apps
      CREATE TABLE IF NOT EXISTS apps (
        app_id TEXT PRIMARY KEY,
        app_names TEXT NOT NULL DEFAULT ''
      );
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

  getTweets(limit = 50, offset = 0): StoredTweet[] {
    const rows = this.db.prepare(
      "SELECT * FROM tweets ORDER BY created_at_ts DESC LIMIT ? OFFSET ?"
    ).all(limit, offset) as any[];
    return rows.map(this.rowToTweet);
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

  getDateHierarchy(): DateHierarchy {
    const rows = this.db.prepare(`
      SELECT
        strftime('%Y', created_at_ts, 'unixepoch') AS year,
        strftime('%m', created_at_ts, 'unixepoch') AS month,
        strftime('%d', created_at_ts, 'unixepoch') AS day,
        COUNT(*) AS count
      FROM tweets
      GROUP BY year, month, day
      ORDER BY year DESC, month DESC, day DESC
    `).all() as { year: string; month: string; day: string; count: number }[];

    const yearMap = new Map<string, YearBucket>();
    for (const row of rows) {
      let yearBucket = yearMap.get(row.year);
      if (!yearBucket) {
        yearBucket = { year: row.year, count: 0, months: [] };
        yearMap.set(row.year, yearBucket);
      }
      yearBucket.count += row.count;

      let monthBucket = yearBucket.months.find((m) => m.month === row.month);
      if (!monthBucket) {
        monthBucket = { month: row.month, count: 0, days: [] };
        yearBucket.months.push(monthBucket);
      }
      monthBucket.count += row.count;

      monthBucket.days.push({ day: row.day, count: row.count });
    }

    return Array.from(yearMap.values());
  }

  getTweetsByDay(year: number, month: number, day: number): StoredTweet[] {
    const start = Math.floor(Date.UTC(year, month - 1, day) / 1000);
    const end = Math.floor(Date.UTC(year, month - 1, day + 1) / 1000);
    const rows = this.db.prepare(`
      SELECT * FROM tweets
      WHERE created_at_ts >= ? AND created_at_ts < ?
      ORDER BY created_at_ts DESC
    `).all(start, end) as any[];
    return rows.map(this.rowToTweet);
  }

  markDeleted(id: string): void {
    this.db.prepare("UPDATE tweets SET deleted = 1 WHERE id = ?").run(id);
  }

  updateTweetMetrics(id: string, favoriteCount: number, retweetCount: number): void {
    this.db.prepare("UPDATE tweets SET favorite_count = ?, retweet_count = ? WHERE id = ?").run(favoriteCount, retweetCount, id);
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

  // --- Likes ---

  insertLike(like: StoredLike): void {
    this.db.prepare(
      "INSERT OR IGNORE INTO likes (tweet_id, full_text, expanded_url) VALUES (?, ?, ?)"
    ).run(like.tweetId, like.fullText, like.expandedUrl);
  }

  insertManyLikes(likes: StoredLike[]): number {
    const insert = this.db.transaction((items: StoredLike[]) => {
      for (const l of items) this.insertLike(l);
      return items.length;
    });
    return insert(likes);
  }

  getLikeCount(): number {
    return (this.db.prepare("SELECT COUNT(*) as count FROM likes").get() as { count: number }).count;
  }

  getLikes(limit = 50, offset = 0): StoredLike[] {
    return this.db.prepare(
      "SELECT tweet_id, full_text, expanded_url FROM likes LIMIT ? OFFSET ?"
    ).all(limit, offset).map((row: any) => ({
      tweetId: row.tweet_id,
      fullText: row.full_text,
      expandedUrl: row.expanded_url,
    }));
  }

  searchLikes(query: string, limit = 50): StoredLike[] {
    return this.db.prepare(
      "SELECT tweet_id, full_text, expanded_url FROM likes WHERE full_text LIKE ? LIMIT ?"
    ).all(`%${query}%`, limit).map((row: any) => ({
      tweetId: row.tweet_id,
      fullText: row.full_text,
      expandedUrl: row.expanded_url,
    }));
  }

  // --- Followers ---

  insertFollower(follower: StoredFollower): void {
    this.db.prepare(
      "INSERT OR IGNORE INTO followers (account_id, user_link) VALUES (?, ?)"
    ).run(follower.accountId, follower.userLink);
  }

  insertManyFollowers(followers: StoredFollower[]): number {
    const insert = this.db.transaction((items: StoredFollower[]) => {
      for (const f of items) this.insertFollower(f);
      return items.length;
    });
    return insert(followers);
  }

  getFollowerCount(): number {
    return (this.db.prepare("SELECT COUNT(*) as count FROM followers").get() as { count: number }).count;
  }

  getFollowers(limit = 50, offset = 0): StoredFollower[] {
    return this.db.prepare(
      "SELECT account_id, user_link FROM followers LIMIT ? OFFSET ?"
    ).all(limit, offset).map((row: any) => ({
      accountId: row.account_id,
      userLink: row.user_link,
    }));
  }

  // --- Following ---

  insertFollowing(following: StoredFollowing): void {
    this.db.prepare(
      "INSERT OR IGNORE INTO following (account_id, user_link) VALUES (?, ?)"
    ).run(following.accountId, following.userLink);
  }

  insertManyFollowing(following: StoredFollowing[]): number {
    const insert = this.db.transaction((items: StoredFollowing[]) => {
      for (const f of items) this.insertFollowing(f);
      return items.length;
    });
    return insert(following);
  }

  getFollowingCount(): number {
    return (this.db.prepare("SELECT COUNT(*) as count FROM following").get() as { count: number }).count;
  }

  getFollowing(limit = 50, offset = 0): StoredFollowing[] {
    return this.db.prepare(
      "SELECT account_id, user_link FROM following LIMIT ? OFFSET ?"
    ).all(limit, offset).map((row: any) => ({
      accountId: row.account_id,
      userLink: row.user_link,
    }));
  }

  // --- Blocks ---

  insertBlock(block: StoredBlock): void {
    this.db.prepare(
      "INSERT OR IGNORE INTO blocks (account_id, user_link) VALUES (?, ?)"
    ).run(block.accountId, block.userLink);
  }

  insertManyBlocks(blocks: StoredBlock[]): number {
    const insert = this.db.transaction((items: StoredBlock[]) => {
      for (const b of items) this.insertBlock(b);
      return items.length;
    });
    return insert(blocks);
  }

  getBlockCount(): number {
    return (this.db.prepare("SELECT COUNT(*) as count FROM blocks").get() as { count: number }).count;
  }

  getBlocks(limit = 50, offset = 0): StoredBlock[] {
    return this.db.prepare(
      "SELECT account_id, user_link FROM blocks LIMIT ? OFFSET ?"
    ).all(limit, offset).map((row: any) => ({
      accountId: row.account_id,
      userLink: row.user_link,
    }));
  }

  // --- Mutes ---

  insertMute(mute: StoredMute): void {
    this.db.prepare(
      "INSERT OR IGNORE INTO mutes (account_id, user_link) VALUES (?, ?)"
    ).run(mute.accountId, mute.userLink);
  }

  insertManyMutes(mutes: StoredMute[]): number {
    const insert = this.db.transaction((items: StoredMute[]) => {
      for (const m of items) this.insertMute(m);
      return items.length;
    });
    return insert(mutes);
  }

  getMuteCount(): number {
    return (this.db.prepare("SELECT COUNT(*) as count FROM mutes").get() as { count: number }).count;
  }

  getMutes(limit = 50, offset = 0): StoredMute[] {
    return this.db.prepare(
      "SELECT account_id, user_link FROM mutes LIMIT ? OFFSET ?"
    ).all(limit, offset).map((row: any) => ({
      accountId: row.account_id,
      userLink: row.user_link,
    }));
  }

  // --- Account ---

  insertAccount(account: StoredAccount): void {
    this.db.prepare(
      "INSERT OR REPLACE INTO account (id, email, username, display_name, created_at, created_via) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(account.id, account.email, account.username, account.displayName, account.createdAt, account.createdVia);
  }

  getAccount(): StoredAccount | null {
    const row = this.db.prepare("SELECT * FROM account LIMIT 1").get() as any;
    if (!row) return null;
    return {
      id: row.id,
      email: row.email,
      username: row.username,
      displayName: row.display_name,
      createdAt: row.created_at,
      createdVia: row.created_via,
    };
  }

  // --- Profile ---

  insertProfile(profile: StoredProfile): void {
    this.db.prepare(
      "INSERT OR REPLACE INTO profile (id, bio, website, location, avatar_url) VALUES (1, ?, ?, ?, ?)"
    ).run(profile.bio, profile.website, profile.location, profile.avatarUrl);
  }

  getProfile(): StoredProfile | null {
    const row = this.db.prepare("SELECT * FROM profile WHERE id = 1").get() as any;
    if (!row) return null;
    return {
      bio: row.bio,
      website: row.website,
      location: row.location,
      avatarUrl: row.avatar_url,
    };
  }

  // --- Direct Messages ---

  insertManyDirectMessages(conversations: ArchiveDirectMessage[]): { conversations: number; messages: number } {
    let convCount = 0;
    let msgCount = 0;
    const insertConv = this.db.prepare(
      "INSERT OR IGNORE INTO dm_conversations (conversation_id, message_count) VALUES (?, ?)"
    );
    const insertMsg = this.db.prepare(
      "INSERT OR IGNORE INTO direct_messages (id, conversation_id, sender_id, recipient_id, text, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    );
    const txn = this.db.transaction((items: ArchiveDirectMessage[]) => {
      for (const item of items) {
        const conv = item.dmConversation;
        insertConv.run(conv.conversationId, conv.messages.length);
        convCount++;
        for (const msg of conv.messages) {
          const m = msg.messageCreate;
          insertMsg.run(m.id, conv.conversationId, m.senderId, m.recipientId, m.text, m.createdAt);
          msgCount++;
        }
      }
    });
    txn(conversations);
    return { conversations: convCount, messages: msgCount };
  }

  getDmConversationCount(): number {
    return (this.db.prepare("SELECT COUNT(*) as count FROM dm_conversations").get() as { count: number }).count;
  }

  getDirectMessageCount(): number {
    return (this.db.prepare("SELECT COUNT(*) as count FROM direct_messages").get() as { count: number }).count;
  }

  getDmConversations(limit = 50, offset = 0): StoredDmConversation[] {
    return this.db.prepare(
      "SELECT conversation_id, message_count FROM dm_conversations LIMIT ? OFFSET ?"
    ).all(limit, offset).map((row: any) => ({
      conversationId: row.conversation_id,
      messageCount: row.message_count,
    }));
  }

  getDirectMessages(conversationId: string, limit = 100, offset = 0): StoredDirectMessage[] {
    return this.db.prepare(
      "SELECT id, conversation_id, sender_id, recipient_id, text, created_at FROM direct_messages WHERE conversation_id = ? ORDER BY created_at LIMIT ? OFFSET ?"
    ).all(conversationId, limit, offset).map((row: any) => ({
      id: row.id,
      conversationId: row.conversation_id,
      senderId: row.sender_id,
      recipientId: row.recipient_id,
      text: row.text,
      createdAt: row.created_at,
    }));
  }

  // --- Note Tweets ---

  insertManyNoteTweets(notes: StoredNoteTweet[]): number {
    const stmt = this.db.prepare(
      "INSERT OR IGNORE INTO note_tweets (note_tweet_id, text, created_at, updated_at, lifecycle) VALUES (?, ?, ?, ?, ?)"
    );
    const txn = this.db.transaction((items: StoredNoteTweet[]) => {
      for (const n of items) stmt.run(n.noteTweetId, n.text, n.createdAt, n.updatedAt, n.lifecycle);
      return items.length;
    });
    return txn(notes);
  }

  getNoteTweetCount(): number {
    return (this.db.prepare("SELECT COUNT(*) as count FROM note_tweets").get() as { count: number }).count;
  }

  getNoteTweets(limit = 50, offset = 0): StoredNoteTweet[] {
    return this.db.prepare(
      "SELECT note_tweet_id, text, created_at, updated_at, lifecycle FROM note_tweets ORDER BY created_at DESC LIMIT ? OFFSET ?"
    ).all(limit, offset).map((row: any) => ({
      noteTweetId: row.note_tweet_id,
      text: row.text,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lifecycle: row.lifecycle,
    }));
  }

  // --- Grok Chats ---

  insertManyGrokChats(chats: StoredGrokChat[]): number {
    const stmt = this.db.prepare(
      "INSERT OR IGNORE INTO grok_chats (chat_id, account_id, sender, message, created_at, grok_mode) VALUES (?, ?, ?, ?, ?, ?)"
    );
    const txn = this.db.transaction((items: StoredGrokChat[]) => {
      for (const c of items) stmt.run(c.chatId, c.accountId, c.sender, c.message, c.createdAt, c.grokMode);
      return items.length;
    });
    return txn(chats);
  }

  getGrokChatCount(): number {
    return (this.db.prepare("SELECT COUNT(*) as count FROM grok_chats").get() as { count: number }).count;
  }

  getGrokChats(limit = 50, offset = 0): StoredGrokChat[] {
    return this.db.prepare(
      "SELECT chat_id, account_id, sender, message, created_at, grok_mode FROM grok_chats ORDER BY created_at DESC LIMIT ? OFFSET ?"
    ).all(limit, offset).map((row: any) => ({
      chatId: row.chat_id,
      accountId: row.account_id,
      sender: row.sender,
      message: row.message,
      createdAt: row.created_at,
      grokMode: row.grok_mode,
    }));
  }

  // --- IP Audit ---

  insertManyIpAudit(entries: StoredIpAudit[]): number {
    const stmt = this.db.prepare(
      "INSERT OR IGNORE INTO ip_audit (account_id, login_ip, login_port, created_at) VALUES (?, ?, ?, ?)"
    );
    const txn = this.db.transaction((items: StoredIpAudit[]) => {
      for (const e of items) stmt.run(e.accountId, e.loginIp, e.loginPort, e.createdAt);
      return items.length;
    });
    return txn(entries);
  }

  getIpAuditCount(): number {
    return (this.db.prepare("SELECT COUNT(*) as count FROM ip_audit").get() as { count: number }).count;
  }

  getIpAudit(limit = 50, offset = 0): StoredIpAudit[] {
    return this.db.prepare(
      "SELECT account_id, login_ip, login_port, created_at FROM ip_audit ORDER BY created_at DESC LIMIT ? OFFSET ?"
    ).all(limit, offset).map((row: any) => ({
      accountId: row.account_id,
      loginIp: row.login_ip,
      loginPort: row.login_port,
      createdAt: row.created_at,
    }));
  }

  // --- Interests ---

  insertManyInterests(interests: StoredInterest[]): number {
    const stmt = this.db.prepare(
      "INSERT OR IGNORE INTO interests (name, is_disabled) VALUES (?, ?)"
    );
    const txn = this.db.transaction((items: StoredInterest[]) => {
      for (const i of items) stmt.run(i.name, i.isDisabled ? 1 : 0);
      return items.length;
    });
    return txn(interests);
  }

  getInterestCount(): number {
    return (this.db.prepare("SELECT COUNT(*) as count FROM interests").get() as { count: number }).count;
  }

  getInterests(limit = 50, offset = 0): StoredInterest[] {
    return this.db.prepare(
      "SELECT name, is_disabled FROM interests LIMIT ? OFFSET ?"
    ).all(limit, offset).map((row: any) => ({
      name: row.name,
      isDisabled: row.is_disabled === 1,
    }));
  }

  // --- Demographics ---

  insertManyDemographics(demographics: StoredDemographic[]): number {
    const stmt = this.db.prepare(
      "INSERT OR IGNORE INTO demographics (type, value) VALUES (?, ?)"
    );
    const txn = this.db.transaction((items: StoredDemographic[]) => {
      for (const d of items) stmt.run(d.type, d.value);
      return items.length;
    });
    return txn(demographics);
  }

  getDemographicCount(): number {
    return (this.db.prepare("SELECT COUNT(*) as count FROM demographics").get() as { count: number }).count;
  }

  getDemographics(): StoredDemographic[] {
    return this.db.prepare(
      "SELECT type, value FROM demographics"
    ).all().map((row: any) => ({
      type: row.type,
      value: row.value,
    }));
  }

  // --- Contacts ---

  insertManyContacts(contacts: StoredContact[]): number {
    const stmt = this.db.prepare(
      "INSERT OR IGNORE INTO contacts (type, value) VALUES (?, ?)"
    );
    const txn = this.db.transaction((items: StoredContact[]) => {
      for (const c of items) stmt.run(c.type, c.value);
      return items.length;
    });
    return txn(contacts);
  }

  getContactCount(): number {
    return (this.db.prepare("SELECT COUNT(*) as count FROM contacts").get() as { count: number }).count;
  }

  getContacts(limit = 50, offset = 0): StoredContact[] {
    return this.db.prepare(
      "SELECT type, value FROM contacts LIMIT ? OFFSET ?"
    ).all(limit, offset).map((row: any) => ({
      type: row.type as "email" | "phone",
      value: row.value,
    }));
  }

  // --- Ad Engagements ---

  insertManyAdEngagements(engagements: ArchiveAdEngagement[]): number {
    const insertEng = this.db.prepare(
      "INSERT INTO ad_engagements (tweet_id, tweet_text, advertiser_name, advertiser_screen_name, display_location, os_type, device_type) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    const insertTarget = this.db.prepare(
      "INSERT INTO ad_targeting (event_id, event_type, targeting_type, targeting_value) VALUES (?, ?, ?, ?)"
    );
    let count = 0;
    const txn = this.db.transaction((items: ArchiveAdEngagement[]) => {
      for (const item of items) {
        for (const eng of item.ad.adsUserData.adEngagements.engagements) {
          const attr = eng.impressionAttributes;
          const result = insertEng.run(
            attr.promotedTweetInfo?.tweetId ?? "",
            attr.promotedTweetInfo?.tweetText ?? "",
            attr.advertiserInfo?.advertiserName ?? "",
            attr.advertiserInfo?.screenName ?? "",
            attr.displayLocation ?? "",
            attr.deviceInfo?.osType ?? "",
            attr.deviceInfo?.deviceType ?? "",
          );
          const eventId = Number(result.lastInsertRowid);
          for (const tc of attr.matchedTargetingCriteria ?? []) {
            insertTarget.run(eventId, "engagement", tc.targetingType, tc.targetingValue ?? "");
          }
          count++;
        }
      }
    });
    txn(engagements);
    return count;
  }

  getAdEngagementCount(): number {
    return (this.db.prepare("SELECT COUNT(*) as count FROM ad_engagements").get() as { count: number }).count;
  }

  getAdEngagements(limit = 50, offset = 0): StoredAdEngagement[] {
    return this.db.prepare(
      "SELECT id, tweet_id, tweet_text, advertiser_name, advertiser_screen_name, display_location, os_type, device_type FROM ad_engagements LIMIT ? OFFSET ?"
    ).all(limit, offset).map((row: any) => ({
      id: row.id,
      tweetId: row.tweet_id,
      tweetText: row.tweet_text,
      advertiserName: row.advertiser_name,
      advertiserScreenName: row.advertiser_screen_name,
      displayLocation: row.display_location,
      osType: row.os_type,
      deviceType: row.device_type,
    }));
  }

  // --- Ad Impressions ---

  insertManyAdImpressions(impressions: ArchiveAdImpression[]): number {
    const insertImp = this.db.prepare(
      "INSERT INTO ad_impressions (tweet_id, tweet_text, advertiser_name, advertiser_screen_name, display_location, os_type, device_type) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    const insertTarget = this.db.prepare(
      "INSERT INTO ad_targeting (event_id, event_type, targeting_type, targeting_value) VALUES (?, ?, ?, ?)"
    );
    let count = 0;
    const txn = this.db.transaction((items: ArchiveAdImpression[]) => {
      for (const item of items) {
        for (const attr of item.ad.adsUserData.adImpressions.impressions) {
          const result = insertImp.run(
            attr.promotedTweetInfo?.tweetId ?? "",
            attr.promotedTweetInfo?.tweetText ?? "",
            attr.advertiserInfo?.advertiserName ?? "",
            attr.advertiserInfo?.screenName ?? "",
            attr.displayLocation ?? "",
            attr.deviceInfo?.osType ?? "",
            attr.deviceInfo?.deviceType ?? "",
          );
          const eventId = Number(result.lastInsertRowid);
          for (const tc of attr.matchedTargetingCriteria ?? []) {
            insertTarget.run(eventId, "impression", tc.targetingType, tc.targetingValue ?? "");
          }
          count++;
        }
      }
    });
    txn(impressions);
    return count;
  }

  getAdImpressionCount(): number {
    return (this.db.prepare("SELECT COUNT(*) as count FROM ad_impressions").get() as { count: number }).count;
  }

  getAdImpressions(limit = 50, offset = 0): StoredAdImpression[] {
    return this.db.prepare(
      "SELECT id, tweet_id, tweet_text, advertiser_name, advertiser_screen_name, display_location, os_type, device_type FROM ad_impressions LIMIT ? OFFSET ?"
    ).all(limit, offset).map((row: any) => ({
      id: row.id,
      tweetId: row.tweet_id,
      tweetText: row.tweet_text,
      advertiserName: row.advertiser_name,
      advertiserScreenName: row.advertiser_screen_name,
      displayLocation: row.display_location,
      osType: row.os_type,
      deviceType: row.device_type,
    }));
  }

  getAdTargeting(eventId: number, eventType: "engagement" | "impression"): StoredAdTargeting[] {
    return this.db.prepare(
      "SELECT id, event_id, event_type, targeting_type, targeting_value FROM ad_targeting WHERE event_id = ? AND event_type = ?"
    ).all(eventId, eventType).map((row: any) => ({
      eventId: row.event_id,
      eventType: row.event_type,
      targetingType: row.targeting_type,
      targetingValue: row.targeting_value,
    }));
  }

  // --- Connected Apps ---

  insertManyConnectedApps(apps: StoredConnectedApp[]): number {
    const stmt = this.db.prepare(
      "INSERT OR IGNORE INTO connected_apps (id, name, description, permissions, approved_at, org_name, org_url) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    const txn = this.db.transaction((items: StoredConnectedApp[]) => {
      for (const a of items) stmt.run(a.id, a.name, a.description, a.permissions, a.approvedAt, a.orgName, a.orgUrl);
      return items.length;
    });
    return txn(apps);
  }

  getConnectedAppCount(): number {
    return (this.db.prepare("SELECT COUNT(*) as count FROM connected_apps").get() as { count: number }).count;
  }

  getConnectedApps(limit = 50, offset = 0): StoredConnectedApp[] {
    return this.db.prepare(
      "SELECT id, name, description, permissions, approved_at, org_name, org_url FROM connected_apps LIMIT ? OFFSET ?"
    ).all(limit, offset).map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      permissions: row.permissions,
      approvedAt: row.approved_at,
      orgName: row.org_name,
      orgUrl: row.org_url,
    }));
  }

  // --- Device Tokens ---

  insertManyDeviceTokens(tokens: StoredDeviceToken[]): number {
    const stmt = this.db.prepare(
      "INSERT OR IGNORE INTO device_tokens (client_application_id, token, client_application_name, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?)"
    );
    const txn = this.db.transaction((items: StoredDeviceToken[]) => {
      for (const t of items) stmt.run(t.clientApplicationId, t.token, t.clientApplicationName, t.createdAt, t.lastSeenAt);
      return items.length;
    });
    return txn(tokens);
  }

  getDeviceTokenCount(): number {
    return (this.db.prepare("SELECT COUNT(*) as count FROM device_tokens").get() as { count: number }).count;
  }

  getDeviceTokens(limit = 50, offset = 0): StoredDeviceToken[] {
    return this.db.prepare(
      "SELECT client_application_id, client_application_name, token, created_at, last_seen_at FROM device_tokens LIMIT ? OFFSET ?"
    ).all(limit, offset).map((row: any) => ({
      clientApplicationId: row.client_application_id,
      clientApplicationName: row.client_application_name,
      token: row.token,
      createdAt: row.created_at,
      lastSeenAt: row.last_seen_at,
    }));
  }

  // --- Apps ---

  insertManyApps(apps: StoredApp[]): number {
    const stmt = this.db.prepare(
      "INSERT OR IGNORE INTO apps (app_id, app_names) VALUES (?, ?)"
    );
    const txn = this.db.transaction((items: StoredApp[]) => {
      for (const a of items) stmt.run(a.appId, a.appNames);
      return items.length;
    });
    return txn(apps);
  }

  getAppCount(): number {
    return (this.db.prepare("SELECT COUNT(*) as count FROM apps").get() as { count: number }).count;
  }

  getApps(limit = 50, offset = 0): StoredApp[] {
    return this.db.prepare(
      "SELECT app_id, app_names FROM apps LIMIT ? OFFSET ?"
    ).all(limit, offset).map((row: any) => ({
      appId: row.app_id,
      appNames: row.app_names,
    }));
  }

  // --- Deleted Tweets (insert into existing tweets table with deleted=1) ---

  insertDeletedTweet(tweet: {
    id: string;
    fullText: string;
    createdAt: string;
    favoriteCount: number;
    retweetCount: number;
    isReply: boolean;
    isRetweet: boolean;
  }): void {
    const ts = Math.floor(parseTweetDate(tweet.createdAt).getTime() / 1000);
    this.db.prepare(`
      INSERT OR IGNORE INTO tweets (id, full_text, created_at, created_at_ts, favorite_count, retweet_count, is_reply, is_retweet, deleted)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
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

  insertManyDeletedTweets(tweets: Parameters<ArchiveStore["insertDeletedTweet"]>[0][]): number {
    const txn = this.db.transaction((items: typeof tweets) => {
      for (const t of items) this.insertDeletedTweet(t);
      return items.length;
    });
    return txn(tweets);
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
      likes: this.getLikeCount(),
      followers: this.getFollowerCount(),
      following: this.getFollowingCount(),
      blocks: this.getBlockCount(),
      mutes: this.getMuteCount(),
      dmConversations: this.getDmConversationCount(),
      directMessages: this.getDirectMessageCount(),
      noteTweets: this.getNoteTweetCount(),
      grokChats: this.getGrokChatCount(),
      ipAudit: this.getIpAuditCount(),
      interests: this.getInterestCount(),
      demographics: this.getDemographicCount(),
      contacts: this.getContactCount(),
      adEngagements: this.getAdEngagementCount(),
      adImpressions: this.getAdImpressionCount(),
      connectedApps: this.getConnectedAppCount(),
      deviceTokens: this.getDeviceTokenCount(),
      apps: this.getAppCount(),
    };
  }

  // --- Analytics: Activity ---

  getYearlyCounts(): { year: string; count: number }[] {
    return this.db.prepare(`
      SELECT strftime('%Y', created_at_ts, 'unixepoch') AS year, COUNT(*) AS count
      FROM tweets GROUP BY year ORDER BY year
    `).all() as { year: string; count: number }[];
  }

  getHourlyDistribution(): { hour: number; count: number }[] {
    return this.db.prepare(`
      SELECT CAST(strftime('%H', created_at_ts, 'unixepoch') AS INTEGER) AS hour,
             COUNT(*) AS count FROM tweets GROUP BY hour ORDER BY hour
    `).all() as { hour: number; count: number }[];
  }

  getDayOfWeekDistribution(): { day: number; count: number }[] {
    return this.db.prepare(`
      SELECT CAST(strftime('%w', created_at_ts, 'unixepoch') AS INTEGER) AS day,
             COUNT(*) AS count FROM tweets GROUP BY day ORDER BY day
    `).all() as { day: number; count: number }[];
  }

  getMonthlyCountsForYear(year: string): { month: number; count: number }[] {
    return this.db.prepare(`
      SELECT CAST(strftime('%m', created_at_ts, 'unixepoch') AS INTEGER) AS month,
             COUNT(*) AS count FROM tweets
      WHERE strftime('%Y', created_at_ts, 'unixepoch') = ? GROUP BY month ORDER BY month
    `).all(year) as { month: number; count: number }[];
  }

  // --- Analytics: Engagement ---

  getTopTweetsByLikes(limit = 10): StoredTweet[] {
    const rows = this.db.prepare(
      "SELECT * FROM tweets WHERE deleted = 0 ORDER BY favorite_count DESC LIMIT ?"
    ).all(limit) as any[];
    return rows.map(this.rowToTweet);
  }

  getTopTweetsByRetweets(limit = 10): StoredTweet[] {
    const rows = this.db.prepare(
      "SELECT * FROM tweets WHERE deleted = 0 ORDER BY retweet_count DESC LIMIT ?"
    ).all(limit) as any[];
    return rows.map(this.rowToTweet);
  }

  getEngagementDistribution(): { bucket: string; count: number }[] {
    return this.db.prepare(`
      SELECT CASE
        WHEN favorite_count = 0 AND retweet_count = 0 THEN '0'
        WHEN (favorite_count + retweet_count) BETWEEN 1 AND 5 THEN '1-5'
        WHEN (favorite_count + retweet_count) BETWEEN 6 AND 20 THEN '6-20'
        WHEN (favorite_count + retweet_count) BETWEEN 21 AND 100 THEN '21-100'
        ELSE '100+'
      END AS bucket, COUNT(*) AS count FROM tweets WHERE deleted = 0
      GROUP BY bucket ORDER BY MIN(favorite_count + retweet_count)
    `).all() as { bucket: string; count: number }[];
  }

  getAvgEngagementByType(): { type: string; avgLikes: number; avgRetweets: number; count: number }[] {
    return this.db.prepare(`
      SELECT CASE WHEN is_retweet=1 THEN 'Retweet' WHEN is_reply=1 THEN 'Reply' ELSE 'Original' END AS type,
        ROUND(AVG(favorite_count),1) AS avgLikes, ROUND(AVG(retweet_count),1) AS avgRetweets,
        COUNT(*) AS count FROM tweets WHERE deleted=0 GROUP BY type ORDER BY count DESC
    `).all() as { type: string; avgLikes: number; avgRetweets: number; count: number }[];
  }

  // --- Analytics: Ads ---

  getTopAdvertisers(limit = 10): { advertiserName: string; engagements: number; impressions: number }[] {
    return this.db.prepare(`
      SELECT advertiser_name AS advertiserName, SUM(eng) AS engagements, SUM(imp) AS impressions FROM (
        SELECT advertiser_name, COUNT(*) AS eng, 0 AS imp FROM ad_engagements WHERE advertiser_name!='' GROUP BY advertiser_name
        UNION ALL
        SELECT advertiser_name, 0, COUNT(*) FROM ad_impressions WHERE advertiser_name!='' GROUP BY advertiser_name
      ) GROUP BY advertiserName ORDER BY (engagements+impressions) DESC LIMIT ?
    `).all(limit) as { advertiserName: string; engagements: number; impressions: number }[];
  }

  getTopTargetingTypes(limit = 10): { targetingType: string; count: number }[] {
    return this.db.prepare(`
      SELECT targeting_type AS targetingType, COUNT(*) AS count FROM ad_targeting
      WHERE targeting_type!='' GROUP BY targetingType ORDER BY count DESC LIMIT ?
    `).all(limit) as { targetingType: string; count: number }[];
  }

  getAdDeviceBreakdown(): { osType: string; count: number }[] {
    return this.db.prepare(`
      SELECT os_type AS osType, COUNT(*) AS count FROM (
        SELECT os_type FROM ad_engagements WHERE os_type!=''
        UNION ALL SELECT os_type FROM ad_impressions WHERE os_type!=''
      ) GROUP BY osType ORDER BY count DESC
    `).all() as { osType: string; count: number }[];
  }

  // --- Analytics: Privacy ---

  getIpAuditSummary(): { uniqueIps: number; totalLogins: number; topIps: { ip: string; count: number }[] } {
    const uniqueIps = (this.db.prepare(
      "SELECT COUNT(DISTINCT login_ip) AS count FROM ip_audit"
    ).get() as { count: number }).count;
    const totalLogins = this.getIpAuditCount();
    const topIps = this.db.prepare(
      "SELECT login_ip AS ip, COUNT(*) AS count FROM ip_audit GROUP BY login_ip ORDER BY count DESC LIMIT 10"
    ).all() as { ip: string; count: number }[];
    return { uniqueIps, totalLogins, topIps };
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

  // --- Vector / Semantic Search ---

  private vectorStores = new Map<string, VectorStore>();

  getVectorStore(type: EmbeddableType = "tweets"): VectorStore {
    let vs = this.vectorStores.get(type);
    if (!vs) {
      vs = new VectorStore(this.db, VECTOR_CONFIGS[type]);
      vs.init();
      this.vectorStores.set(type, vs);
    }
    return vs;
  }

  private async embedQuery(query: string): Promise<Float32Array> {
    const { getEmbeddingEngine } = await import("./embeddings.js");
    const engine = getEmbeddingEngine();
    return engine.embed(query);
  }

  async semanticSearch(query: string, limit = 50): Promise<StoredTweet[]> {
    const embedding = await this.embedQuery(query);
    const vs = this.getVectorStore("tweets");
    const results = vs.search(embedding, limit);
    if (results.length === 0) return [];
    return this.getTweetsByIds(results.map((r) => r.id));
  }

  async semanticSearchLikes(query: string, limit = 50): Promise<StoredLike[]> {
    const embedding = await this.embedQuery(query);
    const vs = this.getVectorStore("likes");
    const results = vs.search(embedding, limit);
    if (results.length === 0) return [];
    return this.getLikesByIds(results.map((r) => r.id));
  }

  async semanticSearchDms(query: string, limit = 50): Promise<StoredDirectMessage[]> {
    const embedding = await this.embedQuery(query);
    const vs = this.getVectorStore("dms");
    const results = vs.search(embedding, limit);
    if (results.length === 0) return [];
    return this.getDmsByIds(results.map((r) => r.id));
  }

  async semanticSearchGrokChats(query: string, limit = 50): Promise<StoredGrokChat[]> {
    const embedding = await this.embedQuery(query);
    const vs = this.getVectorStore("grokChats");
    const results = vs.search(embedding, limit);
    if (results.length === 0) return [];
    return this.getGrokChatsByIds(results.map((r) => r.id));
  }

  async semanticSearchNoteTweets(query: string, limit = 50): Promise<StoredNoteTweet[]> {
    const embedding = await this.embedQuery(query);
    const vs = this.getVectorStore("noteTweets");
    const results = vs.search(embedding, limit);
    if (results.length === 0) return [];
    return this.getNoteTweetsByIds(results.map((r) => r.id));
  }

  getTweetsByIds(ids: string[]): StoredTweet[] {
    if (ids.length === 0) return [];
    const placeholders = ids.map(() => "?").join(",");
    const rows = this.db
      .prepare(
        `SELECT * FROM tweets WHERE id IN (${placeholders})`
      )
      .all(...ids) as any[];

    // Preserve the order of input ids (similarity ranking)
    const map = new Map(rows.map((r) => [r.id as string, r]));
    return ids.map((id) => map.get(id)).filter(Boolean).map(this.rowToTweet);
  }

  getLikesByIds(ids: string[]): StoredLike[] {
    if (ids.length === 0) return [];
    const placeholders = ids.map(() => "?").join(",");
    const rows = this.db
      .prepare(`SELECT tweet_id, full_text, expanded_url FROM likes WHERE tweet_id IN (${placeholders})`)
      .all(...ids) as any[];
    const map = new Map(rows.map((r: any) => [r.tweet_id as string, r]));
    return ids.map((id) => map.get(id)).filter(Boolean).map((r: any) => ({
      tweetId: r.tweet_id,
      fullText: r.full_text,
      expandedUrl: r.expanded_url,
    }));
  }

  getDmsByIds(ids: string[]): StoredDirectMessage[] {
    if (ids.length === 0) return [];
    const placeholders = ids.map(() => "?").join(",");
    const rows = this.db
      .prepare(`SELECT id, conversation_id, sender_id, recipient_id, text, created_at FROM direct_messages WHERE id IN (${placeholders})`)
      .all(...ids) as any[];
    const map = new Map(rows.map((r: any) => [r.id as string, r]));
    return ids.map((id) => map.get(id)).filter(Boolean).map((r: any) => ({
      id: r.id,
      conversationId: r.conversation_id,
      senderId: r.sender_id,
      recipientId: r.recipient_id,
      text: r.text,
      createdAt: r.created_at,
    }));
  }

  getGrokChatsByIds(compositeIds: string[]): StoredGrokChat[] {
    if (compositeIds.length === 0) return [];
    // Parse "chatId::createdAt" composite IDs
    const conditions = compositeIds.map(() => "(chat_id = ? AND created_at = ?)").join(" OR ");
    const params = compositeIds.flatMap((id) => {
      const sep = id.indexOf("::");
      return [id.substring(0, sep), id.substring(sep + 2)];
    });
    const rows = this.db
      .prepare(`SELECT chat_id, account_id, sender, message, created_at, grok_mode FROM grok_chats WHERE ${conditions}`)
      .all(...params) as any[];
    // Build composite key map for ordering
    const map = new Map(rows.map((r: any) => [`${r.chat_id}::${r.created_at}`, r]));
    return compositeIds.map((id) => map.get(id)).filter(Boolean).map((r: any) => ({
      chatId: r.chat_id,
      accountId: r.account_id,
      sender: r.sender,
      message: r.message,
      createdAt: r.created_at,
      grokMode: r.grok_mode,
    }));
  }

  getNoteTweetsByIds(ids: string[]): StoredNoteTweet[] {
    if (ids.length === 0) return [];
    const placeholders = ids.map(() => "?").join(",");
    const rows = this.db
      .prepare(`SELECT note_tweet_id, text, created_at, updated_at, lifecycle FROM note_tweets WHERE note_tweet_id IN (${placeholders})`)
      .all(...ids) as any[];
    const map = new Map(rows.map((r: any) => [r.note_tweet_id as string, r]));
    return ids.map((id) => map.get(id)).filter(Boolean).map((r: any) => ({
      noteTweetId: r.note_tweet_id,
      text: r.text,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      lifecycle: r.lifecycle,
    }));
  }

  getEmbeddingStats(): Record<EmbeddableType, { total: number; embedded: number }> {
    const types: EmbeddableType[] = ["tweets", "likes", "dms", "grokChats", "noteTweets"];
    const counts: Record<string, number> = {
      tweets: this.getTweetCount(),
      likes: this.getLikeCount(),
      dms: this.getDirectMessageCount(),
      grokChats: this.getGrokChatCount(),
      noteTweets: this.getNoteTweetCount(),
    };
    const result = {} as Record<EmbeddableType, { total: number; embedded: number }>;
    for (const type of types) {
      try {
        const vs = this.getVectorStore(type);
        result[type] = { total: counts[type]!, embedded: vs.count() };
      } catch {
        result[type] = { total: counts[type]!, embedded: 0 };
      }
    }
    return result;
  }

  getTweetsForEmbedding(ids: string[]): Array<{ id: string; text: string }> {
    if (ids.length === 0) return [];
    const placeholders = ids.map(() => "?").join(",");
    return this.db
      .prepare(`SELECT id, full_text as text FROM tweets WHERE id IN (${placeholders})`)
      .all(...ids) as Array<{ id: string; text: string }>;
  }

  close(): void {
    this.db.close();
  }
}
