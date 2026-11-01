// Storage. Uses Bun's built-in SQL client, which speaks both SQLite (local dev
// and tests) and Postgres (production) with the same queries. Each table keeps
// the columns we look things up by, plus a JSON `data` column for the rest.

import { SQL } from "bun";
import type { Account, BookerProfile, PressStop, RunRequest, SignupCode, Talent } from "../types";

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS accounts (id TEXT PRIMARY KEY, phone TEXT UNIQUE NOT NULL, member_no INTEGER NOT NULL, data TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS signup_codes (code TEXT PRIMARY KEY, data TEXT NOT NULL, claimed_by TEXT, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS booker_profiles (account_id TEXT PRIMARY KEY, data TEXT NOT NULL, updated_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS talent (id TEXT PRIMARY KEY, booker_id TEXT NOT NULL, data TEXT NOT NULL, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS stops (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, status TEXT NOT NULL, data TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, account_id TEXT NOT NULL, direction TEXT NOT NULL, kind TEXT NOT NULL, body TEXT, provider_id TEXT, data TEXT, created_at TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS messages_account ON messages (account_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS run_requests (id TEXT PRIMARY KEY, booker_id TEXT NOT NULL, status TEXT NOT NULL, data TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY, kind TEXT NOT NULL, payload TEXT NOT NULL, status TEXT NOT NULL, attempts INTEGER NOT NULL, run_after TEXT NOT NULL, error TEXT, created_at TEXT NOT NULL)`,
];

export interface Job {
  id: string;
  kind: string;
  payload: Record<string, unknown>;
  attempts: number;
}

export interface StoredMessage {
  id: string;
  accountId: string;
  direction: "in" | "out";
  kind: string;
  body: string | null;
  providerId: string | null;
  data: Record<string, unknown> | null;
  createdAt: string;
}

const now = () => new Date().toISOString();
const id = () => crypto.randomUUID();
let seq = 0;
/** Timestamp plus a counter, so rows saved in the same millisecond keep their order. */
const ordered = () => `${now()}#${String(seq++).padStart(10, "0")}`;

export class Store {
  constructor(private db: SQL) {}

  static async open(url = process.env.DATABASE_URL ?? "sqlite://pressrun.db"): Promise<Store> {
    const store = new Store(new SQL(url));
    for (const stmt of SCHEMA) await store.db.unsafe(stmt);
    return store;
  }

  // ---------- Accounts ----------

  async accountByPhone(phone: string): Promise<Account | null> {
    const rows = await this.db`SELECT data FROM accounts WHERE phone = ${phone}`;
    return rows[0] ? JSON.parse(rows[0].data) : null;
  }

  async accountById(accountId: string): Promise<Account | null> {
    const rows = await this.db`SELECT data FROM accounts WHERE id = ${accountId}`;
    return rows[0] ? JSON.parse(rows[0].data) : null;
  }

  async createAccount(phone: string, fields: Partial<Account> = {}): Promise<Account> {
    const [{ n }] = await this.db`SELECT COALESCE(MAX(member_no), 0) + 1 AS n FROM accounts`;
    const account: Account = {
      id: id(), phone, memberNo: Number(n), roles: [], optedOut: false, flow: null, step: null,
      state: { retries: {}, history: [] }, needsHuman: false, needsReview: [], createdAt: now(), ...fields,
    };
    await this.db`INSERT INTO accounts (id, phone, member_no, data, created_at, updated_at)
      VALUES (${account.id}, ${phone}, ${account.memberNo}, ${JSON.stringify(account)}, ${account.createdAt}, ${account.createdAt})`;
    return account;
  }

  async saveAccount(account: Account): Promise<void> {
    await this.db`UPDATE accounts SET data = ${JSON.stringify(account)}, updated_at = ${now()} WHERE id = ${account.id}`;
  }

  async listAccounts(): Promise<Account[]> {
    const rows = await this.db`SELECT data FROM accounts ORDER BY member_no`;
    return rows.map((r: { data: string }) => JSON.parse(r.data));
  }

  // ---------- Website sign-up codes ----------

  async createSignupCode(fields: Omit<SignupCode, "code">): Promise<SignupCode> {
    const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    let code = "";
    do {
      code = "PR-" + Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
    } while (await this.signupCode(code));
    const entry: SignupCode = { code, ...fields };
    await this.db`INSERT INTO signup_codes (code, data, created_at) VALUES (${code}, ${JSON.stringify(entry)}, ${now()})`;
    return entry;
  }

  async signupCode(code: string): Promise<SignupCode | null> {
    const rows = await this.db`SELECT data, claimed_by FROM signup_codes WHERE code = ${code.toUpperCase()}`;
    if (!rows[0]) return null;
    return { ...JSON.parse(rows[0].data), claimedBy: rows[0].claimed_by ?? undefined };
  }

  async claimSignupCode(code: string, accountId: string): Promise<void> {
    await this.db`UPDATE signup_codes SET claimed_by = ${accountId} WHERE code = ${code.toUpperCase()}`;
  }

  // ---------- Bookers and their talent ----------

  async booker(accountId: string): Promise<BookerProfile> {
    const rows = await this.db`SELECT data FROM booker_profiles WHERE account_id = ${accountId}`;
    return rows[0] ? JSON.parse(rows[0].data) : { extraRoles: [], handles: [], nicheTags: [], stopTypes: [], hardNos: [], interests: [] };
  }

  async saveBooker(accountId: string, profile: BookerProfile): Promise<void> {
    const data = JSON.stringify(profile);
    await this.db`INSERT INTO booker_profiles (account_id, data, updated_at) VALUES (${accountId}, ${data}, ${now()})
      ON CONFLICT (account_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`;
  }

  async talentFor(bookerId: string): Promise<Talent[]> {
    const rows = await this.db`SELECT data FROM talent WHERE booker_id = ${bookerId} ORDER BY created_at`;
    return rows.map((r: { data: string }) => JSON.parse(r.data));
  }

  async addTalent(bookerId: string, fields: Omit<Talent, "id" | "bookerId">): Promise<Talent> {
    const t: Talent = { id: id(), bookerId, ...fields };
    await this.db`INSERT INTO talent (id, booker_id, data, created_at) VALUES (${t.id}, ${bookerId}, ${JSON.stringify(t)}, ${ordered()})`;
    return t;
  }

  async saveTalent(t: Talent): Promise<void> {
    await this.db`UPDATE talent SET data = ${JSON.stringify(t)} WHERE id = ${t.id}`;
  }

  async clearTalent(bookerId: string): Promise<void> {
    await this.db`DELETE FROM talent WHERE booker_id = ${bookerId}`;
  }

  // ---------- Press Stops ----------

  async createStop(ownerId: string): Promise<PressStop> {
    const stop: PressStop = {
      id: id(), ownerId, status: "draft", creatorNames: [], formatsExtra: [], platforms: [], audienceVerified: false,
      interests: [], general: false, remoteOk: false, openDates: [], flexible: false, samples: [], fullEpisodeLinks: [], rightsConfirmed: false,
    };
    const t = ordered();
    await this.db`INSERT INTO stops (id, owner_id, status, data, created_at, updated_at) VALUES (${stop.id}, ${ownerId}, ${stop.status}, ${JSON.stringify(stop)}, ${t}, ${t})`;
    return stop;
  }

  async stop(stopId: string): Promise<PressStop | null> {
    const rows = await this.db`SELECT data FROM stops WHERE id = ${stopId}`;
    return rows[0] ? JSON.parse(rows[0].data) : null;
  }

  async saveStop(stop: PressStop): Promise<void> {
    await this.db`UPDATE stops SET status = ${stop.status}, data = ${JSON.stringify(stop)}, updated_at = ${now()} WHERE id = ${stop.id}`;
  }

  async stopsByOwner(ownerId: string): Promise<PressStop[]> {
    const rows = await this.db`SELECT data FROM stops WHERE owner_id = ${ownerId} ORDER BY created_at`;
    return rows.map((r: { data: string }) => JSON.parse(r.data));
  }

  async liveStops(): Promise<PressStop[]> {
    const rows = await this.db`SELECT data FROM stops WHERE status = ${"live"}`;
    return rows.map((r: { data: string }) => JSON.parse(r.data));
  }

  // ---------- Run requests ----------

  async createRequest(bookerId: string, rawText: string): Promise<RunRequest> {
    const r: RunRequest = { id: id(), bookerId, status: "draft", rawText, talentIds: [], only: {}, options: [], nextNumber: 1, createdAt: ordered() };
    await this.db`INSERT INTO run_requests (id, booker_id, status, data, created_at, updated_at) VALUES (${r.id}, ${bookerId}, ${r.status}, ${JSON.stringify(r)}, ${r.createdAt}, ${now()})`;
    return r;
  }

  async request(requestId: string): Promise<RunRequest | null> {
    const rows = await this.db`SELECT data FROM run_requests WHERE id = ${requestId}`;
    return rows[0] ? JSON.parse(rows[0].data) : null;
  }

  async saveRequest(r: RunRequest): Promise<void> {
    await this.db`UPDATE run_requests SET status = ${r.status}, data = ${JSON.stringify(r)}, updated_at = ${now()} WHERE id = ${r.id}`;
  }

  /** The booker's newest request that still has options in play. */
  async openRequest(bookerId: string): Promise<RunRequest | null> {
    const rows = await this.db`SELECT data FROM run_requests WHERE booker_id = ${bookerId} AND status = ${"open"} ORDER BY created_at DESC LIMIT 1`;
    return rows[0] ? JSON.parse(rows[0].data) : null;
  }

  async allStops(): Promise<PressStop[]> {
    const rows = await this.db`SELECT data FROM stops`;
    return rows.map((r: { data: string }) => JSON.parse(r.data));
  }

  // ---------- Messages ----------

  async logMessage(m: Omit<StoredMessage, "id" | "createdAt">): Promise<StoredMessage> {
    const row: StoredMessage = { ...m, id: id(), createdAt: ordered() };
    await this.db`INSERT INTO messages (id, account_id, direction, kind, body, provider_id, data, created_at)
      VALUES (${row.id}, ${row.accountId}, ${row.direction}, ${row.kind}, ${row.body}, ${row.providerId}, ${row.data ? JSON.stringify(row.data) : null}, ${row.createdAt})`;
    return row;
  }

  async messagesFor(accountId: string, limit = 500): Promise<StoredMessage[]> {
    const rows = await this.db`SELECT * FROM messages WHERE account_id = ${accountId} ORDER BY created_at LIMIT ${limit}`;
    return rows.map((r: Record<string, string | null>) => ({
      id: r.id!, accountId: r.account_id!, direction: r.direction as "in" | "out", kind: r.kind!, body: r.body ?? null,
      providerId: r.provider_id ?? null, data: r.data ? JSON.parse(r.data) : null, createdAt: r.created_at!,
    }));
  }

  async messageById(messageId: string): Promise<StoredMessage | null> {
    const rows = await this.db`SELECT * FROM messages WHERE id = ${messageId} OR provider_id = ${messageId}`;
    const r = rows[0];
    return r ? { id: r.id, accountId: r.account_id, direction: r.direction, kind: r.kind, body: r.body ?? null, providerId: r.provider_id ?? null, data: r.data ? JSON.parse(r.data) : null, createdAt: r.created_at } : null;
  }

  // ---------- Background jobs ----------

  async enqueue(kind: string, payload: Record<string, unknown>, runAfter = new Date()): Promise<string> {
    const jobId = id();
    await this.db`INSERT INTO jobs (id, kind, payload, status, attempts, run_after, created_at)
      VALUES (${jobId}, ${kind}, ${JSON.stringify(payload)}, ${"queued"}, ${0}, ${runAfter.toISOString()}, ${ordered()})`;
    return jobId;
  }

  /** Takes up to `limit` due jobs and marks them running. */
  async claimJobs(now: Date, limit = 5): Promise<Job[]> {
    const rows = await this.db`SELECT id, kind, payload, attempts FROM jobs WHERE status = ${"queued"} AND run_after <= ${now.toISOString()} ORDER BY created_at LIMIT ${limit}`;
    const jobs: Job[] = [];
    for (const r of rows) {
      const claimed = await this.db`UPDATE jobs SET status = ${"running"}, attempts = attempts + 1 WHERE id = ${r.id} AND status = ${"queued"} RETURNING id`;
      if (claimed.length) jobs.push({ id: r.id, kind: r.kind, payload: JSON.parse(r.payload), attempts: Number(r.attempts) + 1 });
    }
    return jobs;
  }

  async finishJob(jobId: string, status: "done" | "failed", error?: string): Promise<void> {
    await this.db`UPDATE jobs SET status = ${status}, error = ${error ?? null} WHERE id = ${jobId}`;
  }

  async retryJob(jobId: string, runAfter: Date, error: string): Promise<void> {
    await this.db`UPDATE jobs SET status = ${"queued"}, run_after = ${runAfter.toISOString()}, error = ${error} WHERE id = ${jobId}`;
  }

  async pendingJobs(): Promise<number> {
    const [r] = await this.db`SELECT COUNT(*) AS n FROM jobs WHERE status IN (${"queued"}, ${"running"})`;
    return Number(r.n);
  }

  async close(): Promise<void> {
    await this.db.close();
  }
}
