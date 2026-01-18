#!/usr/bin/env node
/**
 * Package Chrome extension into .zip file
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.join(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const manifestPath = path.join(rootDir, 'manifest.json');

try {
  // Read manifest to get version
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const version = manifest.version;
  const name = manifest.name.replace(/\s+/g, '-').toLowerCase();

  console.log(`📦 Packaging ${manifest.name} v${version}...`);

  // Create dist directory if it doesn't exist
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  const zipFileName = `${name}-v${version}.zip`;
  const zipFilePath = path.join(distDir, zipFileName);

  // Remove old zip if exists
  if (fs.existsSync(zipFilePath)) {
    fs.unlinkSync(zipFilePath);
    console.log(`🗑️  Removed old package: ${zipFileName}`);
  }

  // Files to include in the package
  const filesToInclude = [
    'manifest.json',
    '*.js',
    '*.html',
    '*.css',
    'icons/*'
  ];

  // Create zip file using native zip command
  console.log('📁 Creating zip archive...');
  
  const zipCommand = `cd "${rootDir}" && zip -r "${zipFilePath}" ${filesToInclude.join(' ')} -x "*.git*" "node_modules/*" "dist/*" "scripts/*" "docs/*" "*.md" "package*.json" ".eslintrc.json"`;
  
  execSync(zipCommand, { stdio: 'inherit' });

  // Get file size
  const stats = fs.statSync(zipFilePath);
  const fileSizeInBytes = stats.size;
  const fileSizeInKB = (fileSizeInBytes / 1024).toFixed(2);

  console.log(`\n✅ Package created successfully!`);
  console.log(`   📦 File: ${zipFileName}`);
  console.log(`   📏 Size: ${fileSizeInKB} KB`);
  console.log(`   📍 Location: ${zipFilePath}`);

} catch (error) {
  console.error('❌ Error packaging extension:', error.message);
  process.exit(1);
}
