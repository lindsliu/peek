// Feedback: records a claim-level "this looks wrong" flag from a brief.
// v1 writes a structured log line (visible in Vercel's function logs). To make
// flags queryable at scale, swap the console.log for a datastore/analytics
// write (e.g. a KV store, a database row, or an analytics event).
const { readJsonBody, sendJson } = require('../lib/agent.js');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed.' });

  const body = await readJsonBody(req);
  const record = {
    ts: new Date().toISOString(),
    product: String(body.product || '').slice(0, 200),
    reason: String(body.reason || '').slice(0, 60),
    claim: String(body.claim || '').slice(0, 600),
    note: String(body.note || '').slice(0, 600),
  };

  // v1 capture. Replace this line with a persistent write in production.
  console.log('[peek:flag]', JSON.stringify(record));

  return sendJson(res, 200, { ok: true });
};
