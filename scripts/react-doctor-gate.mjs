// Gate do React Doctor: falha se o score ficar abaixo do mínimo, se houver erros
// ou se a API de score não responder. Roda no pre-push e no CI.
// Usa a API de score do react-doctor, por isso NÃO passa --no-telemetry.
import { spawnSync } from 'node:child_process';
import { appendFileSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const TARGET = 'apps/web';
const MIN = Number(process.env.REACT_DOCTOR_MIN_SCORE ?? 90);
const TIMEOUT_MS = 5 * 60 * 1000;

function runReactDoctor(reportPath) {
  return spawnSync(
    'pnpm',
    ['exec', 'react-doctor', TARGET, '--json', '--json-out', reportPath, '--blocking', 'none', '-y'],
    { encoding: 'utf8', shell: process.platform === 'win32', timeout: TIMEOUT_MS },
  );
}

function writeStepSummary(score, label, errorCount, warningCount, passed) {
  const file = process.env.GITHUB_STEP_SUMMARY;
  if (!file) return;
  const scoreCell = score == null ? 'indisponível (API de score não respondeu)' : `${score}/100 (${label})`;
  appendFileSync(
    file,
    [
      '### React Doctor',
      '',
      '| Métrica | Valor |',
      '| --- | --- |',
      `| Score | ${scoreCell} |`,
      `| Mínimo exigido | ${MIN} |`,
      `| Erros | ${errorCount ?? '—'} |`,
      `| Avisos | ${warningCount ?? '—'} |`,
      `| Resultado | ${passed ? '✅ aprovado' : '❌ reprovado'} |`,
      '',
    ].join('\n'),
  );
}

function main() {
  if (!Number.isFinite(MIN)) {
    console.error(`REACT_DOCTOR_MIN_SCORE inválido: "${process.env.REACT_DOCTOR_MIN_SCORE}".`);
    return 1;
  }

  const dir = mkdtempSync(join(tmpdir(), 'react-doctor-gate-'));
  const reportPath = join(dir, 'report.json');
  try {
    const run = runReactDoctor(reportPath);
    if (run.error) {
      console.error(`Não foi possível rodar o react-doctor: ${run.error.message}`);
      writeStepSummary(null, null, null, null, false);
      return 1;
    }

    let report;
    try {
      report = JSON.parse(readFileSync(reportPath, 'utf8'));
    } catch {
      console.error('react-doctor não gerou relatório.');
      if (run.stderr?.trim()) console.error(run.stderr.trim());
      writeStepSummary(null, null, null, null, false);
      return 1;
    }

    const { score, scoreLabel, errorCount, warningCount } = report.summary ?? {};
    const label = scoreLabel ?? 'sem rótulo';

    if (typeof score !== 'number') {
      console.error(
        'React Doctor não retornou score: a API de score está indisponível. Tente rodar o gate de novo em alguns minutos.',
      );
      writeStepSummary(null, null, errorCount, warningCount, false);
      return 1;
    }

    console.log(`React Doctor score: ${score}/100 (${label}) — ${errorCount} erros, ${warningCount} avisos`);
    for (const d of report.diagnostics ?? []) {
      console.log(`  ${d.severity} ${d.rule}: ${TARGET}/${d.filePath}:${d.line}`);
    }

    const failures = [];
    if (errorCount > 0) failures.push(`${errorCount} erro(s)`);
    if (score < MIN) failures.push(`score ${score} abaixo do mínimo ${MIN}`);

    const passed = failures.length === 0;
    writeStepSummary(score, label, errorCount, warningCount, passed);
    if (!passed) {
      console.error(`❌ Gate reprovado: ${failures.join('; ')}.`);
      return 1;
    }
    console.log(`✅ Gate aprovado (mínimo ${MIN}, sem erros).`);
    return 0;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

process.exitCode = main();
