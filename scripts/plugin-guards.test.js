#!/usr/bin/env node
'use strict';

const path = require('path');
const { pathToFileURL } = require('url');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const guardsPath = path.join(process.cwd(), '.opencode', 'lib', 'guards.mjs');
  const { isBlockedReadPath, selectPackVersion } = await import(pathToFileURL(guardsPath).href);

  const blocked = [
    '/x/.env',
    '/x/.env.local',
    '/x/production.env',
    '/x/id_rsa',
    '/x/id_ed25519',
    '/x/id_ecdsa',
    '/x/credentials.json',
    '/x/secrets.yaml',
    '/x/.npmrc',
    '/x/.netrc',
    '/x/server.p12',
    '/x/app.pfx',
    '/x/app.jks',
    '/x/app.keystore',
    '/x/private.pem',
    '/x/server.key',
    'C:\\Users\\me\\deck.key',
  ];

  const allowed = [
    '/x/.env.example',
    '/x/.env.sample',
    '/x/.env.template',
    '/x/.env.dist',
    '/x/production.env.example',
    '/x/ca.pem',
    '/x/cert.pem',
    '/x/certificate.pem',
    '/x/chain.pem',
    '/x/fullchain.pem',
    '/x/key.pub',
    '/x/server.crt',
    '/x/cert.cer',
    '/x/env',
    '/x/myenv',
    '/x/monkey',
    '/x/src/app.ts',
    '/x/README.md',
  ];

  for (const candidate of blocked) {
    assert(isBlockedReadPath(candidate), `Expected blocked: ${candidate}`);
  }
  for (const candidate of allowed) {
    assert(!isBlockedReadPath(candidate), `Expected allowed: ${candidate}`);
  }
  assert(!isBlockedReadPath(''), 'Expected empty path to be allowed');
  assert(!isBlockedReadPath(undefined), 'Expected undefined path to be allowed');

  assert(selectPackVersion({ markers: [' 2.4.0 '] }) === '2.4.0', 'Marker should be trimmed');
  assert(
    selectPackVersion({ markers: [null, '', '1.2.3'] }) === '1.2.3',
    'Should skip empty markers'
  );
  assert(
    selectPackVersion({ packageName: 'agents-opencode', packageVersion: '9.9.9' }) === '9.9.9',
    'Pack package.json fallback should apply'
  );
  assert(
    selectPackVersion({ packageName: 'consumer-app', packageVersion: '1.0.0' }) === 'unknown',
    'Consumer package.json must be rejected'
  );
  assert(selectPackVersion({}) === 'unknown', 'No inputs should resolve to unknown');
  assert(selectPackVersion() === 'unknown', 'Undefined inputs should resolve to unknown');

  console.log('✅ Plugin guard tests passed');
}

main().catch((err) => {
  console.error('❌ Plugin guard tests failed');
  console.error(err.message);
  process.exit(1);
});
