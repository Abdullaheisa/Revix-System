import pg from "pg";

export function createPgPool(connectionString: string): pg.Pool {
  const isLocal =
    /localhost|127\.0\.0\.1/i.test(connectionString) &&
    !/sslmode=require/i.test(connectionString);

  return new pg.Pool({
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false },
  });
}
