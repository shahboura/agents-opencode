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
  const { isBlockedReadPath, readGuardError } = await import(pathToFileURL(guardsPath).href);

  const blocked = [
    '/x/.env',
    '/x/.env.local',
    '/x/production.env',
    '/x/.envrc',
    '/x/.envrc.local',
    '/x/.envrc.private',
    '/x/id_rsa',
    '/x/id_ed25519',
    '/x/id_ecdsa',
    '/x/credentials.json',
    '/x/credentials.yaml',
    '/x/credentials.yml',
    '/x/secrets.yaml',
    '/x/secrets.yml',
    '/x/secrets.json',
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
    '/x/.env.defaults',
    '/x/.envrc.example',
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

  // Shell guard: obvious read verbs on secret files are blocked; mentioning a
  // secret filename without reading it is not. Direct interpreter references
  // are blocked; encoded/computed paths still bypass (best-effort guard).
  const shellBlocked = [
    'cat .env',
    'head -n 5 .env.local',
    'source .env',
    '. ./.envrc',
    'grep API_KEY .env',
    'sed -n 1p .env',
    'cat --file=.env',
    '\\cat .env',
    '/bin/cat .env',
    "bash -c 'cat .env'",
    'bash -c "cat .env;"',
    "sh -c 'cat .env|wc'",
    'x=$(cat .env)',
    'sudo cat .env',
    'cat<.env',
    'cat .env*',
    'cp .env /tmp/x',
    'sudo -u x cat .env',
    'FOO=1 cat .env',
    'xargs -n 1 cat .env',
    'dd if=.env',
    'dd bs=1 if=.env',
    'dd bs=1 if=.env of=/tmp/x',
    'dd < ".env"',
    'cp -t /tmp .env',
    'cp -t/tmp a .env',
    'cp -rt /tmp .env',
    'cp -rt/tmp .env',
    'cp --target-directory=/tmp .env',
    'cp --target-directory /tmp .env',
    'cp --target-dir=/tmp .env',
    'cp -tdir .env',
    'cp .env --target-directory=/tmp bar',
    'mv .env /tmp',
    'ln -s .env /tmp/link',
    'tee out < .env',
    'tee out < ".env"',
    "awk -F= '{print $1; print $2}' .env",
    "sed -n '1p; 2p' .env",
    'python -c "print(open(\'.env\').read())"',
    "python3 - <<'PY'\nopen('.env').read()\nPY",
    'python3.11 -c "open(\'.env\').read()"',
    '"python" -c "open(\'.env\').read()"',
    'x=`cat .env`',
    'node -e "require(\'fs\').readFileSync(\'.env\')"',
    // A pattern is not a path; only the file operands are reads.
    'grep -rn "x" .env tests/',
    'grep -r PATTERN .env',
    'grep -e API_KEY .env',
    'grep --file=.env dump.txt',
    'grep -f .env dump.txt',
    'sed -f .env in.txt',
    'awk -f .env in.txt',
    'grep --include=*.env -r x .',
    'cat $HOME/.env',
    'cat "$(pwd)/.env"',
    // Option values and wrapper command strings keep the old blocking.
    'grep -rnf .env x',
    'grep --exclude-from=.env x',
    'grep -f .env',
    'grep --include=*.env',
    'grep x -- .env',
    'grep -A 2 x .env',
    'grep -rn x ".env"',
    'sed -n 1p ".env"',
    'grep -f.env',
    'grep -f patterns.txt .env',
    'grep .env -f patterns.txt',
    "/bin/bash -c 'cat .env'",
    "bash -o pipefail -c 'cat .env'",
    "eval 'cat .env'",
    "ssh host 'cat .env'",
    'bash -c "grep -f .env .env" grep',
    'grep --color x .env',
    'awk -E .env data.txt',
    'awk --exec .env data.txt',
    'bash grep -c "grep -f .env .env"',
    'awk -i .env data.txt',
    'bash -c "grep -e \'\' .env"',
    'grep -f "$(cat .env)" README.md',
    'awk --source={print} .env',
    'awk -eprog .env',
    'sed -l 2p .env',
    'grep .env "--regexp=x"',
    'grep "--file=.env" x',
    'awk -e "{print}" .env',
    'awk --source "{print}" .env',
    'grep .env "-f" patterns.txt',
    "node -e \"require('fs').readFileSync('server.key')\"",
    'node --env-file=.env -p process.env',
    'python3 script.py .env',
    "node -e \"require('fs').readFileSync('server.pem')\"",
    'node -e "readFileSync(\'/x/server.key\')"',
    'node --env-file=server.key -p process.env',
    'node -e "open(\'.env\')"',
    'node -e "console.log(1)" \\server.key',
    'node --env-file server.key -p process.env',
    'rg secret .env',
    'rg -l secret .env',
    'rg -n "process.env" .env',
    'rg -f .env dump.txt',
    'bat .env',
    'xxd .env',
    'base64 .env',
    'od -c .env',
    'strings .env',
    'node -e "console.log(o.pem)"',
    'rg --hidden -g ".env" API_KEY .',
    'rg -C 2 x .env',
    'bash -c "rg secret .env"',
    'FOO=1 rg secret .env',
    'xargs -n 1 rg secret .env',
    'rg --ignore-file .env secret src/',
    'if true; then rg secret .env; fi',
    'node "--env-file=server.key" -p process.env',
  ];
  const shellAllowed = [
    'echo .env',
    'ls -la',
    'cat .env.example',
    'cp .env.example .env',
    'dd if=.env.example of=/tmp/x',
    'cp .env.example -t /tmp',
    'cp -t /tmp .env.example',
    'cp -r src /tmp',
    'mv .env.example /tmp',
    'echo "a;b"',
    "awk '{print $1; print $2}' data.txt",
    'python3 -c "print(1)"',
    'node -e "console.log(1)"',
    'git commit -m "node reads .env"',
    'git commit -m "tee out < .env"',
    'echo node .env',
    'git check-ignore .env',
    'cat README.md',
    // Patterns/scripts are not file paths (the four reported false positives).
    'grep -n "designSecrets\\|Object.assign(process.env" e2e/playwright.config.ts',
    'grep -E "^\\.-.*\\.env" -r .',
    "grep 'event.key'",
    'grep -rn "process.env" src/',
    'grep --regexp=.env src/file.ts',
    'grep -f patterns.txt src/',
    "sed -e 's/.env/.x/' README.md",
    'awk -f prog.awk data.txt',
    "grep -A 2 'event.key' src/app.ts",
    'grep -e.env src/app.ts',
    'grep --exclude=*.env -r x .',
    'grep --exclude-dir node_modules "process.env" src/',
    'bash -c "grep \'event.key\' app.ts"',
    'grep --color=auto x README.md',
    'grep -A 2 .env src/app.ts',
    'echo $((1+2))',
    'node -e "console.log(o.key)"',
    'node -e "console.log(event.key)"',
    ['cat > /tmp/opencode/preview.html <<\'HTML\'',
     '<script>const r = rows.map(node => `<span>${o.key}</span>`);</script>',
     'HTML'].join('\n'),
    'node -e "const k = o.key"',
    'node -e "const k=o.key"',
    'node -e "if(a==b.key) run()"',
    'rg -n "process.env" src/',
    'rg pattern src/',
    'bat README.md',
    'xxd README.md',
    'base64 README.md',
    'strings README.md',
    'rg -C 2 "process.env" src/',
    'echo strings .env',
    'rg -g "*.ts" "server.key" src/',
    'rg --glob "*.ts" "server.key" src/',
    'rg --type ts "process.env" src/',
  ];
  for (const command of shellBlocked) {
    assert(
      readGuardError('bash', { args: { command } }),
      `Expected shell command blocked: ${command}`
    );
    assert(
      readGuardError('shell', { input: { args: { command } } }),
      `Expected v2 shell command blocked: ${command}`
    );
  }
  for (const command of shellAllowed) {
    assert(
      !readGuardError('bash', { args: { command } }),
      `Expected shell command allowed: ${command}`
    );
    assert(
      !readGuardError('shell', { input: { args: { command } } }),
      `Expected v2 shell command allowed: ${command}`
    );
  }
  // An unterminated quote followed by backslashes must stay linear; an
  // ambiguous alternation here made the host hang.
  const startedAt = Date.now();
  readGuardError('bash', { args: { command: `cat "${'\\'.repeat(60)}` } });
  assert(Date.now() - startedAt < 2000, 'Unterminated quote must not hang the guard');

  console.log('✅ Plugin guard tests passed');
}

main().catch((err) => {
  console.error('❌ Plugin guard tests failed');
  console.error(err.message);
  process.exit(1);
});
