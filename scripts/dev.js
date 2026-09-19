const { fork } = require('child_process');
const path = require('path');

const procs = [];
const root = path.join(__dirname, '..');

function start(name, file) {
  const child = fork(file, [], {
    stdio: 'inherit',
    cwd: root
  });

  procs.push(child);

  child.on('error', (e) => {
    console.error(`[${name}] error:`, e.message);
  });

  child.on('exit', (code) => {
    console.log(`[${name}] exited code ${code}`);
  });
}

function shutdown() {
  for (const p of procs) {
    try {
      p.kill();
    } catch {}
  }
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

start('api', path.join(root, 'server', 'pg-app.js'));
start('v4',  path.join(root, 'server', 'v4-static.js'));

console.log('Madarasati dev started:');
console.log('Frontend: http://localhost:3000');
console.log('Backend:  http://localhost:4003');
