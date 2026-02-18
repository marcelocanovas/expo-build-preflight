#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const easJsonPath = process.argv[3] || path.join(process.cwd(), 'eas.json');
let hasFails = false;

function logStatus(status, message) {
  const colorMap = { '[PASS]': '\x1b[32m[PASS]\x1b[0m', '[WARN]': '\x1b[33m[WARN]\x1b[0m', '[FAIL]': '\x1b[31m[FAIL]\x1b[0m' };
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
     logStatus('[FAIL]', 'node_modules not found. Run npm/yarn/bun install.');
     process.exit(1);
  }
  logStatus('[PASS]', 'node_modules directory found.');
}

function getResolvedExpoConfig() {
  console.log('\n--- Resolving Expo Configuration ---');
  try {
    const stdout = execSync('npx expo config --json', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
    const parsed = JSON.parse(stdout);
    
    // SDK 54 outputs directly. Older versions wrapped in 'exp'. We support both.
    const expoConfig = parsed.exp || parsed;
    
    if (!expoConfig || !expoConfig.slug) throw new Error('Could not parse configuration.');
    logStatus('[PASS]', 'Configuration evaluated successfully.');
    return { expo: expoConfig };
  } catch (e) {
    logStatus('[FAIL]', 'Failed to evaluate Expo config. Ensure your app.config.js has no syntax errors.');
    process.exit(1);
  }
}

function validateAppJson(appJson) {
  console.log('\n--- Validating Config Rules ---');
  const expo = appJson.expo;

  const androidPackage = expo.android?.package;
  const iosBundle = expo.ios?.bundleIdentifier;
  const invalidDomainRegex = /^(com|br)\.(example|test|demo)\./i;

  if (!androidPackage) logStatus('[FAIL]', 'Missing android.package.');
  else if (invalidDomainRegex.test(androidPackage)) logStatus('[FAIL]', `Invalid android.package: ${androidPackage}`);
  else logStatus('[PASS]', `Valid android.package: ${androidPackage}`);

  if (!iosBundle) logStatus('[FAIL]', 'Missing ios.bundleIdentifier.');
  else if (invalidDomainRegex.test(iosBundle)) logStatus('[FAIL]', `Invalid ios.bundleIdentifier: ${iosBundle}`);
  else logStatus('[PASS]', `Valid ios.bundleIdentifier: ${iosBundle}`);

  if (!expo.scheme) logStatus('[WARN]', 'Missing "scheme" property.');
  else logStatus('[PASS]', `Scheme configured: ${expo.scheme}`);

  const runtimeVersion = expo.runtimeVersion;
  if (!runtimeVersion) logStatus('[WARN]', 'Missing "runtimeVersion".');
  else if (typeof runtimeVersion === 'object' && runtimeVersion.policy === 'fingerprint') logStatus('[PASS]', 'runtimeVersion uses fingerprint policy.');
  else logStatus('[WARN]', `Prefer {"policy": "fingerprint"} for runtimeVersion.`);

  const targetSdk = expo.android?.targetSdkVersion;
  if (!targetSdk) logStatus('[FAIL]', 'targetSdkVersion is missing. API 35 is mandatory.');
  else if (targetSdk < 35) logStatus('[FAIL]', `targetSdkVersion is ${targetSdk}. API 35 is mandatory.`);
  else logStatus('[PASS]', `Valid targetSdkVersion: ${targetSdk}`);

  if (expo.newArchEnabled === false) logStatus('[WARN]', 'newArchEnabled is false. Fabric is recommended in SDK 55+.');
  else logStatus('[PASS]', 'New Architecture not disabled.');
}

function validateEasJson(easJson) {
  console.log('\n--- Validating eas.json ---');
  const prodProfile = easJson?.build?.production;

  if (!prodProfile) {
    logStatus('[FAIL]', '"build.production" profile not found in eas.json.');
    return;
  }
  if (prodProfile.autoIncrement !== true) logStatus('[FAIL]', 'build.production.autoIncrement is not true.');
  else logStatus('[PASS]', 'autoIncrement is active in production.');

  const envVars = prodProfile.env || {};
  if (Object.keys(envVars).length === 0) logStatus('[WARN]', 'No env variables detected in production profile.');
  else logStatus('[PASS]', `Environment variables detected: ${Object.keys(envVars).join(', ')}`);
}

function checkLevelZeroBasics(appJson) {
  console.log('\n--- Level 0: Foundation Checks ---');
  if (!fs.existsSync(easJsonPath)) {
    logStatus('[FAIL]', 'eas.json not found!');
    process.exit(1);
  } else logStatus('[PASS]', 'eas.json exists.');

  const projectId = appJson.expo?.extra?.eas?.projectId;
  if (!projectId) logStatus('[FAIL]', 'Missing expo.extra.eas.projectId.');
  else logStatus('[PASS]', `Project linked to EAS (ID: ${projectId}).`);

  const lockfiles = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb'];
  if (!lockfiles.some(f => fs.existsSync(path.join(process.cwd(), f)))) logStatus('[FAIL]', 'No lockfile found.');
  else logStatus('[PASS]', 'Lockfile detected.');
}

function run() {
  console.log('Starting Expo Build Preflight...\n');
  checkLevelZeroPointFive();
  const appJson = getResolvedExpoConfig();
  checkLevelZeroBasics(appJson);
  validateAppJson(appJson);

  try {
    const easJsonRaw = fs.readFileSync(easJsonPath, 'utf-8');
    validateEasJson(JSON.parse(easJsonRaw));
  } catch (e) {
    logStatus('[FAIL]', `Error reading eas.json: ${e.message}`);
  }

  console.log('\n----------------------------------------');
  if (hasFails) {
    console.error('\x1b[31m[!] Preflight failed. Fix errors above.\x1b[0m\n');
    process.exit(1);
  } else {
    console.log('\x1b[32m[✓] Preflight successful.\x1b[0m\n');
    process.exit(0);
  }
}
run();
