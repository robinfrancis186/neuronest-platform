# NeuroNest Family — Android and iOS

Expo SDK 55 / React Native parent app, with Today, Journey, Care, Library and Account. English and Malayalam UI; API content and clinical records keep their source language.

## Local development

```sh
cd apps/mobile
npm ci
cp .env.example .env
npm start
```

Set the Firebase and core API variables in `.env` before starting. Use an HTTPS core API outside local development. A physical device cannot use your computer's localhost address. `npm run web` runs a browser preview; the browser keeps sessions in browser storage and has no offline draft storage.

LiveKit and Razorpay require a native development build; Expo Go is not supported. See [LiveKit’s Expo setup](https://docs.livekit.io/home/quickstarts/expo). Native project generation:

```sh
npx expo prebuild --no-install
npm run ios
# or
npm run android
```

`ios/` and `android/` are generated and ignored. `app.json` and the locked dependencies are the native build source of truth. iOS compilation needs full Xcode and CocoaPods; Android compilation needs a JDK and Android SDK. This checkout has generated native projects and all three Metro bundles; it does not include a signed IPA/APK. On the checked machine, `xcodebuild` reports CommandLineTools rather than full Xcode, Java is absent, and the standard Android SDK directory is absent.

## Configuration

- `EXPO_PUBLIC_API_URL`: HTTPS core API for release builds. The transport rejects HTTP outside development, including file downloads.
- `EXPO_PUBLIC_FIREBASE_API_KEY`, `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`, `EXPO_PUBLIC_FIREBASE_PROJECT_ID`, `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`, `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `EXPO_PUBLIC_FIREBASE_APP_ID`: copy the **Web app** configuration from Firebase project settings. They identify a public client app and are not server credentials. The app refuses sign-in when any is absent.
- Firebase console: enable **Authentication → Email/Password**, configure the verification and password-reset email templates, and require the same 12-character-or-stronger password policy as the app. Register Android/iOS apps matching `in.neuronest.family`, then place your own `google-services.json` and `GoogleService-Info.plist` in `apps/mobile/`. These Firebase client configuration files are intentionally excluded from Git; native builds need them locally.
- Core service: configure Firebase Admin credentials and the Firebase Web API key server-side. The core verifies Firebase ID tokens and exchanges a username/password sign-in for a short-lived Firebase custom token, so the mobile UI never learns an account email from a username.
- `EXPO_PUBLIC_EAS_PROJECT_ID`: Expo project ID for native push enrollment. Configure FCM/APNs credentials through the app publisher before enabling push. The API stores the returned Expo token through `/preferences/`. The current backend stores one push token per account; enrolling another device replaces the prior token. See [Expo push setup](https://docs.expo.dev/push-notifications/push-notifications-setup/).
- Keep API/provider/signing secrets on the server. Nothing prefixed `EXPO_PUBLIC_` is secret.

Razorpay checkout uses the server-created order. Its client callback never marks an appointment paid. Only a verified server webhook confirms payment. Video uses the appointment's short-lived server token; rejoining requests a fresh token. Missing provider credentials remain unavailable.

## Implemented flows

- Username/password sign-in through the core's Firebase custom-token bridge; direct email/password sign-in only for first-time verified-account completion and recovery. Sign-up asks for name, email and password; after verification, the parent chooses the username used for future sign-ins. Firebase sends the verification/reset email. Firebase Auth persistence uses device-only Keychain/Keystore storage. Child switching/creation/editing, caregiver invitation acceptance even before a first child is linked, saved language, and an app-switcher privacy cover remain available.
- Observations and explicit encrypted offline drafts; goals/status, growth measurements, vaccinations, therapy sessions and referrals.
- Records, uploads under server quarantine, authenticated document downloads, JSON export/share, access audit, guardians, scoped expiring grants and revocation.
- Verified directory and availability; booking/payment, cancellation/rescheduling, refund request, native consultation controls and reconnect; child-scoped messages.
- Reviewed content and resources; notifications/read state; email/push preferences and privacy requests.
- Server-driven screening questions with no preselected answers, resumable initial/follow-up stages and history; disabled licensed instruments stay disabled. The app never invents question content or results.
- Assistant chat with citations, escalation and explicit opt-in for minimal authorized record context. Unavailable engines report errors.

Offline observation payloads use Expo's AES-GCM encryption with per-account keys in device-only Keychain/Keystore storage. Writes are committed atomically. Replay rechecks visible child access, sends a stable idempotency key, and deletes only acknowledged drafts. A failed request retains unsent drafts. Families can erase all account drafts from Privacy. Clinical records are not cached offline. Native crypto, camera/microphone, push delivery and OS sharing still need device acceptance testing.

## Verification

```sh
npm run typecheck
npm test
npx expo install --check
npx expo prebuild --no-install
npm run export
```

The Xcode generator's UUID dependency is pinned to its patched CommonJS-compatible release via a scoped npm override. The small test suite checks generator compatibility, draft owner isolation, partial replay recovery, observation/date validation, Firebase configuration failure, Malayalam navigation, account validation and authenticated/HTTPS transport. Bundling is not a substitute for native device, Firebase Auth, payment sandbox, clinical, or notification delivery acceptance. Production activation also depends on the backend's provider credentials, licensed instruments, governance and operational readiness.
