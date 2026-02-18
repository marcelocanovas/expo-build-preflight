#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// We still take eas.json from args if needed, but app config is resolved by Expo CLI
const easJsonPath = process.argv[3] || path.join(process.cwd(), 'eas.json');

let hasFails = false;

function logStatus(status, message) {
  const colorMap = {
    '[PASS]': '\x1b[32m[PASS]\x1b[0m',
    '[WARN]': '\x1b[33m[WARN]\x1b[0m',
    '[FAIL]': '\x1b[31m[FAIL]\x1b[0m'
  };
  console.log(`${colorMap[status] || status} ${message}`);
  if (status === '[FAIL]') hasFails = true;
}

function checkLevelZeroPointFive() {
  console.log('\n--- Level 0.5: Environment Validation ---');
  if (!fs.existsSync('package.json')) {
     logStatus('[FAIL]', 'package.json not found. Are you in the right directory?');
     process.exit(1);
  }

  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
  if (!pkg.dependencies || !pkg.dependencies.expo) {
     logStatus('[FAIL]', 'This does not appear to be an Expo project. Missing "expo" in dependencies.');
     process.exit(1);
  }
  logStatus('[PASS]', 'Expo project detected (found "expo" in dependencies).');

  if (!fs.existsSync('node_modules')) {
     logStatus('[FAIL]', 'node_modules not found. Please run npm/yarn/bun install before running the preflight check.');
     process.exit(1);
  }
  logStatus('[PASS]', 'node_modules directory found.');
}

function getResolvedExpoConfig() {
  console.log('\n--- Resolving Expo Configuration ---');
  try {
    // This evaluates app.json, app.config.js, or app.config.ts natively
    const stdout = execSync('npx expo config --json', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
    const parsed = JSON.parse(stdout);

    if (!parsed.exp) throw new Error('Could not find "exp" object in compiled config.');
    logStatus('[PASS]', 'Configuration evaluated successfully (supports app.config.js/ts).');
    return { expo: parsed.exp };
  } catch (e) {
    logStatus('[FAIL]', 'Failed to evaluate Expo config. Ensure your app.config.js has no syntax errors.');
    process.exit(1);
  }
}

function validateAppJson(appJson) {
  console.log('\n--- Validating Config Rules ---');
  const expo = appJson.expo;

  // 1. Identifiers
  const androidPackage = expo.android?.package;
  const iosBundle = expo.ios?.bundleIdentifier;
  const invalidDomainRegex = /^(com|br)\.(example|test|demo)\./i;

  if (!androidPackage) logStatus('[FAIL]', 'Missing android.package.');
  else if (invalidDomainRegex.test(androidPackage)) logStatus('[FAIL]', `Invalid/test android.package: ${androidPackage}`);
  else logStatus('[PASS]', `Valid android.package: ${androidPackage}`);

  if (!iosBundle) logStatus('[FAIL]', 'Missing ios.bundleIdentifier.');
  else if (invalidDomainRegex.test(iosBundle)) logStatus('[FAIL]', `Invalid/test ios.bundleIdentifier: ${iosBundle}`);
  else logStatus('[PASS]', `Valid ios.bundleIdentifier: ${iosBundle}`);

  // 2. Scheme (Deep Linking) - RESTORED
  if (!expo.scheme) {
    logStatus('[WARN]', 'Missing "scheme" property. Deep links/OAuth might not work.');
  } else {
    logStatus('[PASS]', `Scheme configured: ${expo.scheme}`);
  }

  // 3. Runtime Version
  const runtimeVersion = expo.runtimeVersion;
  if (!runtimeVersion) {
    logStatus('[WARN]', 'Missing "runtimeVersion". Required if using EAS Update.');
  } else if (typeof runtimeVersion === 'object' && runtimeVersion.policy === 'fingerprint') {
    logStatus('[PASS]', 'runtimeVersion configured with fingerprint policy.');
  } else {
    logStatus('[WARN]', `runtimeVersion configured as "${JSON.stringify(runtimeVersion)}". Prefer {"policy": "fingerprint"}.`);
  }

  // 4. Android Target SDK
  const targetSdk = expo.android?.targetSdkVersion;
  if (!targetSdk) {
    logStatus('[WARN]', 'targetSdkVersion not explicitly set. Expo will use the SDK default.');
  } else if (targetSdk < 35) {
    logStatus('[FAIL]', `targetSdkVersion is ${targetSdk}. API 35+ is mandatory per recent Play Store rules.`);
  } else {
    logStatus('[PASS]', `Valid targetSdkVersion: ${targetSdk}`);
  }

  // 5. New Architecture - RESTORED
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

  if (prodProfile.autoIncrement !== true) {
    logStatus('[FAIL]', 'build.production.autoIncrement is not set to true. Builds might overwrite existing versions.');
  } else {
    logStatus('[PASS]', 'autoIncrement is active in the production profile.');
  }

  const envVars = prodProfile.env || {};
  if (Object.keys(envVars).length === 0) {
    logStatus('[WARN]', 'No environment variables (env) detected in the production profile.');
  } else {
    logStatus('[PASS]', `Environment variables detected: ${Object.keys(envVars).join(', ')}`);
  }
}

function checkLevelZeroBasics(appJson) {
  console.log('\n--- Level 0: Foundation Checks ---');

  if (!fs.existsSync(easJsonPath)) {
    logStatus('[FAIL]', 'eas.json not found! You must run "eas build:configure" first.');
    process.exit(1);
  } else {
    logStatus('[PASS]', 'eas.json exists.');
  }

  const projectId = appJson.expo?.extra?.eas?.projectId;
  if (!projectId) {
    logStatus('[FAIL]', 'Missing expo.extra.eas.projectId. You must run "eas init" to link this project.');
  } else {
    logStatus('[PASS]', `Project linked to EAS (ID: ${projectId}).`);
  }

  const lockfiles = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb'];
  if (!lockfiles.some(file => fs.existsSync(path.join(process.cwd(), file)))) {
    logStatus('[FAIL]', 'No lockfile found. Cloud builds will be unpredictable.');
  } else {
    logStatus('[PASS]', 'Lockfile detected.');
  }

  try {
    if (execSync('git status --porcelain').toString().trim().length > 0) {
      logStatus('[WARN]', 'You have uncommitted Git changes. EAS uploads committed code by default!');
    } else {
      logStatus('[PASS]', 'Git working tree is clean.');
    }
  } catch (e) {
    logStatus('[WARN]', 'Could not check Git status.');
  }
}

function run() {
  console.log('Starting Expo Build Preflight...\n');

  checkLevelZeroPointFive();

  // This replaces fs.readFileSync(appJsonPath)
  const appJson = getResolvedExpoConfig();

  checkLevelZeroBasics(appJson);
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