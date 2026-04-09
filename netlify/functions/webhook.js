const { getPool, initDb } = require('./_db');
const axios = require('axios');

const COMMISSION_RATE = 0.30;

exports.handler = async (event) => {
  try {
    await initDb();
    const db   = getPool();
    const body = event.body ? JSON.parse(event.body) : {};
    const { type, data } = body;

    if (type !== 'payment') return { statusCode: 200, body: 'ok' };
    const payment_id = data && data.id;
    if (!payment_id) return { statusCode: 200, body: 'ok' };

    const exists = await db.query(
      `SELECT id FROM sales WHERE mp_payment_id = $1`, [String(payment_id)]
    );
    if (exists.rows[0]) return { statusCode: 200, body: 'already processed' };

    const producers = await db.query(`SELECT * FROM producers`);
    let paymentData = null;

    for (const producer of producers.rows) {
      try {
        const res = await axios.get(
          `https://api.mercadopago.com/v1/payments/${payment_id}`,
          { headers: { Authorization: `Bearer ${producer.mp_access_token}` } }
        );
        paymentData = res.data;
        break;
      } catch (_) { continue; }
    }

    if (!paymentData || paymentData.status !== 'approved')
      return { statusCode: 200, body: 'not approved' };

    const external_reference = paymentData.external_reference;
    if (!external_reference) return { statusCode: 200, body: 'no ref' };

    const [affiliate_id, product_id] = external_reference.split('|');
    const amount     = paymentData.transaction_amount;
    const commission = amount * COMMISSION_RATE;

    await db.query(
      `INSERT INTO sales (product_id, affiliate_id, mp_payment_id, amount, commission, status)
       VALUES ($1, $2, $3, $4, $5, 'approved')
       ON CONFLICT (mp_payment_id) DO NOTHING`,
      [product_id, affiliate_id, String(payment_id), amount, commission]
    );

    return { statusCode: 200, body: 'ok' };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: e.message };
  }
};
