#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Default paths (can be passed via terminal arguments)
const appJsonPath = process.argv[2] || path.join(process.cwd(), 'app.json');
const easJsonPath = process.argv[3] || path.join(process.cwd(), 'eas.json');

let hasFails = false;

function logStatus(status, message) {
  const colorMap = {
    '[PASS]': '\x1b[32m[PASS]\x1b[0m', // Green
    '[WARN]': '\x1b[33m[WARN]\x1b[0m', // Yellow
    '[FAIL]': '\x1b[31m[FAIL]\x1b[0m'  // Red
  };
  console.log(`${colorMap[status] || status} ${message}`);
  if (status === '[FAIL]') hasFails = true;
}

function validateAppJson(appJson) {
  console.log('\n--- Validating app.json ---');
  const expo = appJson.expo;

  if (!expo) {
    logStatus('[FAIL]', "'expo' object not found in app.json.");
    return;
  }

  // 1. Identifiers (Bundle ID / Package Name)
  const androidPackage = expo.android?.package;
  const iosBundle = expo.ios?.bundleIdentifier;
  const invalidDomainRegex = /^(com|br)\.(example|test|demo)\./i;

  if (!androidPackage) logStatus('[FAIL]', 'Missing android.package.');
  else if (invalidDomainRegex.test(androidPackage)) logStatus('[FAIL]', `Invalid/test android.package: ${androidPackage}`);
  else logStatus('[PASS]', `Valid android.package: ${androidPackage}`);

  if (!iosBundle) logStatus('[FAIL]', 'Missing ios.bundleIdentifier.');
  else if (invalidDomainRegex.test(iosBundle)) logStatus('[FAIL]', `Invalid/test ios.bundleIdentifier: ${iosBundle}`);
  else logStatus('[PASS]', `Valid ios.bundleIdentifier: ${iosBundle}`);

  // 2. Scheme (Deep Linking)
  if (!expo.scheme) logStatus('[WARN]', 'Missing "scheme" property. Deep links/OAuth might not work.');
  else logStatus('[PASS]', `Scheme configured: ${expo.scheme}`);

  // 3. Runtime Version (OTA Updates)
  const runtimeVersion = expo.runtimeVersion;
  if (!runtimeVersion) {
    logStatus('[WARN]', 'Missing "runtimeVersion". Required if using EAS Update.');
  } else if (typeof runtimeVersion === 'object' && runtimeVersion.policy === 'fingerprint') {
    logStatus('[PASS]', 'runtimeVersion configured with fingerprint policy.');
  } else {
    logStatus('[WARN]', `runtimeVersion configured as "${JSON.stringify(runtimeVersion)}". Prefer {"policy": "fingerprint"} for safer OTAs.`);
  }

  // 4. Android Target SDK (2026 Rules: API 35)
  const targetSdk = expo.android?.targetSdkVersion;
  if (!targetSdk) {
    logStatus('[WARN]', 'targetSdkVersion not explicitly set. Expo will use the SDK default.');
  } else if (targetSdk < 35) {
    logStatus('[FAIL]', `targetSdkVersion is ${targetSdk}. API 35+ is mandatory per recent Play Store rules.`);
  } else {
    logStatus('[PASS]', `Valid targetSdkVersion: ${targetSdk}`);
  }

  // 5. New Architecture
  if (expo.newArchEnabled === false) {
    logStatus('[WARN]', 'newArchEnabled is forced to false. Transitioning to Fabric/TurboModules is highly recommended in SDK 55+.');
  } else {
    logStatus('[PASS]', 'New Architecture (newArchEnabled) is not disabled.');
  }
}

function validateEasJson(easJson) {
  console.log('\n--- Validating eas.json ---');
  const prodProfile = easJson?.build?.production;

  if (!prodProfile) {
    logStatus('[FAIL]', '"build.production" profile not found in eas.json.');
    return;
  }

  // 1. Auto Increment
  if (prodProfile.autoIncrement !== true) {
    logStatus('[FAIL]', 'build.production.autoIncrement is not set to true. Builds might overwrite existing versions in the stores.');
  } else {
    logStatus('[PASS]', 'autoIncrement is active in the production profile.');
  }

  // 2. Environment Variables
  const envVars = prodProfile.env || {};
  if (Object.keys(envVars).length === 0) {
    logStatus('[WARN]', 'No environment variables (env) detected in the production profile. Ensure your base API is not pointing to localhost/staging.');
  } else {
    logStatus('[PASS]', `Environment variables detected: ${Object.keys(envVars).join(', ')}`);
  }
}

