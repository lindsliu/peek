// Reviser: applies the Critic's grounded fixes and produces the final one-pager.
const { PROMPTS, readJsonBody, streamAgent, sendJson } = require('../lib/agent.js');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed.' });

  const body = await readJsonBody(req);
  const draft = String(body.draft || '');
  const critique = String(body.critique || '');
  const scoutNotes = String(body.scoutNotes || '');
  if (!draft || !critique || !scoutNotes)
    return sendJson(res, 400, { error: 'Missing draft, critique, or Scout notes.' });

  await streamAgent({
    req,
    res,
    system: PROMPTS.reviser,
    user:
      `Here is the draft (draft.md):\n\n${draft}\n\n` +
      `---\n\nHere is the critique (critique.md):\n\n${critique}\n\n` +
      `---\n\nHere are the Scout's notes (scout_notes.md):\n\n${scoutNotes}`,
    maxTokens: 3000,
  });
};
