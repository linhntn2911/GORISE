import { migrate } from './migrate.js';

try {
  const result = await migrate();
  console.log('GORISE database ready:', result);
} catch (error) {
  console.error('GORISE database bootstrap failed:', error.message);
  process.exitCode = 1;
  process.exit();
}
await import('./index.js');
