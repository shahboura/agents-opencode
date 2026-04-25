#!/usr/bin/env node
'use strict';

/**
 * Documentation Link Validator
 * Finds all .md files and validates internal markdown links.
 * Optional mode: validate external http(s) links with retries/timeouts.
 */

const fs = require('fs');
const path = require('path');

// Colors for output (matches install.js pattern)
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_RETRIES = 1;
const EXTERNAL_ALLOWLIST_FILE = path.join(process.cwd(), 'scripts', 'external-link-allowlist.json');

function parseArgs(argv) {
  const options = {
    external: false,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    retries: DEFAULT_RETRIES,
    allowlist: false,
  };

  for (const arg of argv) {
    if (arg === '--external') {
      options.external = true;
      continue;
    }

    if (arg.startsWith('--timeout-ms=')) {
      const value = Number(arg.slice('--timeout-ms='.length));
      if (!Number.isFinite(value) || value <= 0) {
        throw new Error(`Invalid --timeout-ms value: ${arg}`);
      }
      options.timeoutMs = value;
      continue;
    }

    if (arg.startsWith('--retries=')) {
      const value = Number(arg.slice('--retries='.length));
      if (!Number.isInteger(value) || value < 0) {
        throw new Error(`Invalid --retries value: ${arg}`);
      }
      options.retries = value;
      continue;
    }

    if (arg === '--allowlist') {
      options.allowlist = true;
      continue;
    }
  }

  return options;
}

function loadExternalAllowlist(options) {
  if (!options.external || !options.allowlist) {
    return new Set();
  }

  if (!fs.existsSync(EXTERNAL_ALLOWLIST_FILE)) {
    return new Set();
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(EXTERNAL_ALLOWLIST_FILE, 'utf8'));
    const urls = Array.isArray(parsed.allowedFailureUrls) ? parsed.allowedFailureUrls : [];
    return new Set(urls.filter((url) => typeof url === 'string' && /^https?:\/\//i.test(url)));
  } catch (err) {
    throw new Error(`Could not parse external link allowlist: ${err.message}`);
  }
}

/**
 * Recursively find all .md files, excluding node_modules and .git directories.
 */
function findMarkdownFiles(dir) {
  const results = [];

  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'example') {
        continue;
      }
      results.push(...findMarkdownFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      results.push(fullPath);
    }
  }

  return results;
}

function extractMarkdownLinks(content) {
  const links = [];
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;

  for (const match of content.matchAll(linkRegex)) {
    links.push({
      text: match[1],
      target: match[2],
    });
  }

  return links;
}

