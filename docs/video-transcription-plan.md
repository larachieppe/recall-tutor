# Video & audio transcription — plan

How Recall turns audio/video sources into study material, and the roadmap for the
harder cases. Phase 1 is built; Phases 2–3 are the roadmap.

## Goal

A learner pastes a link or uploads a file that is (or contains) spoken audio. We
want clean transcript text to feed the existing study-notes + question pipeline.

## Routing (what happens to each source)

```
Source →
 ├ YouTube link
 │   ├ has captions  → transcript API (Supadata)            [BUILT]
 │   └ no captions   → transcribe the audio                 [Phase 2]
 ├ Direct media URL (.mp4/.mp3/.m4a/.mov/…)                 [BUILT: Phase 1]
 ├ Uploaded audio/video file                                [BUILT: Phase 1]
 ├ Other platform (Vimeo/TikTok/X/Loom…)                    [Phase 3]
 └ Article / PDF / DOCX / TXT → existing pipeline           [BUILT]
```

Reliability, easiest → hardest:

1. **Uploaded file / direct media URL** — rock-solid, no anti-bot fight. (Phase 1)
2. **Other platforms** — need a resolver; works per-platform. (Phase 3)
3. **YouTube without captions** — hardest: getting YouTube's *audio* hits the
   same proof-of-origin wall as its captions. (Phase 2)

## Cost & "no subscription" notes (important)

**Nothing here is a subscription.** Every service is a free tier, a one-time free
credit, or pay-as-you-go (per-use, no recurring fee). Free-first choices:

| Piece | Service | Free? |
|---|---|---|
| Hosting | Render | Free tier |
| Database | Neon | Free tier |
| Auth | Auth.js + GitHub OAuth | Free |
| YouTube captions | Supadata | Free tier (~100/mo) |
| Audio STT (URL + upload) | Deepgram | ~$200 one-time free credit ≈ ~750 hrs of audio, then pay-as-you-go (no subscription) |
| Audio STT (truly $0, uploads ≤25 MB) | Groq Whisper | Free tier (rate-limited); no URL fetch |
| File storage (only if async uploads) | Cloudflare R2 | Free tier (10 GB, no egress fee) |

**The one inherent ongoing cost is the Anthropic API** (Claude, for generation +
grading). That is pay-as-you-go per token — **not** a subscription — and it's
already how the app runs. Everything else can stay on free tiers for personal use.

For a strict $0 STT path: use **Groq Whisper** for uploaded files (≤25 MB, free,
rate-limited). Use **Deepgram** when you want to transcribe a *URL* without
downloading it yourself (its free credit is generous). Provider is isolated in
`lib/transcribe.ts`, so switching is a one-function change.

## Phase 1 — BUILT (upload / direct media URL → STT)

- `lib/transcribe.ts`: Deepgram prerecorded API; `transcribeUrl` (Deepgram fetches
  the URL — server never downloads) and `transcribeBytes` (uploaded bytes).
- Wired into `extractFromUrl` (media URLs) and `extractFromFile` (media uploads).
- Uploads capped at 60 MB; UI accepts audio/video and shows "Transcribing…".
- Gated by `DEEPGRAM_API_KEY`; without it, media sources show a clear message.
- **Limitation:** synchronous — a very long file (>~30–40 min) may exceed the HTTP
  request timeout. That's what Phase 2 fixes.

## Phase 2 — async jobs (for long media) + YouTube-no-caption

**Async job flow** (removes the timeout ceiling):

1. `POST /api/transcribe` submits the media → returns a **job id** (stored in
   Neon — a `transcription_jobs` table: id, user, status, transcript, error).
2. UI shows "Transcribing… this can take a few minutes," polling
   `GET /api/transcribe?id=…` until `done`, then the transcript flows in as the
   source. (Deepgram/AssemblyAI support async callbacks or polling on their side,
   so our server just tracks state — fits Render's free tier.)

**YouTube without captions:** getting the audio is the blocker (PO tokens). Options,
free-first:
- Check whether **Supadata** already auto-transcribes no-caption videos (it may —
  verify once the key is in; could make this ~free).
- Otherwise a service that fetches YouTube audio → STT. Some YouTube videos simply
  won't be gettable; show a clear message when so.

## Phase 3 — other platforms (Vimeo, TikTok, X, Loom, …)

Resolve the media URL with a resolver (yt-dlp or a hosted resolver service), then
reuse the Phase-1/2 STT path. Per-platform reliability; add platforms as needed.

## Uploads of large media (if/when needed)

512 MB RAM can't hold a big video. For files beyond the 60 MB cap, upload to
**Cloudflare R2** (free tier) and hand the URL to the STT provider — keeps the
server light. Only needed if large uploads become common.

## Status

- ✅ Phase 1 — upload / media URL → STT (Deepgram). Needs `DEEPGRAM_API_KEY`.
- ⏳ Phase 2 — async jobs + YouTube-no-caption.
- ⏳ Phase 3 — other platforms.
