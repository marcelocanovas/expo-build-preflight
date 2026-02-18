#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

let hasFails = false;

function logStatus(status, message) {
  const colorMap = { '[PASS]': '\x1b[32m[PASS]\x1b[0m', '[WARN]': '\x1b[33m[WARN]\x1b[0m', '[FAIL]': '\x1b[31m[FAIL]\x1b[0m' };
  console.log(`${colorMap[status] || status} ${message}`);
  if (status === '[FAIL]') hasFails = true;
}

let sizeOf;
try {
  sizeOf = require('image-size');
} catch (e) {
  logStatus('[WARN]', "The 'image-size' package is not installed. File dimensions will not be checked.");
}

function checkFileExistence(filePath, name) {
  // Paths from config are relative to project root
  const fullPath = path.join(process.cwd(), filePath.replace(/^\.\//, ''));
  if (!fs.existsSync(fullPath)) {
    logStatus('[FAIL]', `[${name}] File not found at path: ${filePath}`);
    return null;
  }
  logStatus('[PASS]', `[${name}] File exists: ${filePath}`);
  return fullPath;
}

function checkDimensions(filePath, name, requiredWidth, requiredHeight) {
  if (!sizeOf || !filePath) return;
  try {
    const dimensions = sizeOf(filePath);
    if (dimensions.width !== requiredWidth || dimensions.height !== requiredHeight) {
      logStatus('[FAIL]', `[${name}] Invalid dimensions. Expected ${requiredWidth}x${requiredHeight}, got ${dimensions.width}x${dimensions.height}.`);
    } else {
      logStatus('[PASS]', `[${name}] Dimensions correct (${requiredWidth}x${requiredHeight}).`);
    }
  } catch (e) {
    logStatus('[FAIL]', `[${name}] Could not parse dimensions. Error: ${e.message}`);
  }
}

function run() {
  console.log('--- Validating Expo Assets ---\n');

  let expo;
  try {
    const stdout = execSync('npx expo config --json', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
    const parsed = JSON.parse(stdout);
    expo = parsed.exp || parsed;
  } catch (e) {
    logStatus('[FAIL]', 'Failed to compile Expo config. Fix syntax errors in app.config.js first.');
    process.exit(1);
  }

  if (expo.icon) {
    const iconPath = checkFileExistence(expo.icon, 'Global Icon');
    checkDimensions(iconPath, 'Global Icon', 1024, 1024);
  } else logStatus('[FAIL]', 'Missing global "icon" in config.');

  if (expo.splash && expo.splash.image) {
    checkFileExistence(expo.splash.image, 'Splash Screen');
  } else logStatus('[WARN]', 'No custom splash screen image configured.');

  const androidIcon = expo.android?.adaptiveIcon;
  if (androidIcon) {
    if (androidIcon.foregroundImage) {
      const fgPath = checkFileExistence(androidIcon.foregroundImage, 'Android Foreground');
      checkDimensions(fgPath, 'Android Foreground', 1024, 1024);
    } else logStatus('[WARN]', 'Missing foregroundImage for Android adaptive icon.');

    if (androidIcon.backgroundColor) {
      logStatus('[PASS]', `Android Adaptive Icon background color: ${androidIcon.backgroundColor}`);
    } else if (androidIcon.backgroundImage) {
      const bgPath = checkFileExistence(androidIcon.backgroundImage, 'Android Background');
      checkDimensions(bgPath, 'Android Background', 1024, 1024);
    } else logStatus('[FAIL]', 'Android Adaptive Icon needs backgroundColor or backgroundImage.');
  }

  if (expo.ios?.icon) {
    const iosPath = checkFileExistence(expo.ios.icon, 'iOS Specific Icon');
    checkDimensions(iosPath, 'iOS Specific Icon', 1024, 1024);
  }

  console.log('\n----------------------------------------');
  if (hasFails) {
    console.error('\x1b[31m[!] Asset validation failed. Please fix issues above.\x1b[0m\n');
    process.exit(1);
  } else {
    console.log('\x1b[32m[✓] Asset preflight completed successfully.\x1b[0m\n');
    process.exit(0);
  }
}

run();