function resolveInternalLink(rootDir, filePath, rawLinkPath) {
  const cleanPath = rawLinkPath.replace(/#.*$/, '');

  if (!cleanPath || cleanPath.trim() === '') {
    return { found: true };
  }

  let targetPath;
  if (cleanPath.startsWith('/')) {
    targetPath = path.join(rootDir, cleanPath.substring(1));
  } else {
    targetPath = path.join(path.dirname(filePath), cleanPath);
  }

  targetPath = path.resolve(targetPath);

  if (fs.existsSync(targetPath)) {
    return {
      found: true,
      targetPath,
    };
  }

  const ext = path.extname(targetPath);
  if (ext) {
    return {
      found: false,
      targetPath,
    };
  }

  const alternatives = [
    `${targetPath}.md`,
    path.join(targetPath, 'index.md'),
  ];

  for (const altPath of alternatives) {
    if (fs.existsSync(altPath)) {
      return {
        found: true,
        targetPath: altPath,
      };
    }
  }

  return {
    found: false,
    targetPath,
  };
}

function isExternalHttpLink(linkPath) {
  return /^https?:\/\//i.test(linkPath);
}

async function fetchOnce(url, method, timeoutMs) {
  const response = await fetch(url, {
    method,
    redirect: 'follow',
    signal: AbortSignal.timeout(timeoutMs),
    headers: method === 'GET' ? { Range: 'bytes=0-0' } : undefined,
  });

  if (response.ok) {
    return {
      ok: true,
      status: response.status,
      method,
      error: null,
    };
  }

  return {
    ok: false,
    status: response.status,
    method,
    error: null,
  };
}

async function validateExternalUrl(url, options) {
  const maxAttempts = options.retries + 1;
  let lastResult = {
    ok: false,
    status: null,
    method: null,
    error: 'Validation did not run',
  };

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const headResult = await fetchOnce(url, 'HEAD', options.timeoutMs);
      if (headResult.ok) {
        return {
          ...headResult,
          attempt,
        };
      }

      const getResult = await fetchOnce(url, 'GET', options.timeoutMs);
      if (getResult.ok) {
        return {
          ...getResult,
          attempt,
        };
      }

      lastResult = {
        ...getResult,
        attempt,
        error: `HTTP ${getResult.status}`,
      };
    } catch (err) {
      lastResult = {
        ok: false,
        status: null,
        method: null,
        attempt,
        error: err.message,
      };
    }

    if (attempt < maxAttempts) {
      const delayMs = 250 * attempt;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return lastResult;
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (err) {
    log(colors.red, `ERROR: ${err.message}`);
    process.exit(1);
    return;
  }

  const brokenLinks = [];
  const externalLinks = new Map();
  let allowedExternalFailures = 0;
  const rootDir = process.cwd();

  log(colors.cyan, 'Validating documentation links...');

  if (options.external) {
    log(colors.cyan, `External checks enabled (timeout: ${options.timeoutMs}ms, retries: ${options.retries})`);
  }

  const externalAllowlist = loadExternalAllowlist(options);
  if (options.external && options.allowlist) {
    log(colors.cyan, `External allowlist enabled (${externalAllowlist.size} URL(s))`);
  }

  const mdFiles = findMarkdownFiles(rootDir);

  log(colors.green, `Found ${mdFiles.length} markdown files\n`);

  for (const filePath of mdFiles) {
    let content;
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch {
      continue;
    }

    const relFilePath = path.relative(rootDir, filePath).split(path.sep).join('/');

    const links = extractMarkdownLinks(content);
    if (links.length === 0) {
      continue;
    }

    log(colors.yellow, `Checking: ${relFilePath} (${links.length} links)`);

    for (const link of links) {
      const linkText = link.text;
      const linkPath = link.target;

      if (isExternalHttpLink(linkPath)) {
        if (options.external) {
          if (!externalLinks.has(linkPath)) {
            externalLinks.set(linkPath, []);
          }
          externalLinks.get(linkPath).push({
            file: relFilePath,
            linkText,
          });
        }
        continue;
      }

      // Skip anchor-only links
      if (linkPath.startsWith('#')) {
        continue;
      }

      const resolution = resolveInternalLink(rootDir, filePath, linkPath);

      if (!resolution.found) {
        const resolvedRel = path.relative(rootDir, resolution.targetPath).split(path.sep).join('/');
        brokenLinks.push({
          file: relFilePath,
          linkText,
          linkPath,
          resolvedPath: resolvedRel,
        });
        log(colors.red, `  ✗ Broken: [${linkText}](${linkPath})`);
      }
    }
  }

  const externalFailures = [];

  if (options.external && externalLinks.size > 0) {
    console.log('');
    log(colors.cyan, `Checking ${externalLinks.size} unique external link(s)...`);

    for (const [url, references] of externalLinks.entries()) {
      const result = await validateExternalUrl(url, options);
      if (!result.ok) {
        if (externalAllowlist.has(url)) {
          allowedExternalFailures += 1;
          log(colors.yellow, `  ⚠ Allowed external failure: ${url}`);
          continue;
        }

        externalFailures.push({
          url,
          references,
          error: result.error || `HTTP ${result.status || 'unknown'}`,
          attempt: result.attempt || options.retries + 1,
        });
        log(colors.red, `  ✗ Broken external: ${url} (${result.error || `HTTP ${result.status || 'unknown'}`})`);
      }
    }
  }

  // Results
  console.log('');
  log(colors.cyan, '================================');
  log(colors.cyan, 'Validation Results');
  log(colors.cyan, '================================');

  if (brokenLinks.length === 0 && externalFailures.length === 0) {
    log(colors.green, '✅ All links are valid!');
    process.exit(0);
  } else {
    const totalFailures = brokenLinks.length + externalFailures.length;
    log(colors.red, `❌ Found ${totalFailures} broken link issue(s):\n`);

    if (brokenLinks.length > 0) {
      log(colors.red, `Internal broken links: ${brokenLinks.length}`);

      // Table-style output
      const fileColWidth = Math.max(4, ...brokenLinks.map(l => l.file.length));
      const textColWidth = Math.max(8, ...brokenLinks.map(l => l.linkText.length));
      const pathColWidth = Math.max(8, ...brokenLinks.map(l => l.linkPath.length));
      const resolvedColWidth = Math.max(12, ...brokenLinks.map(l => l.resolvedPath.length));

      const header =
        'File'.padEnd(fileColWidth) + '  ' +
        'LinkText'.padEnd(textColWidth) + '  ' +
        'LinkPath'.padEnd(pathColWidth) + '  ' +
        'ResolvedPath'.padEnd(resolvedColWidth);

      const separator =
        '-'.repeat(fileColWidth) + '  ' +
        '-'.repeat(textColWidth) + '  ' +
        '-'.repeat(pathColWidth) + '  ' +
        '-'.repeat(resolvedColWidth);

      console.log(header);
      console.log(separator);

      for (const link of brokenLinks) {
        console.log(
          link.file.padEnd(fileColWidth) + '  ' +
          link.linkText.padEnd(textColWidth) + '  ' +
          link.linkPath.padEnd(pathColWidth) + '  ' +
          link.resolvedPath.padEnd(resolvedColWidth)
        );
      }

      console.log('');
    }

    if (externalFailures.length > 0) {
      log(colors.red, `External broken links: ${externalFailures.length}`);
      for (const failure of externalFailures) {
        const refs = failure.references
          .map((ref) => `${ref.file} [${ref.linkText}]`)
          .join('; ');
        console.log(`- ${failure.url}`);
        console.log(`  Reason: ${failure.error}`);
        console.log(`  References: ${refs}`);
      }
    }

    if (allowedExternalFailures > 0) {
      console.log('');
      log(colors.yellow, `Allowed external failures (ignored): ${allowedExternalFailures}`);
    }

    process.exit(1);
  }
}

main();
