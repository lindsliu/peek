// Writer: turns the Scout's notes into a citation-backed one-pager draft.
const { PROMPTS, readJsonBody, streamAgent, sendJson } = require('../lib/agent.js');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed.' });

  const body = await readJsonBody(req);
  const product = String(body.product || '').trim().slice(0, 200);
  const scoutNotes = String(body.scoutNotes || '');
  if (!scoutNotes) return sendJson(res, 400, { error: 'Missing Scout notes.' });

  await streamAgent({
    req,
    res,
    system: PROMPTS.writer,
    user: `Product: ${product}\n\nHere are the Scout's notes (scout_notes.md):\n\n${scoutNotes}`,
    maxTokens: 3000,
  });
};
