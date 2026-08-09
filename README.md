# Grandma Mode

An accessible voice-first safety assistant built with React, a VoiceOS adapter, and Convex.

## Onboarding

Four screens, in `src/Onboarding.tsx`, designed for someone who does not consider
themselves good with technology:

1. **Welcome** — what the assistant does, and that setup takes about a minute. Telling
   someone how long it lasts is most of what stops them abandoning it.
2. **Hear me** — tap the big button and say hello. This is a rehearsal of the app's only
   real gesture, and it doubles as the microphone permission prompt, asked *after* the
   plain-language explanation of when it listens rather than cold on load.
3. **Your name** — spoken, with "Type it instead" alongside. `cleanName` in
   `src/profile.ts` handles the whole-sentence answers people actually give: "my name is
   Margaret" becomes "Margaret".
4. **Your trusted person** — pick who gets asked about risky actions.

Rules the flow holds to:

- **No dead ends.** Every step is skippable and skipping still yields a usable profile,
  so a failed microphone or a misheard name can never trap someone on a screen.
- **One question per screen**, with Back always available and a "Step 2 of 3" counter.
- **The assistant speaks each step aloud**, and only ever on advancing — never on mount,
  since browsers block speech synthesis before the first interaction.
- **Choices take effect.** The trusted person chosen here is used throughout: the header
  call button, the approval gate labels, and the spoken replies. It can be changed later
  on the People screen, exactly as the last step promises.

The profile persists in `localStorage`, guarded against private-window failures.

## Voice-first design

Speaking is the primary way to use the app. The home screen is a single large microphone
button — tap it, speak, and the assistant answers out loud and on screen. Every spoken
request is also reachable by tapping a large button, so nothing depends on voice working.

Design constraints for older users:

- One primary action per screen; the microphone is the largest element on the page.
- Minimum touch target of 3.9rem (~70px), and 4.2rem for approve/block decisions.
- Body text at 1.05rem with a 1.6 line height; headings scale fluidly with the viewport.
- Plain-language state copy ("I'm listening…", "Let me check that…") and `aria-live` updates.
- Errors never fail silently — an unheard phrase or a denied microphone explains the next step.
- Honours `prefers-reduced-motion`, and every control has a visible focus ring.

### The assistant's voice

The assistant is voiced as a calm, capable young man — a security professional talking
you through something. `src/speech.ts` ranks the installed English voices to find him
rather than accepting the platform default, which is frequently a robotic
formant-synthesis voice.

Ranking favours neural/premium voices and a list of masculine names, skips
feminine-presenting voices, and heavily penalises the novelty voices macOS ships
(Zarvox, Trinoids, Bad News, and friends). Names are matched on whole-word boundaries,
so `tom` does not match "Thomas" and `male` does not match "Female". On macOS this
resolves to Aaron; on Edge to a Microsoft Natural male voice such as Guy or Andrew.

Replies are spoken one sentence per utterance. This produces natural pauses instead of a
monotone run-on, and keeps every utterance well under the ~15 second cutoff Chrome
applies to a single utterance.

**Emotion.** The Web Speech API has no emotion parameter, so feeling is carried by rate
and pitch. Every reply declares a `Tone` — `friendly`, `reassuring`, `warning` or
`neutral` — and `shape()` in `src/speech.ts` turns it into per-sentence prosody. A scam
warning is slow and low (rate .86); good news is brighter and quicker (rate 1.03). Pitch
also declines gently across a reply the way a real voice settles as a thought completes,
and lifts on a question. A fixed rate and pitch on every sentence is most of what reads
as robotic.

**Register matters as much as prosody.** The spoken lines in `src/commands.ts` use
contractions and casual phrasing. "I'm not totally sure" sounds like a person; "I am not
completely certain" sounds like a machine, in the same voice at the same rate.

**Accent.** There is no accent selector. `pickVoice` restricts the pool to `en-US`
voices, which are General American — effectively the West Coast standard — and only
falls back to other English locales on a machine with no en-US voice at all.

**For much better audio quality on macOS**, install a high-quality variant of the voice:
System Settings → Accessibility → Spoken Content → System Voice → Manage Voices, then
download Aaron (Enhanced) or (Premium). The ranking already scores those variants
highest, so one will be picked up automatically once installed. This is a far larger
improvement than any prosody tuning — the standard-quality built-in voices are the main
remaining source of robotic sound.

Recognised phrases are matched in `src/commands.ts`: asking about your calendar, whether a
message is safe, to see recent activity or trusted people, or to call a contact by name.
Anything it does not understand results in **no action** and a spoken explanation.

## Run locally

```bash
npm install
npm run dev
```

The interface runs immediately in demo mode and uses the browser speech-recognition API through `src/voiceos.ts`. To connect a hosted Convex deployment, run `npx convex dev`, copy the generated URL into `.env.local` as `VITE_CONVEX_URL`, and connect the generated API bindings in the UI data adapter.

## Safety model

- Low risk: assist automatically and write a receipt.
- Medium risk: require the user's explicit confirmation.
- High risk: block by default; require approval from both the user and a verified trusted contact.
- Every analysis, state transition, approval, and action receipt is an append-only Convex record and can be streamed with reactive queries.

`convex/grandma.ts` contains the server-side heuristic fallback. For production, replace or augment it with a structured-output model and an allow-listed official directory provider. Never use phone numbers or links found inside the suspicious message as verification sources.
