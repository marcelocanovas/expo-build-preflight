# Android Production Rules (2026 Standard)

Use this reference to evaluate Android-specific configurations in the Expo project. You must analyze the `app.json` (or `app.config.js`), `package.json` dependencies, and the `eas.json` profile.

Return your findings using `[PASS]`, `[FAIL]`, or `[WARN]`. Provide exact remediation steps for any failures.

## 1. 16KB Page Size Compliance & SDK Version
Google Play strictly requires apps to support 16KB memory page sizes. Apps with unaligned native libraries will crash on modern Android 15+ devices.

* **Expo SDK Version:** Check `package.json`. The project MUST be on Expo SDK 52 or higher (which includes React Native 0.76+ with 16KB support).
  * *Action:* If SDK < 52, issue a `[FAIL]`. Instruct the user to upgrade: `npx expo-env-info` and `npx expo upgrade`.
* **Target API Level:** Verify `expo.android.targetSdkVersion` in `app.json`. It MUST be at least `35` (Android 15).
  * *Action:* If missing or < 35, issue a `[FAIL]`.
* **Native Modules (Heuristic):** Scan `package.json` for outdated native libraries (e.g., old versions of `react-native-reanimated`, `react-native-sqlite-storage`, or unmaintained video players).
  * *Action:* Issue a `[WARN]` if heavily outdated C++ dependent libraries are found, advising the user to verify 16KB alignment via Android Studio's memory alignment tool before releasing.

## 2. Permissions & Privacy Audit
Google Play aggressively rejects apps that request unnecessary permissions. Audit the `expo.android.permissions` array in `app.json`.

* **Storage Permissions:** * Look for `READ_EXTERNAL_STORAGE` or `WRITE_EXTERNAL_STORAGE`.
  * *Action:* Issue a `[WARN]`. Advise the user to remove these and use the Android Photo Picker (`expo-image-picker` without requesting library permissions) or scoped storage (`READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`), which are mandatory for Android 13+.
* **Exact Alarms:**
  * Look for `SCHEDULE_EXACT_ALARM` or `USE_EXACT_ALARM`.
  * *Action:* Issue a `[FAIL]` unless the app is a calendar or alarm clock. Google Play will reject the app. Suggest using `WorkManager` (via `expo-background-fetch`) or standard `expo-notifications` for general scheduling.
* **Location:**
  * Look for `ACCESS_BACKGROUND_LOCATION`.
  * *Action:* Issue a `[WARN]`. Remind the user that this requires a dedicated video submission to Google Play proving the core feature requires background location.

## 3. Firebase & Push Notifications (FCM v1)
Legacy Firebase Cloud Messaging (FCM) APIs are fully deprecated and disabled.

* **FCM HTTP v1 API:** If the app uses `expo-notifications` with Firebase, verify that the project is not relying on legacy Server Keys.
  * *Action:* Issue a `[WARN]` reminding the user that push notifications will silently fail in production if they haven't migrated their backend and Google Cloud project to the FCM HTTP v1 API.
* **Google Services JSON:** Ensure `google-services.json` is NOT hardcoded in the repository.
  * *Action:* Check `eas.json`. Ensure the file is injected securely via `eas build` secrets (e.g., using `process.env.GOOGLE_SERVICES_JSON` in `app.config.js`). Issue a `[FAIL]` if the JSON content is exposed in the source code.

## 4. Keystore & App Signing
* **Play App Signing:** Android apps should use Google Play App Signing.
  * *Action:* Check if the user is running `eas build`. Issue a `[PASS]` if they are letting EAS manage the credentials (`eas credentials`), but add a `[WARN]` reminding them to download the Upload Key certificate and register it in the Google Play Console if this is the first production release.

---
**Agent Instruction:** After reading this file, compile your analysis based on the user's codebase. Do not output the rules themselves; output only the results of your audit against the user's project.