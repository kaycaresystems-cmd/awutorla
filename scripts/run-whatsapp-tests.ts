import { runAllWhatsAppTests } from '../src/services/__tests__/whatsapp.test';

async function main() {
  try {
    await runAllWhatsAppTests();
    process.exit(0);
  } catch (err) {
    console.error('WhatsApp test suite failed:', err);
    process.exit(1);
  }
}

main();
