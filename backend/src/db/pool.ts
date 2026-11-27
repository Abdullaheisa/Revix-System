import pg from "pg";

export function createPgPool(connectionString: string): pg.Pool {
  const isLocal =
    /localhost|127\.0\.0\.1/i.test(connectionString) &&
    !/sslmode=require/i.test(connectionString);

  const pool = new pg.Pool({
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false },
  });
  pool.on("error", (err) => {
    console.warn("[Postgres Pool] Idle client error (handled):", err.message);
  });
  return pool;
}
