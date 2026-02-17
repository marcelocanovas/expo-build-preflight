# Third-Party Services & Production Quality

Use this reference to audit external service integrations (Firebase, Sentry, Analytics) and monetization UI. These checks require heuristic analysis of the project structure and UI components.

Return your findings using `[PASS]`, `[FAIL]`, or `[WARN]`.

## 1. Firebase Integration (Production Mode)
While scripts verify file existence, you must verify the configuration logic.

* **EAS Secret Injection:** Verify how `google-services.json` (Android) and `GoogleService-Info.plist` (iOS) are handled.
  * *Check:* Search for a pre-install hook in `eas.json` or a logic in `app.config.js` that decodes a Base64 string from `process.env`.
  * *Action:* If these files are committed directly to the Git repo in plain text, issue a `[WARN]` regarding security best practices.
* **Plugin Configuration:** Check `app.json` for the `@react-native-google-firebase` or `expo-firebase-analytics` plugins.
  * *Action:* If the plugins are present but the `googleServicesFile` paths are missing or incorrect, issue a `[FAIL]`.

## 2. Sentry & Error Tracking
Without proper configuration, Sentry will only show minified, unreadable code for production crashes.

* **Source Maps:** Check `app.json` for the `sentry-expo` or `@sentry/react-native` plugin.
  * *Action:* Verify if `SENTRY_AUTH_TOKEN` is mentioned in the build documentation or `eas.json` secrets. If missing, issue a `[FAIL]`. Sourcemaps will not upload, making production debugging impossible.
* **Environment Tagging:**
  * *Action:* Issue a `[WARN]` to ensure the Sentry `init` call dynamically sets the `environment` (e.g., `process.env.NODE_ENV` or an Expo Release Channel) so production errors aren't mixed with local development noise.

## 3. Monetization & Paywalls (RevenueCat / IAP)
Store reviewers are extremely strict about Subscription UI.

* **EULA & Privacy Policy:** If the app uses `react-native-purchases` or `expo-in-app-purchases`.
  * *Action:* Heuristically check the paywall screen/component. If it lacks clear links to the **Terms of Use (EULA)** and **Privacy Policy**, or if it doesn't clearly state the subscription duration and price, issue a `[FAIL]`. This is a guaranteed rejection.
* **Restore Purchases:**
  * *Action:* Ensure there is a "Restore Purchases" button on the paywall. If missing, issue a `[FAIL]`.

## 4. AI Transparency (2026 Store Compliance)
If the app includes AI features (chatbots, image generation, etc.).

* **Content Disclosure:**
  * *Action:* If the app uses LLMs (OpenAI, Gemini), ensure the user is notified that "content is AI-generated." Issue a `[WARN]` if no such disclosure or "Report/Flag" mechanism is found in the UI components, as this is now mandatory for most store categories.

## 5. Analytics & Data Minimization
* **IDFA / AdId:**
  * *Action:* If analytics are used, verify if `expo-tracking-transparency` is installed. If the app collects data for advertising but doesn't trigger the ATT prompt, issue a `[FAIL]`.

---
**Agent Instruction:** Focus on cross-referencing `package.json` with the UI components and `app.json`. Your goal is to find "logical" gaps that automated scripts might miss.