import { runAllIntakeTests } from '../src/components/workshop/__tests__/quickIntake.test';

async function main() {
  try {
    await runAllIntakeTests();
    process.exit(0);
  } catch (err) {
    console.error('Intake test suite failed:', err);
    process.exit(1);
  }
}

main();
