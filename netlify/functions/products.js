const { getPool, initDb, ok, err, opts } = require('./_db');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return opts();
  try {
    await initDb();
    const db     = getPool();
    const qs     = event.queryStringParameters || {};
    const action = qs.action;
    const body   = event.body ? JSON.parse(event.body) : {};
    const method = event.httpMethod;

    if (action === 'createProducer' && method === 'POST') {
      const { name, email, mp_access_token } = body;
      if (!name || !email || !mp_access_token) return err('Preencha todos os campos', 400);
      const r = await db.query(
        `INSERT INTO producers (name, email, mp_access_token)
         VALUES ($1, $2, $3)
         ON CONFLICT (email) DO UPDATE SET mp_access_token = $3, name = $1
         RETURNING *`,
        [name, email, mp_access_token]
      );
      return ok(r.rows[0]);
    }

    if (action === 'create' && method === 'POST') {
      const { producer_id, name, price } = body;
      if (!producer_id || !name || !price) return err('Preencha todos os campos', 400);
      const r = await db.query(
        `INSERT INTO products (producer_id, name, price) VALUES ($1, $2, $3) RETURNING *`,
        [producer_id, name, parseFloat(price)]
      );
      return ok(r.rows[0]);
    }

    if (action === 'listByProducer' && method === 'GET') {
      const r = await db.query(
        `SELECT * FROM products WHERE producer_id = $1 ORDER BY created_at DESC`,
        [qs.id]
      );
      return ok(r.rows);
    }

    return err('Rota não encontrada', 404);
  } catch (e) {
    console.error(e);
    return err(e.message);
  }
};
