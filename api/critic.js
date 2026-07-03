// Critic: finds specific, actionable weaknesses in the draft.
const { PROMPTS, readJsonBody, streamAgent, sendJson } = require('../lib/agent.js');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed.' });

  const body = await readJsonBody(req);
  const draft = String(body.draft || '');
  const scoutNotes = String(body.scoutNotes || '');
  if (!draft || !scoutNotes) return sendJson(res, 400, { error: 'Missing draft or Scout notes.' });

  await streamAgent({
    req,
    res,
    system: PROMPTS.critic,
    user:
      `Here is the draft one-pager (draft.md):\n\n${draft}\n\n` +
      `---\n\nHere are the Scout's notes (scout_notes.md):\n\n${scoutNotes}`,
    maxTokens: 2500,
  });
};
