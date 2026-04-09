const { getPool, initDb, ok, err, opts } = require('./_db');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return opts();
  try {
    await initDb();
    const db     = getPool();
    const qs     = event.queryStringParameters || {};
    const action = qs.action;
    const method = event.httpMethod;

    if (action === 'listByProducer' && method === 'GET') {
      const r = await db.query(
        `SELECT s.*, p.name AS product_name, a.name AS affiliate_name
         FROM sales s
         JOIN products p   ON s.product_id   = p.id
         JOIN affiliates a ON s.affiliate_id  = a.id
         WHERE p.producer_id = $1
         ORDER BY s.created_at DESC`,
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
