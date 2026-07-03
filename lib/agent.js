// Shared server-side logic for every Peek agent endpoint.
//
// The Anthropic API key lives ONLY here, read from an environment variable that
// is set in the Vercel dashboard. It never appears in this file, never reaches
// the browser, and never gets committed to git. This is the whole reason the
// site has a backend at all.

const PROMPTS = require('./prompts.js');

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = process.env.PEEK_MODEL || 'claude-sonnet-4-6';

// If DEMO_PASSCODE is set in the environment, every run must send a matching
// code. If it is not set, the demo is open (fine for local testing, but set one
// before you share a public URL so strangers can't spend your API credits).
function passcodeOk(req) {
  const required = process.env.DEMO_PASSCODE;
  if (!required) return true;
  const provided = req.headers['x-peek-passcode'] || '';
  return provided === required;
}

// Read a JSON body whether or not the platform pre-parsed it.
async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

function sendJson(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(obj));
}

// Calls the model with streaming on, and pipes the text back to the browser as
// it arrives. The frontend reads this stream so you can watch each agent think.
async function streamAgent({ req, res, system, user, maxTokens, tools, model }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return sendJson(res, 500, {
      error:
        'The server has no ANTHROPIC_API_KEY. Add it in Vercel → Settings → Environment Variables, then redeploy.',
    });
  }
  if (!passcodeOk(req)) {
    return sendJson(res, 401, { error: 'Access code required or incorrect.' });
  }

  const payload = {
    model: model || DEFAULT_MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: user }],
    stream: true,
  };
  if (tools) payload.tools = tools;

  let upstream;
  try {
    upstream = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    return sendJson(res, 502, { error: 'Could not reach the model API: ' + err.message });
  }

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => '');
    return sendJson(res, upstream.status || 502, {
      error: 'Model API error (' + upstream.status + ').',
      detail: detail.slice(0, 600),
    });
  }

  // Stream plain text back to the browser.
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('X-Accel-Buffering', 'no');
  if (res.flushHeaders) res.flushHeaders();

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // Anthropic sends Server-Sent Events: lines beginning with "data:".
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep the last, possibly-incomplete line

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const data = trimmed.slice(5).trim();
        if (!data || data === '[DONE]') continue;

        let event;
        try {
          event = JSON.parse(data);
        } catch {
          continue;
        }

        if (event.type === 'content_block_delta' && event.delta && event.delta.type === 'text_delta') {
          if (event.delta.text) res.write(event.delta.text);
        } else if (event.type === 'error') {
          res.write('\n\n[stream error: ' + ((event.error && event.error.message) || 'unknown') + ']');
        }
      }
    }
  } catch (err) {
    res.write('\n\n[stream interrupted: ' + err.message + ']');
  }
  res.end();
}

module.exports = { PROMPTS, DEFAULT_MODEL, readJsonBody, streamAgent, sendJson };
