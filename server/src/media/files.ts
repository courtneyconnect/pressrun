// Where cards, clips and covers live. Messages need a public URL for each file.
// Locally they sit in a folder served at /files; in production they go to
// Cloudflare R2 through Bun's built-in S3 client.

import { S3Client } from "bun";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";

export interface FileStore {
  put(key: string, data: Uint8Array, type: string): Promise<string>;
  get(key: string): Promise<Uint8Array | null>;
}

export class LocalFiles implements FileStore {
  constructor(private dir: string, private baseUrl: string) {}

  async put(key: string, data: Uint8Array): Promise<string> {
    const path = join(this.dir, key);
    await mkdir(dirname(path), { recursive: true });
    await Bun.write(path, data);
    return `${this.baseUrl}/files/${key}`;
  }

  async get(key: string): Promise<Uint8Array | null> {
    const f = Bun.file(join(this.dir, key));
    return (await f.exists()) ? new Uint8Array(await f.arrayBuffer()) : null;
  }

  /** For the /files route. Refuses paths that climb out of the folder. */
  file(key: string) {
    if (key.includes("..")) return null;
    return Bun.file(join(this.dir, key));
  }
}

/** Needs R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET and R2_PUBLIC_URL. */
export class R2Files implements FileStore {
  private client: S3Client;

  constructor(private env: Record<string, string | undefined>) {
    this.client = new S3Client({
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      bucket: env.R2_BUCKET,
      endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    });
  }

  async put(key: string, data: Uint8Array, type: string): Promise<string> {
    await this.client.write(key, data, { type });
    return `${this.env.R2_PUBLIC_URL}/${key}`;
  }

  async get(key: string): Promise<Uint8Array | null> {
    const f = this.client.file(key);
    return (await f.exists()) ? new Uint8Array(await f.arrayBuffer()) : null;
  }
}
