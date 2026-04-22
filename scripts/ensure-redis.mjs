import net from 'node:net';

const host = '127.0.0.1';
const port = 6379;

function checkRedis() {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });

    socket.once('connect', () => {
      socket.end();
      resolve(true);
    });

    socket.once('error', (err) => {
      socket.destroy();
      reject(err);
    });
  });
}

try {
  await checkRedis();
  console.log(`[OK] Redis reachable at ${host}:${port}`);
} catch {
  console.error(`[FAIL] Redis not reachable at ${host}:${port}`);
  console.error('Start it with: pnpm infra:up');
  process.exit(1);
}
