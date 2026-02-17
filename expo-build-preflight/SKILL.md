---
name: expo-build-preflight
description: Pre-build validation for Expo and React Native apps. Use before running 'eas build --profile production' to ensure compliance with 2026 store rules (Android 15, iOS Privacy Manifests, 16KB Page Size), validate auto-increment, check environment variables, and verify Firebase/Sentry configs.
---

# Expo Production Preflight Workflow

Follow these steps sequentially to audit the Expo project before a production build. Respond with `[PASS]`, `[FAIL]`, or `[WARN]` for each evaluated item.

## Step 1: Programmatic Validation (Deterministic)
Execute the validation scripts on the project files.

1. Run `node scripts/validate_expo_config.js <path-to-app.json> <path-to-eas.json>`.
   * **Expected:** `autoIncrement` is true, `runtimeVersion` uses fingerprint policy, New Architecture is enabled (SDK 55+), and target SDKs are correct.
2. Run `node scripts/check_assets.js <path-to-assets-folder>`.
   * **Expected:** Icons are 1024x1024, no transparent backgrounds on Android adaptive icons.

## Step 2: Platform-Specific Checks (Contextual)
Review platform-specific configurations based on the build target.

* **For Android builds:** Read `references/android-rules.md` to validate API 35 compliance, 16KB page size alignment, and required permissions.
* **For iOS builds:** Read `references/ios-rules.md` to validate `PrivacyInfo.xcprivacy` entries, `Info.plist` permission strings, and deployment targets.

## Step 3: Third-Party & Environment Checks
If the project uses external services (Firebase, Sentry, AI features, Monetization), read `references/third-party-services.md`.
* Ensure `google-services.json` and `GoogleService-Info.plist` are handled securely via EAS Secrets (Base64), not committed to the repo.
* Verify AI Transparency consent screens and Paywall EULA/Privacy Policy visibility.

## Final Output
Summarize the findings. If any `[FAIL]` is present, halt the process and provide exact remediation steps.