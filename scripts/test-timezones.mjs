// Corre los tests del contador en varias zonas horarias con horario de verano.
import { spawnSync } from 'node:child_process';

const zones = ['America/Santiago', 'Europe/Madrid', 'America/New_York', 'Australia/Sydney'];
let failed = false;

for (const zone of zones) {
  console.log(`\n▶ TZ=${zone}`);
  const result = spawnSync('npx', ['jest', 'src/lib/counter.test.ts', '--silent'], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, TEST_TZ: zone },
  });
  if (result.status !== 0) failed = true;
}

process.exit(failed ? 1 : 0);
