const { getPool, initDb, ok, err, opts } = require('./_db');
const { v4: uuidv4 } = require('uuid');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return opts();
  try {
    await initDb();
    const db     = getPool();
    const qs     = event.queryStringParameters || {};
    const action = qs.action;
    const body   = event.body ? JSON.parse(event.body) : {};
    const method = event.httpMethod;

    if (action === 'create' && method === 'POST') {
      const { producer_id, name, email } = body;
      if (!producer_id || !name || !email) return err('Preencha todos os campos', 400);
      const ref_code = uuidv4().replace(/-/g, '').slice(0, 8).toUpperCase();
      const r = await db.query(
        `INSERT INTO affiliates (producer_id, name, email, ref_code)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [producer_id, name, email, ref_code]
      );
      return ok(r.rows[0]);
    }

    if (action === 'listByProducer' && method === 'GET') {
      const r = await db.query(
        `SELECT a.*,
          COUNT(s.id) FILTER (WHERE s.status = 'approved') AS total_sales,
          COALESCE(SUM(s.commission) FILTER (WHERE s.status = 'approved'), 0) AS total_commission
         FROM affiliates a
         LEFT JOIN sales s ON s.affiliate_id = a.id
         WHERE a.producer_id = $1
         GROUP BY a.id
         ORDER BY a.created_at DESC`,
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
