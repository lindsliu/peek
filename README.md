# Peek

**Competitive intelligence, automated.** Name a company, and four AI agents research it live, draft a citation-backed one-pager, fact-check each other, and hand back a brief you could put in front of leadership — where every claim traces to a real source, or it gets flagged.

**[▶ Live demo](https://peek-kappa.vercel.app/)**  ·  **[What I learned building it](https://peek-kappa.vercel.app/learnings.html)**

---

## The problem

Ask a general-purpose model to "summarize a competitor" and it will happily produce a fluent, confident brief — some of which is quietly made up. For competitive intelligence, that's worse than useless: it's wrong in ways you can't see. Peek is built around one question: **can an AI write a competitive brief you'd actually trust, without inventing facts?**

## How it works

Peek runs a four-agent pipeline. Each agent has one job, and the Scout's research travels with the draft to every downstream step — so faithfulness is re-checked at each stage, not just at the end.

| Agent | Job |
|-------|-----|
| **Scout** | Researches the company live with web search; keeps only grounded sources. |
| **Writer** | Drafts a one-pager where every factual claim carries a `[N]` citation. |
| **Critic** | Hunts unsupported claims, laundered citations, and weak recommendations. |
| **Reviser** | Applies fixes that are grounded in the sources — and flags the ones that aren't, instead of inventing. |

The principle throughout: **the sources are the only source of truth. Anything an agent can't tie back to them doesn't make the page** — and when something can't be verified, Peek says so rather than padding. That refusal shows up in two places:

- **At the front door.** If Scout can't turn up enough real sources on a name, Peek stops before drafting and asks for a different one — it won't spin up a confident brief about a company it couldn't actually research. (Type a made-up name into the live demo and you'll see it.)
- **Inside the brief.** For a real company where one specific claim can't be grounded, that line gets a visible "insufficient research" flag rather than a padded guess.

## Built for a skeptical reader

A brief is only trustworthy if you can check it, so two features make the sourcing inspectable rather than something you take on faith:

- **Every `[N]` is clickable.** Click a citation in the brief and it jumps to that exact source in the Scout panel and highlights it — so any claim is one tap from the thing that backs it.
- **Anything can be flagged.** Hover a line and a flag appears; if something looks wrong, you flag it with a reason. It's a claim-level feedback signal — the same human-in-the-loop input you'd use to keep improving the prompts over time.

## How I evaluated it

Prompts are easy to tweak and hard to trust, so I built an evaluation harness to measure whether Peek keeps its promise. It runs the pipeline over ~10 companies — including deliberately thin ones and one that **doesn't exist** — and has a separate model grade every brief 1–5 on:

- **Faithfulness** — does every claim trace to a cited source?
- **Citation accuracy** — does each `[N]` genuinely support the exact claim?
- **Specificity** — concrete numbers and dates where the sources have them.
- **Recommendation quality** — a usable, grounded strategic read for a market entrant.
- **Guardrail** — on the fake/thin companies, does it *refuse* rather than invent? (The sharpest anti-hallucination test.)

I A/B-tested two models on identical research. Headline results: high faithfulness across the board, the fake company refused every time, and Opus edging Sonnet on the judgment-heavy scores (faithfulness, citations) while tying on the mechanical ones. I validated the judge by hand-checking its findings against the sources before trusting it.

The full write-up — architecture, eval rubric, A/B table, and lessons — is on the **[learnings page](https://peek-kappa.vercel.app/learnings.html)**.

## Architecture

- **Frontend** — a single static `index.html`, no build step. Streams each agent's output live so you can watch the pipeline work.
- **Backend** — one Node serverless function per agent (`/api`), deployed on Vercel, plus a small `feedback` endpoint that receives claim-level flags.
- **Key security** — the Anthropic API key lives only as a Vercel environment variable, read server-side. It's never in the code, the browser, or git.
- **Real research** — Scout uses the Anthropic web-search tool, so citations point at sources that actually exist.

```
peek/
├── index.html          Frontend (UI + live streaming). No build step.
├── learnings.html      Project write-up: architecture, eval, lessons.
├── api/                One serverless function per agent, plus feedback
│   ├── scout.js  writer.js  critic.js  reviser.js
│   └── feedback.js     Receives claim-level flags from the brief.
├── lib/
│   ├── agent.js        Shared backend: holds the key, streams output.
│   ├── prompts.js      The four agent prompts, bundled for deploy.
│   └── prompts/        The editable .md prompts — the source of truth.
└── package.json
```

The four prompts are authored as readable `.md` files in `lib/prompts/` and bundled into `lib/prompts.js`, which the serverless functions import at runtime.

## Run your own

1. Fork this repo to your GitHub.
2. Import it into [Vercel](https://vercel.com) (framework preset: **Other**).
3. Add one environment variable: `ANTHROPIC_API_KEY` = your key from [console.anthropic.com](https://console.anthropic.com). *(Optional: `PEEK_MODEL` — defaults to `claude-sonnet-4-6`; set to `claude-opus-4-8` for maximum faithfulness.)*
4. Deploy. Set a spend limit in the Anthropic Console first — every run makes real API calls.

## What I learned

A few things that stuck (the [learnings page](https://peek-kappa.vercel.app/learnings.html) has the full version):

- **Hallucination is real — you reduce it, you don't eliminate it.** Even with a Writer restricted to the Scout's findings and a Critic reviewing it, some slips through. The goal is *rare and caught*, not *impossible*.
- **A PRD matters more when you build with AI, not less** — it's the shared source of truth, even for the parts that go deeper than your own expertise.
- **Send your strongest model where judgment lives** — the A/B gap showed up exactly on the reasoning-heavy calls.
- **Better to leave it blank than to sound good and be wrong** — a flagged gap beats a confident guess.

---

*Built as a portfolio project. Started as a Python CLI, rebuilt as a deployed web app.*
