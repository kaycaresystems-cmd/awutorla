import { runAllHubtelTests } from '../src/services/__tests__/hubtel.test';

async function main() {
  try {
    await runAllHubtelTests();
    process.exit(0);
  } catch (err) {
    console.error('Test suite failed:', err);
    process.exit(1);
  }
}

main();
