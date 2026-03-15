'use strict';

const fs = require('fs');
const path = require('path');
const { ensureDir, writeJsonFile, readJsonFile, isObject } = require('./utils');

function writeManifest(manifestPath, manifest) {
  ensureDir(path.dirname(manifestPath));
  writeJsonFile(manifestPath, manifest);
}

function readManifest(manifestPath, warningFn) {
  if (!fs.existsSync(manifestPath)) {
    return null;
  }
  const manifest = readJsonFile(manifestPath, `manifest at ${manifestPath}`, warningFn);
  if (!manifest || !isObject(manifest)) {
    return null;
  }
  return manifest;
}

function removeIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return false;
  }
  fs.unlinkSync(filePath);
  return true;
}

module.exports = {
  writeManifest,
  readManifest,
  removeIfExists,
};
