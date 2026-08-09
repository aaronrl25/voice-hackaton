# Firebase setup for Grandma Mode

The application code is connected to Firebase Authentication and Cloud Firestore. Complete these console steps once to point it at your Firebase project.

## 1. Create and register the web app

1. Open the [Firebase console](https://console.firebase.google.com/) and select **Create a project**.
2. Choose a project name such as `grandma-mode` and finish the wizard. Analytics is optional.
3. From **Project overview**, select the **Web** (`</>`) icon.
4. Enter `Grandma Mode Web` as the nickname and select **Register app**.
5. Keep the page containing the `firebaseConfig` values open.

The Firebase npm package and modular initialization are already included in `src/firebase.ts`.

## 2. Add the local environment values

Copy the example file:

```bash
cp .env.example .env.local
```

Copy each corresponding value from the Firebase `firebaseConfig` object into `.env.local`:

```dotenv
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

Do not add quotes. Restart `npm run dev` after changing environment variables. `.env.local` is already ignored by Git.

## 3. Enable email/password accounts

1. In Firebase, open **Build → Authentication**.
2. Select **Get started**.
3. Open **Sign-in method** and select **Email/Password**.
4. Enable the first **Email/Password** option and save it.

Account creation, sign-in, and forgotten-password emails now use Firebase Authentication.

## 4. Create Firestore

1. Open **Build → Firestore Database**.
2. Select **Create database**.
3. Choose a region close to your users. This location cannot easily be changed later.
4. Choose **Production mode** and create the database.

## 5. Publish the secure rules

Open **Firestore Database → Rules**, replace the editor contents with `firestore.rules`, and select **Publish**.

The rules require authentication and only allow a user to access their own document and nested requests:

```text
users/{firebaseUserId}
users/{firebaseUserId}/requests/{requestId}
```

Never use `allow read, write: if true` for this app; it would expose private safety records.

## 6. Run and verify CRUD

```bash
npm run dev
```

1. **Create account** creates a Firebase Auth user and `users/{uid}` profile.
2. Finish onboarding to **update** the profile.
3. Open Activity and select **Add demo safety check** to **create** a request.
4. Refresh or sign in again; the Firestore listener **reads** saved requests.
5. Approve or block a request to **update** the request.
6. Open a request and select **Delete this record** to **delete** it.
7. Inspect **Firestore Database → Data** in Firebase to see each change.

## 7. Implementation map

- `src/firebase.ts` initializes Firebase from Vite environment variables.
- `src/firebaseData.ts` contains profile and request CRUD operations.
- `src/Landing.tsx` handles account creation, sign-in, and password reset.
- `src/App.tsx` subscribes to requests and persists changes.
- `firestore.rules` isolates records by Firebase UID.

## Production checklist

- Add production domains under **Authentication → Settings → Authorized domains**.
- Enable email-enumeration protection before launch.
- Turn on Firebase App Check to reduce unauthorized-client abuse.
- Test Firestore rules with the Firebase Emulator Suite.
- Configure project budget alerts and usage monitoring.
