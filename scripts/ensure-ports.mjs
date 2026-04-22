import net from 'node:net';

const ports = [3000, 3001];

function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`[FAIL] Port ${port} is already in use`);
      } else {
        console.error(`[FAIL] Unable to check port ${port}`);
      }
      resolve(false);
    });
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, '127.0.0.1');
  });
}

let ok = true;
for (const port of ports) {
  const available = await checkPort(port);
  if (!available) {
    ok = false;
  }
}

if (!ok) {
  console.error('Free the ports above and retry: pnpm dev');
  process.exit(1);
}
