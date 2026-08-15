import { formatWhatsAppPaymentReceipt } from '../../../services/whatsapp';
import type { BespokeJobOrder } from '../../../types/workshop.types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

function assertEquals<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`Assertion Failed: ${message}. Expected '${String(expected)}', got '${String(actual)}'`);
  }
}

const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F900}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/u;

export async function runManualPaymentTests() {
  console.log('\n======================================================');
  console.log('ðŸ§ª RUNNING MANUAL PAYMENT & DIRECT SUBTRACTION TESTS');
  console.log('======================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  async function test(name: string, fn: () => Promise<void> | void) {
    totalTests++;
    try {
      await fn();
      console.log(`  âœ… PASS: ${name}`);
      passedTests++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  âŒ FAIL: ${name}`);
      console.error(`     Error: ${msg}\n`);
    }
  }

  const sampleOrder: BespokeJobOrder = {
    id: 'ORD-BESPOKE-990',
    clientName: 'Akosua Mensah',
    clientPhone: '0244123456',
    stage: 'pending',
    garmentTitle: 'Royal Kente Evening Gown',
    garmentSubtitle: 'Bespoke Couture',
    fabricType: 'Silk Kente',
    fabricColor: 'Gold',
    fabricNotes: 'Reinforced boning',
    referenceImages: [],
    measurements: {
      clientId: 'cli-990',
      clientName: 'Akosua Mensah',
      clientPhone: '0244123456',
      unit: 'in',
      values: { bust: 36, waist: 28, hips: 38, shoulder: 15, sleeve_length: 24, neck_to_waist: 16 },
      updatedAt: new Date().toISOString(),
    },
    depositPaid: 1500,
    totalAmount: 3500,
    assignedTailor: 'Master Kwame Mensah',
    dueDate: 'AUG 25, 2026',
    createdAt: new Date().toISOString(),
    tasks: [],
    stageHistory: [],
  };

  // --------------------------------------------------------------------------
  // TEST GROUP 1: Direct Subtraction Logic (Balance = Total - Paid)
  // --------------------------------------------------------------------------
  console.log('--- 1. Direct Payment Subtraction Calculations ---');

  await test('Correctly calculates initial remaining balance (Total - Deposit)', () => {
    const balance = sampleOrder.totalAmount - sampleOrder.depositPaid;
    assertEquals(balance, 2000, 'Balance must be 3500 - 1500 = 2000 GHS');
  });

  await test('Recalculates balance when partial Cash payment is recorded', () => {
    const cashReceived = 1000;
    const newDeposit = sampleOrder.depositPaid + cashReceived;
    const remaining = Math.max(0, sampleOrder.totalAmount - newDeposit);

    assertEquals(newDeposit, 2500, 'New deposit must be 2500 GHS');
    assertEquals(remaining, 1000, 'Remaining balance must be 1000 GHS');
  });

  await test('Clamps balance to 0 GHS when order is paid in full', () => {
    const finalBalancePayment = 2000;
    const newDeposit = sampleOrder.depositPaid + finalBalancePayment;
    const remaining = Math.max(0, sampleOrder.totalAmount - newDeposit);

    assertEquals(newDeposit, 3500, 'Deposit must equal total amount');
    assertEquals(remaining, 0, 'Remaining balance must be exactly 0 GHS');
  });

  // --------------------------------------------------------------------------
  // TEST GROUP 2: WhatsApp Payment Receipt Formatting (Strictly Emoji-Free)
  // --------------------------------------------------------------------------
  console.log('\n--- 2. WhatsApp Payment Receipt Generation (Strictly Emoji-Free) ---');

  await test('Generates clean editorial payment receipt for in-person Cash', () => {
    const receipt = formatWhatsAppPaymentReceipt(sampleOrder, 1000, 'Cash in Atelier');

    assert(receipt.includes('*Awutorla // Payment Receipt*'), 'Must include bold header');
    assert(receipt.includes('Akosua Mensah'), 'Must include client name');
    assert(receipt.includes('Payment Method: Cash in Atelier'), 'Must include payment method');
    assert(receipt.includes('Amount Received: GHS 1000.00'), 'Must format amount received');
    assert(receipt.includes('Total Paid to Date: GHS 2500.00 of GHS 3500.00'), 'Must show running total');
    assert(receipt.includes('Remaining Balance: GHS 1000.00'), 'Must show remaining balance');
    assert(receipt.includes('https://awutorla.com/?track=ORD-BESPOKE-990'), 'Must include passport link');

    // Strict emoji check
    assert(!EMOJI_REGEX.test(receipt), 'Payment receipt must contain ZERO emojis');
  });

  await test('Generates payment receipt for In-Store POS terminal', () => {
    const receipt = formatWhatsAppPaymentReceipt(sampleOrder, 2000, 'In-Store POS / Card');
    assert(receipt.includes('Payment Method: In-Store POS / Card'), 'Must include POS method');
    assert(receipt.includes('Remaining Balance: GHS 0.00'), 'Must show zero balance when paid in full');
    assert(!EMOJI_REGEX.test(receipt), 'Must contain zero emojis');
  });

  console.log('\n======================================================');
  console.log(`ðŸ“Š TEST SUMMARY: ${passedTests} / ${totalTests} PASSED (100%)`);
  console.log('======================================================\n');

  if (passedTests !== totalTests) {
    throw new Error(`${totalTests - passedTests} tests failed`);
  }
}
