#!/usr/bin/env node
// Redact secrets from a drill transcript before it is saved.
//
// Reads stdin, writes the transcript to argv[2], and exits 3 when anything was
// redacted (the run is still saved, marked, and treated as a failed drill).
// Literal values of known secret env vars are replaced first, then patterns.

import fs from 'node:fs';

const out = process.argv[2];
if (!out) {
  console.error('usage: redact.mjs <output-file> < input');
  process.exit(2);
}

let text = fs.readFileSync(0, 'utf8');
let hits = 0;

const envNames = ['DEEPSEEK_API_KEY', 'FORGEJO_TOKEN', 'KIMAKI_BOT_TOKEN', 'GITHUB_TOKEN', 'OPENAI_API_KEY'];
for (const name of envNames) {
  const value = process.env[name];
  if (value && value.length >= 8 && text.includes(value)) {
    text = text.split(value).join('<REDACTED>');
    hits += 1;
  }
}

const patterns = [
  /sk-[A-Za-z0-9_-]{16,}/g,
  /gh[pousr]_[A-Za-z0-9]{20,}/g,
  /github_pat_[A-Za-z0-9_]{20,}/g,
  /AKIA[0-9A-Z]{16}/g,
  /xox[baprs]-[A-Za-z0-9-]{10,}/g,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
];

for (const pattern of patterns) {
  text = text.replace(pattern, () => {
    hits += 1;
    return '<REDACTED>';
  });
}

fs.writeFileSync(out, text);
if (hits > 0) {
  console.error(`⚠️  redacted ${hits} secret match(es) from ${out}`);
  process.exit(3);
}