function checkLevelZeroBasics(appJson) {
  console.log('\n--- Level 0: Foundation Checks ---');

  // 1. EAS JSON Existence
  if (!fs.existsSync(easJsonPath)) {
    logStatus('[FAIL]', 'eas.json not found! You must run "eas build:configure" first.');
    // We stop immediately here because we can't proceed without it.
    console.error('\x1b[31m[!] Critical failure. Run "eas build:configure" and try again.\x1b[0m\n');
    process.exit(1);
  } else {
    logStatus('[PASS]', 'eas.json exists.');
  }

  // 2. Project ID Existence
  const projectId = appJson.expo?.extra?.eas?.projectId;
  if (!projectId) {
    logStatus('[FAIL]', 'Missing expo.extra.eas.projectId in app.json. You must run "eas init" to link this project to Expo.');
  } else {
    logStatus('[PASS]', `Project linked to EAS (ID: ${projectId}).`);
  }

  // 3. Lockfile Existence
  const lockfiles = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb'];
  const hasLockfile = lockfiles.some(file => fs.existsSync(path.join(process.cwd(), file)));
  if (!hasLockfile) {
    logStatus('[FAIL]', 'No lockfile found (package-lock.json, yarn.lock, etc.). Cloud builds will be unpredictable. Please generate and commit a lockfile.');
  } else {
    logStatus('[PASS]', 'Lockfile detected.');
  }

  // 4. Git Working Tree Status
  try {
    const gitStatus = execSync('git status --porcelain').toString().trim();
    if (gitStatus.length > 0) {
      logStatus('[WARN]', 'You have uncommitted Git changes. EAS Build uploads your committed code by default. Uncommitted changes might not be included in the build!');
    } else {
      logStatus('[PASS]', 'Git working tree is clean.');
    }
  } catch (e) {
    logStatus('[WARN]', 'Could not check Git status. Ensure you are in a valid Git repository.');
  }
}

function checkLevelZeroPointFive() {
  console.log('\n--- Level 0.5: Environment Validation ---');
  // 1. Check package.json
  if (!fs.existsSync('package.json')) {
     logStatus('[FAIL]', 'package.json not found. Are you in the right directory?');
     process.exit(1);
  }

  // 2. Check for Expo
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
  if (!pkg.dependencies || !pkg.dependencies.expo) {
     logStatus('[FAIL]', 'This does not appear to be an Expo project. Missing "expo" in dependencies.');
     process.exit(1);
  }
  logStatus('[PASS]', 'Expo project detected (found "expo" in package.json dependencies).');

  // 3. Check for node_modules
  if (!fs.existsSync('node_modules')) {
     logStatus('[FAIL]', 'node_modules not found. Please run npm/yarn/bun install before running the preflight check.');
     process.exit(1);
  }
  logStatus('[PASS]', 'node_modules directory found.');
}

function run() {
  console.log('Starting Expo Build Preflight...\n');

  checkLevelZeroPointFive();

  // Load app.json first so we can pass it to the Level 0 checks
  let appJson;
  try {
    const appJsonRaw = fs.readFileSync(appJsonPath, 'utf-8');
    appJson = JSON.parse(appJsonRaw);
  } catch (e) {
    logStatus('[FAIL]', `Error reading ${appJsonPath}: ${e.message}`);
    process.exit(1);
  }

  // Run the new Level 0 checks
  checkLevelZeroBasics(appJson);

  // Run the platform configurations we wrote earlier
  validateAppJson(appJson);

  try {
    const easJsonRaw = fs.readFileSync(easJsonPath, 'utf-8');
    const easJson = JSON.parse(easJsonRaw);
    validateEasJson(easJson);
  } catch (e) {
    logStatus('[FAIL]', `Error reading ${easJsonPath}: ${e.message}`);
  }

  console.log('\n----------------------------------------');
  if (hasFails) {
    console.error('\x1b[31m[!] Preflight failed. Fix the [FAIL] errors above before running the build.\x1b[0m\n');
    process.exit(1);
  } else {
    console.log('\x1b[32m[✓] Configuration preflight completed successfully.\x1b[0m\n');
    process.exit(0);
  }
}

run();