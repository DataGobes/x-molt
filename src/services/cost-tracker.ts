import Database from "better-sqlite3";
import { API_COSTS } from "../utils/constants.js";
import crypto from "crypto";

export interface UsageRecord {
  endpoint: string;
  cost: number;
  timestamp: number;
  sessionId: string;
}

export interface SpendByEndpoint {
  endpoint: string;
  totalCost: number;
  count: number;
}

export interface DailySpend {
  date: string;
  totalCost: number;
  count: number;
}

export class CostTracker {
  private db: Database.Database;
  private sessionId: string;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    const randomSuffix = parseInt(crypto.randomBytes(4).toString("hex"), 16)
      .toString(36)
      .slice(0, 6);
    this.sessionId = `s_${Date.now()}_${randomSuffix}`;
    this.init();
  }

  private init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS api_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        endpoint TEXT NOT NULL,
        cost REAL NOT NULL,
        timestamp INTEGER NOT NULL,
        session_id TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_api_usage_timestamp ON api_usage(timestamp);
      CREATE INDEX IF NOT EXISTS idx_api_usage_session ON api_usage(session_id);
      CREATE INDEX IF NOT EXISTS idx_api_usage_endpoint ON api_usage(endpoint);
    `);
  }

  record(endpoint: string, resourceCount = 1): void {
    const unitCost = API_COSTS[endpoint] ?? 0;
    const actualCost = unitCost * resourceCount;
    this.db.prepare(
      "INSERT INTO api_usage (endpoint, cost, timestamp, session_id) VALUES (?, ?, ?, ?)"
    ).run(endpoint, actualCost, Date.now(), this.sessionId);
  }

  estimateCost(endpoint: string, count = 1): number {
    return (API_COSTS[endpoint] ?? 0) * count;
  }

  getSessionSpend(): number {
    const row = this.db.prepare(
      "SELECT COALESCE(SUM(cost), 0) as total FROM api_usage WHERE session_id = ?"
    ).get(this.sessionId) as { total: number };
    return row.total;
  }

  getDailySpend(): number {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const row = this.db.prepare(
      "SELECT COALESCE(SUM(cost), 0) as total FROM api_usage WHERE timestamp >= ?"
    ).get(startOfDay.getTime()) as { total: number };
    return row.total;
  }

  getMonthlySpend(): number {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const row = this.db.prepare(
      "SELECT COALESCE(SUM(cost), 0) as total FROM api_usage WHERE timestamp >= ?"
    ).get(startOfMonth.getTime()) as { total: number };
    return row.total;
  }

  getSpendByEndpoint(since?: number): SpendByEndpoint[] {
    const query = since
      ? "SELECT endpoint, SUM(cost) as totalCost, COUNT(*) as count FROM api_usage WHERE timestamp >= ? GROUP BY endpoint ORDER BY totalCost DESC"
      : "SELECT endpoint, SUM(cost) as totalCost, COUNT(*) as count FROM api_usage GROUP BY endpoint ORDER BY totalCost DESC";
    const params = since ? [since] : [];
    return this.db.prepare(query).all(...params) as SpendByEndpoint[];
  }

  getSessionCallCount(): number {
    const row = this.db.prepare(
      "SELECT COUNT(*) as count FROM api_usage WHERE session_id = ?"
    ).get(this.sessionId) as { count: number };
    return row.count;
  }

  getDailySpendHistory(days = 30): DailySpend[] {
    const since = Date.now() - days * 24 * 60 * 60 * 1000;
    return this.db.prepare(`
      SELECT
        DATE(timestamp / 1000, 'unixepoch', 'localtime') as date,
        SUM(cost) as totalCost,
        COUNT(*) as count
      FROM api_usage
      WHERE timestamp >= ?
      GROUP BY date
      ORDER BY date ASC
    `).all(since) as DailySpend[];
  }

  getTotalSpend(): number {
    const row = this.db.prepare(
      "SELECT COALESCE(SUM(cost), 0) as total FROM api_usage"
    ).get() as { total: number };
    return row.total;
  }

  getTotalCallCount(): number {
    const row = this.db.prepare(
      "SELECT COUNT(*) as count FROM api_usage"
    ).get() as { count: number };
    return row.count;
  }
}
