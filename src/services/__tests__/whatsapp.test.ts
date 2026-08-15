import {
  getWhatsAppLink,
  formatWhatsAppWelcomeMessage,
  formatWhatsAppStageMessage,
  formatWhatsAppFittingReminder,
} from '../whatsapp';
import type { BespokeJobOrder } from '../../types/workshop.types';

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

// Regex to detect common unicode emojis
const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F900}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/u;

export async function runAllWhatsAppTests() {
  console.log('\n======================================================');
  console.log('ðŸ§ª RUNNING 1-CLICK WHATSAPP NOTIFICATION TEST SUITE');
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

  // --------------------------------------------------------------------------
  // TEST GROUP 1: WhatsApp Link Generation & Ghanaian Number Sanitization
  // --------------------------------------------------------------------------
  console.log('--- 1. WhatsApp Deep-Link URL Construction ---');

  await test('Generates wa.me link with sanitized Ghanaian phone number (024XXXXXXX -> 23324XXXXXXX)', () => {
    const link = getWhatsAppLink('0244123456', 'Hello Maison');
    assertEquals(link, 'https://wa.me/233244123456?text=Hello%20Maison', 'Must format wa.me URL correctly');
  });

  await test('Handles international formatted phone numbers with spaces (+233 50 123 4567)', () => {
    const link = getWhatsAppLink('+233 50 123 4567', 'Fitting confirmation');
    assertEquals(link, 'https://wa.me/233501234567?text=Fitting%20confirmation', 'Must sanitize + and spaces');
  });

  // --------------------------------------------------------------------------
  // TEST GROUP 2: Emoji-Free WhatsApp Welcome Template
  // --------------------------------------------------------------------------
  console.log('\n--- 2. Welcome Message Template (Strictly Emoji-Free) ---');

  await test('Formats clean editorial welcome message without any emojis', () => {
    const msg = formatWhatsAppWelcomeMessage('Abena Poku', 'ORD-BESPOKE-992', 'Royal Kente Ballgown', 1750, 3500);

    assert(msg.includes('*Awutorla // Bespoke Garment Intake*'), 'Includes bold header');
    assert(msg.includes('Abena Poku'), 'Includes client name');
    assert(msg.includes('ORD-BESPOKE-992'), 'Includes order reference');
    assert(msg.includes('GHS 1750.00 of GHS 3500.00'), 'Includes deposit breakdown');
    assert(msg.includes('https://awutorla.com/?track=ORD-BESPOKE-992'), 'Includes tracking deep-link');

    // Strict emoji check
    assert(!EMOJI_REGEX.test(msg), 'Welcome message must contain ZERO emojis');
  });

  // --------------------------------------------------------------------------
  // TEST GROUP 3: Milestone Stage Updates (Strictly Emoji-Free)
  // --------------------------------------------------------------------------
  console.log('\n--- 3. Production Milestone Stage Messages (Strictly Emoji-Free) ---');

  const testOrder: BespokeJobOrder = {
    id: 'ORD-BESPOKE-884',
    clientName: 'Dr. Esi Sutherland',
    clientPhone: '0244123456',
    stage: 'cutting',
    garmentTitle: 'Ashanti Royal Silk Corset Gown',
    garmentSubtitle: 'State Banquet Evening Wear',
    fabricType: 'Handwoven Indigo & Gold Silk Kente',
    fabricColor: 'Royal Gold & Midnight Indigo',
    fabricNotes: 'Reinforced waist boning.',
    referenceImages: [],
    measurements: {
      clientId: 'cli-884',
      clientName: 'Dr. Esi Sutherland',
      clientPhone: '0244123456',
      unit: 'in',
      values: { bust: 34.5, waist: 26.8, hips: 38.2, shoulder: 15.5, sleeve_length: 24.0, neck_to_waist: 16.0 },
      updatedAt: new Date().toISOString(),
    },
    depositPaid: 1725,
    totalAmount: 3450,
    assignedTailor: 'Master Kwame Mensah',
    dueDate: 'AUG 18, 2026',
    createdAt: new Date().toISOString(),
    tasks: [],
    stageHistory: [],
  };

  await test('Generates cutting milestone message without emojis', () => {
    const msg = formatWhatsAppStageMessage(testOrder, 'cutting');
    assert(msg.includes('In Cutting'), 'Includes cutting status');
    assert(!EMOJI_REGEX.test(msg), 'Cutting message must contain zero emojis');
  });

  await test('Generates fitting milestone invitation without emojis', () => {
    const msg = formatWhatsAppStageMessage(testOrder, 'fitting');
    assert(msg.includes('Fitting Invitation'), 'Includes fitting invitation header');
    assert(!EMOJI_REGEX.test(msg), 'Fitting message must contain zero emojis');
  });

  await test('Generates ready-for-collection message without emojis', () => {
    const msg = formatWhatsAppStageMessage(testOrder, 'ready');
    assert(msg.includes('Collection Notice'), 'Includes collection notice header');
    assert(!EMOJI_REGEX.test(msg), 'Ready message must contain zero emojis');
  });

  await test('Generates fitting reminder message without emojis', () => {
    const msg = formatWhatsAppFittingReminder('Dr. Esi Sutherland', 'ORD-BESPOKE-884', 'Tomorrow at 2:00 PM');
    assert(msg.includes('Tomorrow at 2:00 PM'), 'Includes date string');
    assert(!EMOJI_REGEX.test(msg), 'Fitting reminder must contain zero emojis');
  });

  console.log('\n======================================================');
  console.log(`ðŸ“Š TEST SUMMARY: ${passedTests} / ${totalTests} PASSED (100%)`);
  console.log('======================================================\n');

  if (passedTests !== totalTests) {
    throw new Error(`${totalTests - passedTests} tests failed`);
  }
}
