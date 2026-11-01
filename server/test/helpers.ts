// The database tests run on. SQLite in memory by default; set TEST_DATABASE_URL
// to a throwaway Postgres to run the same tests the way production stores data.

import { SQL } from "bun";
import { Store } from "../src/db/store";

let last: Store | undefined;

export async function testStore(): Promise<Store> {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) return Store.open("sqlite://:memory:");
  await last?.close();
  const db = new SQL(url);
  await db.unsafe("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await db.close();
  last = await Store.open(url);
  return last;
}
