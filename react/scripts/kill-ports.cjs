/**
 * Kills any processes using ports 8000, 8001, 5173 before npm start.
 * Works on Windows using netstat + taskkill.
 */
const { execSync } = require('child_process');

const PORTS = [8000, 8001, 5173];

for (const port of PORTS) {
  try {
    const out = execSync(`netstat -ano`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
    const lines = out.split('\n').filter(l => l.includes(`:${port} `) || l.includes(`:${port}\t`));
    const pids = [...new Set(
      lines.map(l => l.trim().split(/\s+/).pop()).filter(p => /^\d+$/.test(p) && p !== '0')
    )];
    for (const pid of pids) {
      try {
        execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
        console.log(`  killed PID ${pid} (port ${port})`);
      } catch { /* already gone */ }
    }
  } catch { /* netstat failed, skip */ }
}

console.log('  ports cleared, starting servers...\n');
