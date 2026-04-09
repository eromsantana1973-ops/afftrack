const { Pool } = require('pg');

let pool;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
  }
  return pool;
}

async function initDb() {
  const db = getPool();
  await db.query(`
    CREATE TABLE IF NOT EXISTS producers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      mp_access_token TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS products (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      producer_id UUID REFERENCES producers(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      price NUMERIC(10,2) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS affiliates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      producer_id UUID REFERENCES producers(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      ref_code TEXT UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS sales (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id UUID REFERENCES products(id),
      affiliate_id UUID REFERENCES affiliates(id),
      mp_payment_id TEXT UNIQUE,
      amount NUMERIC(10,2),
      commission NUMERIC(10,2),
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json'
};

const ok   = (data)       => ({ statusCode: 200, headers: CORS, body: JSON.stringify(data) });
const err  = (msg, c=500) => ({ statusCode: c,   headers: CORS, body: JSON.stringify({ error: msg }) });
const opts = ()           => ({ statusCode: 200, headers: CORS, body: '' });

module.exports = { getPool, initDb, ok, err, opts, CORS };
