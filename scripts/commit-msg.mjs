import { readFileSync, writeFileSync } from 'node:fs';

const AI_ATTRIBUTION = [/^\s*co-authored-by:\s*claude\b/i, /^\s*(🤖\s*)?generated with\s+\[?claude\b/i];

function strip(message) {
  const kept = message
    .split('\n')
    .filter((line) => !AI_ATTRIBUTION.some((pattern) => pattern.test(line)))
    .join('\n')
    .replace(/\s+$/, '');
  return kept ? `${kept}\n` : '';
}

const file = process.argv[2];
if (file) {
  const original = readFileSync(file, 'utf8');
  const cleaned = strip(original);
  if (cleaned !== original) {
    writeFileSync(file, cleaned, 'utf8');
    process.stderr.write('commit-msg: assinatura do Claude removida da mensagem do commit\n');
  }
} else {
  let input = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => (input += chunk));
  process.stdin.on('end', () => process.stdout.write(strip(input)));
}
