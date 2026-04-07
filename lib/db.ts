import { createPool, type Pool } from "mysql2/promise";
import { getDatabaseUrl } from "@/lib/server-env";

let pool: Pool | undefined;

export function getPool(): Pool {
  if (!pool) {
    pool = createPool(getDatabaseUrl());
  }

  return pool;
}
