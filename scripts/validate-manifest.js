#!/usr/bin/env node
/**
 * Validate manifest.json structure
 */
const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, '..', 'manifest.json');

try {
  // Read and parse manifest.json
  const manifestContent = fs.readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(manifestContent);

  console.log('Validating manifest.json...');

  // Required fields for Manifest V3
  const requiredFields = [
    'manifest_version',
    'name',
    'version',
    'description'
  ];

  let isValid = true;
  for (const field of requiredFields) {
    if (!manifest[field]) {
      console.error(`❌ Missing required field: ${field}`);
      isValid = false;
    } else {
      console.log(`✓ ${field}: ${manifest[field]}`);
    }
  }

  // Check manifest version
  if (manifest.manifest_version !== 3) {
    console.error('❌ manifest_version must be 3');
    isValid = false;
  }

  // Validate version format (semver - basic check)
  const versionRegex = /^\d+\.\d+\.\d+(-[\w.]+)?(\+[\w.]+)?$/;
  if (!versionRegex.test(manifest.version)) {
    console.error('❌ Version must follow semver format (e.g., 1.0.0, 1.0.0-beta, 1.0.0+build)');
    isValid = false;
  }

  // Check for required permissions
  if (manifest.permissions && Array.isArray(manifest.permissions)) {
    console.log(`✓ Permissions: ${manifest.permissions.join(', ')}`);
  }

  // Validate icons exist
  if (manifest.icons) {
    for (const [size, iconPath] of Object.entries(manifest.icons)) {
      const fullPath = path.join(__dirname, '..', iconPath);
      if (!fs.existsSync(fullPath)) {
        console.error(`❌ Icon file not found: ${iconPath}`);
        isValid = false;
      } else {
        console.log(`✓ Icon ${size}: ${iconPath}`);
      }
    }
  }

  // Validate content scripts
  if (manifest.content_scripts) {
    for (const script of manifest.content_scripts) {
      if (script.js) {
        for (const jsFile of script.js) {
          const fullPath = path.join(__dirname, '..', jsFile);
          if (!fs.existsSync(fullPath)) {
            console.error(`❌ Content script not found: ${jsFile}`);
            isValid = false;
          } else {
            console.log(`✓ Content script: ${jsFile}`);
          }
        }
      }
    }
  }

  // Validate background service worker
  if (manifest.background && manifest.background.service_worker) {
    const swPath = path.join(__dirname, '..', manifest.background.service_worker);
    if (!fs.existsSync(swPath)) {
      console.error(`❌ Service worker not found: ${manifest.background.service_worker}`);
      isValid = false;
    } else {
      console.log(`✓ Service worker: ${manifest.background.service_worker}`);
    }
  }

  // Validate action popup
  if (manifest.action && manifest.action.default_popup) {
    const popupPath = path.join(__dirname, '..', manifest.action.default_popup);
    if (!fs.existsSync(popupPath)) {
      console.error(`❌ Popup HTML not found: ${manifest.action.default_popup}`);
      isValid = false;
    } else {
      console.log(`✓ Popup HTML: ${manifest.action.default_popup}`);
    }
  }

  if (isValid) {
    console.log('\n✅ Manifest validation passed!');
    process.exit(0);
  } else {
    console.log('\n❌ Manifest validation failed!');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Error validating manifest:', error.message);
  process.exit(1);
}
