# Recall — active-recall tutor

Turn any link or file into medium-difficulty practice questions with rubric-based
feedback. Paste a URL or upload a PDF/DOCX/TXT/MD, choose difficulty and question
types, answer one question at a time, and get detailed feedback: what you got
right, what was missing, a stronger answer, and a follow-up. At the end you see
your strengths and weakest topics and can run another round focused on weak areas.

Built with Next.js + TypeScript + Tailwind, using the Claude API for question
generation and answer grading. No database or login — sessions are kept in your
browser's `localStorage`.

## Setup

1. Install dependencies (already done if you're reading this after scaffolding):

   ```bash
   npm install
   ```

2. Add your Anthropic API key. Copy the example env file and paste your key:

   ```bash
   cp .env.local.example .env.local
   ```

   Then edit `.env.local` and set `ANTHROPIC_API_KEY`. Get a key at
   <https://console.anthropic.com/settings/keys>. The key stays on your machine —
   it's only read server-side by the API routes.

3. Run the dev server:

   ```bash
   npm run dev
   ```

   Open <http://localhost:3000> (or the port shown in the terminal).

## How it works

- `app/api/extract` — pulls clean text from a URL (Readability) or a file
  (`unpdf` for PDF, `mammoth` for DOCX, plain text for TXT/MD).
- `app/api/generate` — one Claude call returns questions, each with a topic,
  a reference answer, a **rubric** (criteria summing to 10 points), and the
  supporting source passage. Uses structured outputs so the JSON is always valid.
- `app/api/grade` — grades a free-text answer against that rubric criterion by
  criterion (not against one exact answer), so valid alternative wording gets
  credit.

## Model

Defaults to `claude-opus-4-8` (highest quality). To trade quality for lower cost,
set `ANTHROPIC_MODEL` in `.env.local` to `claude-sonnet-5` or `claude-haiku-4-5`.

## Deploy to Render

This repo includes a `render.yaml` blueprint that runs the app as a Node web
service (needed because the API routes run server-side).

1. Push this repo to GitHub.
2. In the [Render dashboard](https://dashboard.render.com): **New +** →
   **Blueprint**, and connect this repo. Render reads `render.yaml` and proposes
   a web service named `recall-tutor`.
3. When prompted, set the `ANTHROPIC_API_KEY` secret (it is never stored in the
   repo).
4. **Apply.** Render builds with `npm ci && npm run build` and starts with
   `npm start`. You'll get a URL like `recall-tutor.onrender.com`.

Note: Render's free tier sleeps after ~15 min idle (first request then takes
~30–50s) and has 512 MB RAM; large PDF/URL parsing can be memory-heavy, so bump
to a paid instance if you hit out-of-memory errors.

## Possible next steps

- Persist sessions to a database (Supabase) + accounts, so history syncs.
- Chunk + embed long documents instead of sending the first ~60k characters.
- More question types (multiple choice, cloze/flashcards, calculations).
- Spaced repetition scheduling for weak topics across sessions.
