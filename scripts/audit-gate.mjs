#!/usr/bin/env node
import { execSync } from 'node:child_process';

function runAudit(scopeLabel, command) {
  let output = '';
  try {
    output = execSync(command, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (error) {
    output = `${error.stdout || ''}${error.stderr || ''}`;
  }

  let report;
  try {
    report = JSON.parse(output);
  } catch {
    console.error(`Unable to parse npm audit JSON for ${scopeLabel}`);
    console.error(output);
    process.exit(1);
  }

  const metadata = report.metadata?.vulnerabilities || {};
  const high = Number(metadata.high || 0);
  const critical = Number(metadata.critical || 0);
  console.log(`${scopeLabel}: critical=${critical}, high=${high}, moderate=${metadata.moderate || 0}`);

  if (high > 0 || critical > 0) {
    console.error(`Security gate failed for ${scopeLabel} (high/critical vulnerabilities found).`);
    process.exitCode = 1;
  }
}

runAudit('root', 'npm audit --omit=dev --json');
runAudit('backend', 'npm --prefix ./backend audit --omit=dev --json');
runAudit('server', 'npm --prefix ./server audit --omit=dev --json');

if (process.exitCode) {
  process.exit(process.exitCode);
}
