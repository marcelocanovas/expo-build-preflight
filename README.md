# Expo Production Preflight Skill 🚀

A modular and deterministic AI Skill for **Expo & React Native** developers to audit their projects before running `eas build --profile production`.

This tool acts as a "Quality Gate" to prevent wasted build time and avoid common Apple App Store and Google Play Store rejections in 2026.

## Why Use This?
Building for production is expensive (in time and credits). Small mistakes—like missing privacy strings, legacy API levels, or transparent Android icons—can lead to instant rejections. This Skill provides:
- **Deterministic Validation:** Fast Node.js scripts to check your JSON configs and assets.
- **Expert Knowledge:** Contextual rules for iOS 19+, Android 15 (API 35), and 16KB Page Size compliance.
- **Security Audit:** Ensures secrets aren't leaked and Firebase/Sentry are properly configured.

## 📂 Structure
- `SKILL.md`: The primary workflow and trigger for AI Agents.
- `AGENTS.md`: Guiding principles and identity for the AI assistant.
- `scripts/`: Local validation scripts (JSON & Asset checking).
- `references/`: Detailed platform rules (iOS, Android, Third-Party services).
- `dist/`: The packaged `.skill` file for easy distribution.

## 🛠️ Installation & Usage

## For Humans
If you want to run the pre-flight checks manually:

1. **Clone the repo** into your project or copy the `scripts` folder.
2. **Run Configuration Check:**
```bash
   node scripts/validate_expo_config.js
```
3. Run Asset Check:
```bash
# (Optional) Install image-size for dimension validation
npm install --save-dev image-size
node scripts/check_assets.js
```

## For AI Agents (Claude / Gemini / GPTs)
Point your agent to this repository. The agent will read SKILL.md and follow the instructions to perform the audit on your behalf.

# Packaging
If you modify the skill and want to re-package it, use the provided Python script:

python package_skill.py expo-build-preflight expo-build-preflight
Core Checks Included
[x] Level 0: eas.json existence, Project ID linking, and Git status.
[x] Android: API 35 compliance, 16KB Page Size, FCM v1, and permission audits.
[x] iOS: Privacy Manifests (PrivacyInfo.xcprivacy), Info.plist strings, and Target 15.1.
[x] Assets: Icon dimensions (1024x1024) and Android transparency guardrails.
[x] DevOps: EAS Secrets injection for Firebase and Sentry source maps.

# License
MIT

# Contributing
Found a new 2026 App Store requirement? Open a PR and update the files in references/