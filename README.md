# Peek — web demo

A deployable website that runs the real Peek pipeline: four AI agents in relay —
**Scout → Writer → Critic → Reviser** — that turn a product name into a
citation-backed competitive one-pager. Scout uses live web search, so the
citations are real, not guessed.

This is the demo version of your Python CLI. The four agent prompts here are the
same engineered prompts from your `src/peek/prompts/` folder; the web app
re-runs that chain in the browser so anyone can watch it work.

---

## The one rule that matters: your API key

Your Anthropic API key is **never** in this code, never in the browser, and
never committed to GitHub. It lives in exactly one place — Vercel's
Environment Variables settings — and only the server-side code can read it.
That's the entire reason this app has a backend (the `api/` folder) instead of
just being a web page. `.gitignore` is set up so a `.env` file can never be
committed by accident.

---

## What's in the box

```
peek-web/
├── index.html            The whole front-end (the console you saw). No build step.
├── api/                  One serverless function per agent. Each makes one Claude call.
│   ├── scout.js            → researches the product (with live web search)
│   ├── writer.js           → drafts the cited one-pager
│   ├── critic.js           → finds weaknesses
│   └── reviser.js          → produces the final brief
├── lib/
│   ├── agent.js          Shared logic: holds the key, streams the model's output.
│   ├── prompts.js        The four prompts, bundled so they always deploy.
│   └── prompts/          The human-readable .md prompts (edit these).
├── scripts/build-prompts.js   Rebuilds prompts.js after you edit a prompt.
├── vercel.json           Tells Vercel how long a function may run.
├── package.json          Project info. No dependencies to install.
├── .env.example          Template for the settings you'll paste into Vercel.
└── .gitignore            Keeps secrets and junk out of git.
```

---

## Deploy it (about 10 minutes, no terminal required)

**1. Put this folder on GitHub.**
Create a new repository (github.com → New repository), then upload the *contents*
of this `peek-web` folder into it. GitHub's web uploader works fine — drag the
files in. Don't upload a `.env` file (you won't have one yet, and you never should).

**2. Get an Anthropic API key.**
Go to console.anthropic.com → API keys → Create key. Copy it somewhere safe for
a moment. You'll paste it into Vercel in step 4 — **not** into any file here.

**3. Create the Vercel project.**
Go to vercel.com, sign in with GitHub, click **Add New → Project**, and import
the repository you just made. Vercel will auto-detect it as a static site with
serverless functions — you don't need to change any build settings. **Don't click
Deploy yet** — first open the **Environment Variables** section on that same screen.

**4. Add your settings as Environment Variables.**
Add these three (name on the left, value on the right):

| Name | Value | Required? |
|------|-------|-----------|
| `ANTHROPIC_API_KEY` | your key from step 2 | **Yes** |
| `DEMO_PASSCODE` | any phrase you choose, e.g. `peek-demo-2026` | Recommended |
| `PEEK_MODEL` | `claude-sonnet-4-6` | Optional |

For `PEEK_MODEL`: leave it out to use the sensible default, set it to
`claude-sonnet-4-5` to exactly match your CLI, or `claude-opus-4-8` for top
quality (and higher cost).

**5. Deploy and test.**
Click **Deploy**. After a minute you'll get a URL like
`your-project.vercel.app`. Open it, type `Linear`, enter your access code, and
hit **Run recon**. You should watch Scout → Writer → Critic → Reviser light up
in turn, then the brief appears on paper.

**6. Before you share the link, make sure `DEMO_PASSCODE` is set.**
With it set, anyone visiting the URL needs the code to run anything, so a
stranger can't spend your API credits. Share the URL *and* the code with your
interviewer.

---

## Keeping costs safe

- **Access code** (`DEMO_PASSCODE`) — gates every run, so only people you give
  the code to can trigger the agents.
- **Output caps** — each agent has a `max_tokens` limit, so a single run can't
  balloon in cost. A typical full run is a handful of cents.
- **Web search** — Scout does a few real searches per run; these have a small
  per-search cost on top of the model tokens. Capped at 6 searches.
- **Spend alerts** — in the Anthropic Console you can set a monthly spend limit
  and email alerts. Do this once and you never have to worry.

---

## Editing the prompts later

The prompts live in `lib/prompts/*.md` (readable) but the app loads them from
`lib/prompts.js` (bundled). After editing a `.md` file, run:

```
node scripts/build-prompts.js
```

then commit both the `.md` and the regenerated `prompts.js`.

---

## Testing on your Mac first (optional)

You don't need to — Vercel's deploy *is* your test. But if you want a local run:
install Node 20+, then `npm i -g vercel`, create a `.env` from `.env.example`
with your key, and run `vercel dev`. Open the localhost URL it prints.

---

## Talking about it in the interview

An honest, strong framing: *"I built Peek as a Python CLI — a four-agent pipeline
where each agent has one job and hard rules against inventing facts. This is a web
demo of that same pipeline so you can watch it run."* Good things to point at:

- **Real research, not hallucination.** Scout uses live web search; every claim
  in the final brief traces to a real source, or it gets flagged.
- **The Critic catches "citation laundering"** — a claim that cites a source but
  says more than the source actually supports. That was a real bug you caught by
  hand, now designed into the system.
- **The Reviser refuses to invent.** If it can't ground a fix in the sources, it
  writes an explicit *Insufficient research* note instead of padding.
- **The key never leaves the server.** A deliberate architecture choice.

---

## Troubleshooting

| What you see | What it means | Fix |
|---|---|---|
| "The server has no ANTHROPIC_API_KEY…" | The key isn't set on Vercel | Add it in Settings → Environment Variables, then redeploy |
| "Access code required or incorrect." | `DEMO_PASSCODE` is set and the code didn't match | Enter the exact code, or clear the variable to run open |
| "Model API error (401)" | The key is invalid or revoked | Create a fresh key in the Anthropic Console, update the variable, redeploy |
| A function times out | A single agent ran past 60s | Rare; just run again. Web search occasionally runs long |
| Changed a variable but nothing changed | Vercel needs a redeploy to pick up new variables | Deployments → ⋯ → Redeploy |
