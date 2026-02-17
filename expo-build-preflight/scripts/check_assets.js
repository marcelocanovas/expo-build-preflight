#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const appJsonPath = process.argv[2] || path.join(process.cwd(), 'app.json');
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

// Attempt to load 'image-size'. If not available, we skip dimension checks.
let sizeOf;
try {
  sizeOf = require('image-size');
} catch (e) {
  logStatus('[WARN]', "The 'image-size' package is not installed. File dimensions will not be checked. Run 'npm install --save-dev image-size' for full validation.");
}

function checkFileExistence(filePath, name) {
  const fullPath = path.join(process.cwd(), filePath);
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
      logStatus('[PASS]', `[${name}] Dimensions are correct (${requiredWidth}x${requiredHeight}).`);
    }
  } catch (e) {
    logStatus('[FAIL]', `[${name}] Could not parse image dimensions. Ensure it is a valid image file. Error: ${e.message}`);
  }
}

function run() {
  console.log('--- Validating Expo Assets ---\n');

  if (!fs.existsSync(appJsonPath)) {
    logStatus('[FAIL]', `app.json not found at ${appJsonPath}`);
    process.exit(1);
  }

  const appJsonRaw = fs.readFileSync(appJsonPath, 'utf-8');
  let appJson;
  try {
    appJson = JSON.parse(appJsonRaw);
  } catch (e) {
    logStatus('[FAIL]', 'Invalid app.json format.');
    process.exit(1);
  }

  const expo = appJson.expo;
  if (!expo) {
    logStatus('[FAIL]', 'Missing "expo" object in app.json.');
    process.exit(1);
  }

  // 1. General Icon
  if (expo.icon) {
    const iconPath = checkFileExistence(expo.icon, 'Global Icon');
    checkDimensions(iconPath, 'Global Icon', 1024, 1024);
  } else {
    logStatus('[FAIL]', 'Missing global "icon" in app.json.');
  }

  // 2. Splash Screen
  if (expo.splash && expo.splash.image) {
    checkFileExistence(expo.splash.image, 'Splash Screen');
  } else {
    logStatus('[WARN]', 'No custom splash screen image configured.');
  }

  // 3. Android Adaptive Icon
  const androidIcon = expo.android?.adaptiveIcon;
  if (androidIcon) {
    if (androidIcon.foregroundImage) {
      const fgPath = checkFileExistence(androidIcon.foregroundImage, 'Android Foreground Image');
      checkDimensions(fgPath, 'Android Foreground Image', 1024, 1024);
    } else {
      logStatus('[WARN]', 'Missing foregroundImage for Android adaptive icon.');
    }

    if (androidIcon.backgroundColor) {
      logStatus('[PASS]', `Android Adaptive Icon background color is set: ${androidIcon.backgroundColor}`);
    } else if (androidIcon.backgroundImage) {
      const bgPath = checkFileExistence(androidIcon.backgroundImage, 'Android Background Image');
      checkDimensions(bgPath, 'Android Background Image', 1024, 1024);
    } else {
      logStatus('[FAIL]', 'Android Adaptive Icon requires either a backgroundColor or a backgroundImage to prevent transparency issues (black backgrounds).');
    }
  } else {
    logStatus('[WARN]', 'No Android adaptiveIcon configured. The app will use the default square/circle crop.');
  }

  // 4. iOS Icon (Usually falls back to global icon, but checking if specific one exists)
  if (expo.ios?.icon) {
    const iosPath = checkFileExistence(expo.ios.icon, 'iOS Specific Icon');
    checkDimensions(iosPath, 'iOS Specific Icon', 1024, 1024);
  }

  console.log('\n----------------------------------------');
  if (hasFails) {
    console.error('\x1b[31m[!] Asset validation failed. Please fix the [FAIL] issues above.\x1b[0m\n');
    process.exit(1);
  } else {
    console.log('\x1b[32m[✓] Asset preflight completed successfully.\x1b[0m\n');
    process.exit(0);
  }
}

run();