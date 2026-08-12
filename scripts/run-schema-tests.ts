import { runAllSchemaTests } from '../src/components/workshop/__tests__/orderTasks.test';

async function main() {
  try {
    await runAllSchemaTests();
    process.exit(0);
  } catch (err) {
    console.error('Schema test suite failed:', err);
    process.exit(1);
  }
}

main();
