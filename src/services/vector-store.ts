import type Database from "better-sqlite3";
import * as sqliteVec from "sqlite-vec";
import type { EmbeddableType } from "../types.js";

export interface VectorStoreConfig {
  tableName: string;
  idColumn: string;
  sourceTable: string;
  sourceIdColumn: string;
  sourceIdExpression?: string; // for compound PKs: "chat_id || '::' || created_at"
  sourceTextColumn: string;
}

export const VECTOR_CONFIGS: Record<EmbeddableType, VectorStoreConfig> = {
  tweets: {
    tableName: "tweet_embeddings",
    idColumn: "tweet_id",
    sourceTable: "tweets",
    sourceIdColumn: "id",
    sourceTextColumn: "full_text",
  },
  likes: {
    tableName: "like_embeddings",
    idColumn: "like_id",
    sourceTable: "likes",
    sourceIdColumn: "tweet_id",
    sourceTextColumn: "full_text",
  },
  dms: {
    tableName: "dm_embeddings",
    idColumn: "dm_id",
    sourceTable: "direct_messages",
    sourceIdColumn: "id",
    sourceTextColumn: "text",
  },
  grokChats: {
    tableName: "grok_chat_embeddings",
    idColumn: "grok_chat_id",
    sourceTable: "grok_chats",
    sourceIdColumn: "chat_id",
    sourceIdExpression: "chat_id || '::' || created_at",
    sourceTextColumn: "message",
  },
  noteTweets: {
    tableName: "note_tweet_embeddings",
    idColumn: "note_tweet_id",
    sourceTable: "note_tweets",
    sourceIdColumn: "note_tweet_id",
    sourceTextColumn: "text",
  },
};

// Track which DB connections have already loaded sqlite-vec
const loadedDbs = new WeakSet<Database.Database>();

function ensureVecLoaded(db: Database.Database): void {
  if (!loadedDbs.has(db)) {
    sqliteVec.load(db);
    loadedDbs.add(db);
  }
}

export class VectorStore {
  private db: Database.Database;
  private config: VectorStoreConfig;
  private initialized = false;

  constructor(db: Database.Database, config: VectorStoreConfig) {
    this.db = db;
    this.config = config;
  }

  init(): void {
    if (this.initialized) return;
    ensureVecLoaded(this.db);

    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS ${this.config.tableName} USING vec0(
        ${this.config.idColumn} TEXT PRIMARY KEY,
        embedding float[384]
      );
    `);
    this.initialized = true;
  }

  upsert(id: string, embedding: Float32Array): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO ${this.config.tableName}(${this.config.idColumn}, embedding)
      VALUES (?, ?)
    `).run(id, Buffer.from(embedding.buffer));
  }

  upsertBatch(entries: Array<{ id: string; embedding: Float32Array }>): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO ${this.config.tableName}(${this.config.idColumn}, embedding)
      VALUES (?, ?)
    `);

    const tx = this.db.transaction((items: typeof entries) => {
      for (const item of items) {
        stmt.run(item.id, Buffer.from(item.embedding.buffer));
      }
    });

    tx(entries);
  }

  search(
    query: Float32Array,
    k: number
  ): Array<{ id: string; distance: number }> {
    const rows = this.db
      .prepare(
        `
      SELECT ${this.config.idColumn} as _id, distance
      FROM ${this.config.tableName}
      WHERE embedding MATCH ?
      ORDER BY distance
      LIMIT ?
    `
      )
      .all(Buffer.from(query.buffer), k) as Array<{
      _id: string;
      distance: number;
    }>;

    return rows.map((r) => ({ id: r._id, distance: r.distance }));
  }

  count(): number {
    const row = this.db
      .prepare(`SELECT COUNT(*) as cnt FROM ${this.config.tableName}`)
      .get() as { cnt: number };
    return row.cnt;
  }

  hasEmbedding(id: string): boolean {
    const row = this.db
      .prepare(`SELECT 1 FROM ${this.config.tableName} WHERE ${this.config.idColumn} = ?`)
      .get(id);
    return !!row;
  }

  getUnembeddedIds(limit = 1000): string[] {
    const idExpr = this.config.sourceIdExpression ?? `t.${this.config.sourceIdColumn}`;
    const rows = this.db
      .prepare(
        `
      SELECT ${idExpr} as _id FROM ${this.config.sourceTable} t
      LEFT JOIN ${this.config.tableName} e ON ${idExpr} = e.${this.config.idColumn}
      WHERE e.${this.config.idColumn} IS NULL
      LIMIT ?
    `
      )
      .all(limit) as Array<{ _id: string }>;
    return rows.map((r) => r._id);
  }

  getTextsForEmbedding(ids: string[]): Array<{ id: string; text: string }> {
    if (ids.length === 0) return [];

    // Grok chats use compound PK — need special handling
    if (this.config.sourceIdExpression) {
      const idExpr = this.config.sourceIdExpression;
      const placeholders = ids.map(() => "?").join(",");
      return this.db
        .prepare(
          `SELECT ${idExpr} as id, ${this.config.sourceTextColumn} as text
           FROM ${this.config.sourceTable}
           WHERE ${idExpr} IN (${placeholders})`
        )
        .all(...ids) as Array<{ id: string; text: string }>;
    }

    const placeholders = ids.map(() => "?").join(",");
    return this.db
      .prepare(
        `SELECT ${this.config.sourceIdColumn} as id, ${this.config.sourceTextColumn} as text
         FROM ${this.config.sourceTable}
         WHERE ${this.config.sourceIdColumn} IN (${placeholders})`
      )
      .all(...ids) as Array<{ id: string; text: string }>;
  }

  // Backward compat alias
  getUnembeddedTweetIds(limit = 1000): string[] {
    return this.getUnembeddedIds(limit);
  }
}
