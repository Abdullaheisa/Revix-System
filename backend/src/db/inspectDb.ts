import pg from 'pg';

async function main() {
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgre123@localhost:5433/revix_system'
  });

  try {
    await client.connect();
    console.log('--- CONNECTED TO POSTGRESQL 18 ON PORT 5433 ---');
    
    const dbRes = await client.query('SELECT datname FROM pg_database WHERE datistemplate = false');
    console.log('Databases:', dbRes.rows.map(r => r.datname));

    const tableRes = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log('Tables in revix_system:', tableRes.rows.map(r => r.table_name));

    for (const t of tableRes.rows) {
      const countRes = await client.query(`SELECT COUNT(*) as count FROM ${t.table_name}`);
      console.log(`Table ${t.table_name}: ${countRes.rows[0].count} rows`);
    }

    // Check companies
    const compRes = await client.query('SELECT id, legal_name, brand_color, operating_mode, base_currency FROM companies LIMIT 5');
    console.log('Companies:', compRes.rows);

    // Check branches
    const branchRes = await client.query('SELECT id, company_id, name, code, currency_code, country_code FROM branches LIMIT 5');
    console.log('Branches:', branchRes.rows);

    await client.end();
  } catch (err) {
    console.error('Inspect error:', err);
  }
}

main();
