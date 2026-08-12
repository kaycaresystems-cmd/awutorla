import { runManualPaymentTests } from '../src/components/workshop/__tests__/manualPayment.test';

async function main() {
  try {
    await runManualPaymentTests();
    process.exit(0);
  } catch (err) {
    console.error('Manual payment test suite failed:', err);
    process.exit(1);
  }
}

main();
