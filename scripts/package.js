#!/usr/bin/env node

/**
 * scripts/package.js - Cross-platform packaging script for Session Saver
 *
 * Packages the contents of the `src/` directory into `session-saver.zip` at the
 * project root for Chrome Web Store distribution.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as archiverModule from 'archiver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const defaultSrcDir = path.join(projectRoot, 'src');
const defaultManifestPath = path.join(defaultSrcDir, 'manifest.json');
const defaultOutputPath = path.join(projectRoot, 'session-saver.zip');

/**
 * Creates an archiver instance compatible with both v8 class-based
 * and v7 function-based archiver exports.
 *
 * @param {Object} options
 * @returns {archiverModule.ZipArchive|Object}
 */
export function createZipArchive(options = {}) {
  if (typeof archiverModule.ZipArchive === 'function') {
    return new archiverModule.ZipArchive(options);
  }
  if (typeof archiverModule.default === 'function') {
    return archiverModule.default('zip', options);
  }
  if (typeof archiverModule === 'function') {
    return archiverModule('zip', options);
  }
  throw new Error('Unable to initialize archiver: module export format unknown');
}

/**
 * Packages the Chrome extension src directory into a zip archive.
 *
 * @param {Object} [options]
 * @param {string} [options.src] - Source directory to package.
 * @param {string} [options.dest] - Destination zip file path.
 * @param {string} [options.manifest] - Path to manifest.json.
 * @returns {Promise<{ name: string, version: string, fileCount: number, sizeBytes: number, outputPath: string }>}
 */
export async function packageExtension(options = {}) {
  const source = options.src || defaultSrcDir;
  const destination = options.dest || defaultOutputPath;
  const manifestFile = options.manifest || defaultManifestPath;

  // Validate that manifest.json exists before creating the archive
  if (!fs.existsSync(manifestFile)) {
    throw new Error(`Manifest file missing: ${manifestFile}`);
  }

  let manifestData;
  try {
    const raw = fs.readFileSync(manifestFile, 'utf8');
    manifestData = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Failed to parse manifest.json: ${err.message}`);
  }

  const extensionName = manifestData.name || 'Session Saver';
  const extensionVersion = manifestData.version || 'unknown';

  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(destination);
    const archive = createZipArchive({
      zlib: { level: 9 }, // Maximum compression
    });

    let fileCount = 0;

    output.on('close', () => {
      resolve({
        name: extensionName,
        version: extensionVersion,
        fileCount,
        sizeBytes: archive.pointer(),
        outputPath: destination,
      });
    });

    output.on('error', (err) => {
      reject(err);
    });

    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        console.warn('Archiver warning:', err);
      } else {
        reject(err);
      }
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.on('entry', (entry) => {
      if (!entry.name.endsWith('/')) {
        fileCount += 1;
      }
    });

    // Pipe archive output
    archive.pipe(output);

    // Recursively add all files from src/ with forward slashes at zip root
    function addDirectory(currentDir, relativePrefix = '') {
      const items = fs.readdirSync(currentDir);

      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        const entryName = relativePrefix ? `${relativePrefix}/${item}` : item;

        if (stat.isDirectory()) {
          addDirectory(fullPath, entryName);
        } else if (stat.isFile()) {
          // Guarantee forward slashes in all zip entry paths across OS platforms
          const normalizedName = entryName.replace(/\\/g, '/');
          archive.file(fullPath, { name: normalizedName });
        }
      }
    }

    addDirectory(source);
    archive.finalize();
  });
}

// Auto-run when executed directly via CLI
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  if (!fs.existsSync(defaultManifestPath)) {
    console.error(`Error: Missing manifest.json at ${defaultManifestPath}`);
    process.exit(1);
  }

  try {
    const result = await packageExtension();
    const sizeKb = (result.sizeBytes / 1024).toFixed(2);

    console.log('Package created successfully:');
    console.log(`  Name:       ${result.name}`);
    console.log(`  Version:    ${result.version}`);
    console.log(`  Files:      ${result.fileCount}`);
    console.log(`  Zip Size:   ${sizeKb} KB (${result.sizeBytes} bytes)`);
    console.log(`  Output:     ${path.relative(projectRoot, result.outputPath)}`);
  } catch (err) {
    console.error(`Packaging failed: ${err.message}`);
    process.exit(1);
  }
}
