# iOS Production Rules (2026 Standard)

Use this reference to evaluate iOS-specific configurations in the Expo project. You must analyze the `app.json` (or `app.config.js`), `package.json` dependencies, and any custom plugins affecting the iOS build.

Return your findings using `[PASS]`, `[FAIL]`, or `[WARN]`. Provide exact remediation steps for any failures.

## 1. Privacy Manifests (`PrivacyInfo.xcprivacy`)
Apple strictly requires a Privacy Manifest for all apps and third-party SDKs that collect data or use "Required Reason APIs" (e.g., `NSUserDefaults`, file timestamps, disk space checking).

* **Expo SDK Version:** Ensure the project is on Expo SDK 50 or higher, which provides built-in support for Privacy Manifests.
  * *Action:* If SDK < 50, issue a `[FAIL]`.
* **Required Reason APIs Validation:** Scan `app.json` for the `expo-build-properties` plugin or the `expo-apple-privacy` configuration. If the app uses packages like `expo-file-system` or `AsyncStorage`, they automatically trigger these requirements.
  * *Action:* Issue a `[WARN]` to remind the user to verify that any custom native modules or bare workflow pods have their own `PrivacyInfo.xcprivacy` files, otherwise the App Store Connect upload will be automatically rejected.

## 2. `Info.plist` Permission Strings
Apple's automated reviewers will instantly reject an app if it includes code for a hardware feature (even inside an unused third-party SDK) without a corresponding usage description string in the `Info.plist`.

* **Validation:** Audit the `expo.ios.infoPlist` object in `app.json`. Look for common required strings based on the project's dependencies:
  * `NSCameraUsageDescription` (if using `expo-camera` or `expo-image-picker`)
  * `NSPhotoLibraryUsageDescription` & `NSPhotoLibraryAddUsageDescription`
  * `NSLocationWhenInUseUsageDescription` (if using `expo-location`)
  * `NSMicrophoneUsageDescription` (if using `expo-av`)
* **String Quality:** Apple rejects generic strings like "We need your camera." The string MUST explain *why* the app needs it and *what* it does with it.
  * *Action:* If any of these plugins are in `package.json` but missing from `infoPlist` (or if the descriptions are too vague/short), issue a `[FAIL]`.

## 3. App Tracking Transparency (ATT)
If the app uses Firebase Analytics, Facebook SDK, AppsFlyer, or any ad network, it MUST ask for permission to track the user across other apps.

* **Tracking Usage Description:** Look for `NSUserTrackingUsageDescription` in the `infoPlist`.
* **Implementation (Heuristic):** Check `package.json` for `expo-tracking-transparency` or ad-related SDKs.
  * *Action:* If tracking SDKs exist but ATT strings/plugins are missing, issue a `[FAIL]`. If ATT is configured, issue a `[WARN]` reminding the developer that the ATT prompt must be shown *before* initializing the tracking SDKs in the codebase.

## 4. Minimum Deployment Target
* **Validation:** Check `expo.ios.infoPlist` or `expo-build-properties` for the iOS deployment target. For 2026 standards, targeting anything below iOS 15.1 is highly discouraged and limits the use of modern SwiftUI/Fabric components.
  * *Action:* If the target is implicitly or explicitly below iOS 15.1, issue a `[WARN]`. Suggest adding `{"plugin": ["expo-build-properties", {"ios": {"deploymentTarget": "15.1"}}]}` to `app.json`.

## 5. Universal Links (Associated Domains)
If the app uses deep linking (`expo.scheme`), it might also use Universal Links.
* **Validation:** Check if `expo.ios.associatedDomains` is configured.
  * *Action:* If configured, issue a `[PASS]` but add a `[WARN]` reminding the user that the `apple-app-site-association` (AASA) file must be deployed and valid on their web server before submitting to Apple.

---
**Agent Instruction:** After reading this file, compile your analysis based on the user's codebase. Do not output the rules themselves; output only the results of your audit against the user's project.