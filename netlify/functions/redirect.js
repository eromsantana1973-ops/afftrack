const { getPool, initDb } = require('./_db');
const axios = require('axios');

exports.handler = async (event) => {
  try {
    await initDb();
    const db         = getPool();
    const qs         = event.queryStringParameters || {};
    const ref_code   = qs.ref;
    const product_id = qs.product;

    if (!ref_code || !product_id)
      return { statusCode: 400, body: 'Parâmetros inválidos' };

    const affR = await db.query(
      `SELECT * FROM affiliates WHERE ref_code = $1`, [ref_code]
    );
    if (!affR.rows[0]) return { statusCode: 404, body: 'Afiliado não encontrado' };
    const affiliate = affR.rows[0];

    const prodR = await db.query(
      `SELECT p.*, pr.mp_access_token
       FROM products p
       JOIN producers pr ON p.producer_id = pr.id
       WHERE p.id = $1`,
      [product_id]
    );
    if (!prodR.rows[0]) return { statusCode: 404, body: 'Produto não encontrado' };
    const product = prodR.rows[0];

    const external_reference = `${affiliate.id}|${product_id}`;
    const host     = event.headers && event.headers.host ? event.headers.host : '';
    const base_url = process.env.URL || `https://${host}`;

    const mpRes = await axios.post(
      'https://api.mercadopago.com/checkout/preferences',
      {
        items: [{
          title: product.name,
          unit_price: parseFloat(product.price),
          quantity: 1
        }],
        external_reference,
        notification_url: `${base_url}/webhook/mp`,
        back_urls: {
          success: `${base_url}/obrigado`,
          failure: `${base_url}/erro`
        },
        auto_return: 'approved'
      },
      {
        headers: {
          Authorization: `Bearer ${product.mp_access_token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return { statusCode: 302, headers: { Location: mpRes.data.init_point } };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: 'Erro: ' + e.message };
  }
};
