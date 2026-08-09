# Grandma Mode

An accessible voice-first safety assistant built with React, a VoiceOS adapter, and Convex.

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
