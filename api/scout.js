// Scout: researches the named product using real web search, then writes
// structured notes (Sources + Synthesis) for the Writer to build on.
const { PROMPTS, readJsonBody, streamAgent, sendJson } = require('../lib/agent.js');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed.' });

  const body = await readJsonBody(req);
  const product = String(body.product || '').trim().slice(0, 200);
  if (!product) return sendJson(res, 400, { error: 'Please enter a product name.' });

  await streamAgent({
    req,
    res,
    system: PROMPTS.scout,
    user: `Research this product and produce your scout notes: ${product}`,
    maxTokens: 4000,
    // Real web search — this is what makes the citations real instead of guessed.
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 6 }],
  });
};
