import { runAllWorkshopTests } from '../src/components/workshop/__tests__/workshop.test';

async function main() {
  try {
    await runAllWorkshopTests();
    process.exit(0);
  } catch (err) {
    console.error('Workshop test suite failed:', err);
    process.exit(1);
  }
}

main();
