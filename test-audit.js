import fs from 'fs';
import path from 'path';

const base = process.env.API_BASE || 'http://localhost:3001/api';
const logPath = path.resolve(process.cwd(), 'logs', 'verify.log');

async function ensureLogExists() {
  try {
    await fs.promises.mkdir(path.dirname(logPath), { recursive: true });
    // Touch the file if missing
    try { await fs.promises.access(logPath); } catch { await fs.promises.writeFile(logPath, ''); }
  } catch (e) {
    console.error('Failed to ensure log file:', e.message);
  }
}

async function triggerAudit() {
  console.log('\n🧪 Triggering audit entries via unauthorized /api/optimize request');
  const res = await fetch(`${base}/optimize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobTitle: 'x', jobDescription: 'y', resumeText: 'z'.repeat(60) })
  });
  console.log('Status:', res.status);
}

async function readLastLines(n = 5) {
  const content = await fs.promises.readFile(logPath, 'utf-8');
  const lines = content.trim().split('\n');
  return lines.slice(-n);
}

async function run() {
  await ensureLogExists();
  await triggerAudit();
  const last = await readLastLines(10);
  console.log('\n📄 Last audit log lines:');
  last.forEach(l => console.log(l));
  const hasVerify = last.some(l => {
    try {
      const obj = JSON.parse(l);
      return obj.type === 'verify' && obj.result === 'missing_token';
    } catch { return false; }
  });
  if (!hasVerify) {
    console.error('❌ Expected a missing_token verify audit entry');
    process.exit(1);
  }
  console.log('✅ Audit logging captured verification attempt.');
}

run();