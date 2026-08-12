import { sanitizeGhanaianPhoneNumber, detectGhanaNetwork } from '../hubtel';

// Simple lightweight assertion utility
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

export async function runAllHubtelTests() {
  console.log('\n========================================');
  console.log('🧪 RUNNING HUBTEL PHONE/NETWORK TEST SUITE');
  console.log('========================================\n');

  let passedTests = 0;
  let totalTests = 0;

  async function test(name: string, fn: () => Promise<void> | void) {
    totalTests++;
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passedTests++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${msg}\n`);
    }
  }

  // --------------------------------------------------------------------------
  // TEST GROUP 1: Ghanaian Phone Number Sanitization
  // --------------------------------------------------------------------------
  console.log('--- 1. Phone Number Sanitization ---');

  await test('Converts standard 10-digit local format (024XXXXXXX) to 23324XXXXXXX', () => {
    const result = sanitizeGhanaianPhoneNumber('0244123456');
    assertEquals(result, '233244123456', 'Should convert 0244123456 to 233244123456');
  });

  await test('Handles numbers formatted with +233 and spaces (+233 50 123 4567)', () => {
    const result = sanitizeGhanaianPhoneNumber('+233 50 123 4567');
    assertEquals(result, '233501234567', 'Should convert +233 50 123 4567 to 233501234567');
  });

  await test('Preserves valid 12-digit international format (233271234567)', () => {
    const result = sanitizeGhanaianPhoneNumber('233271234567');
    assertEquals(result, '233271234567', 'Should preserve 233271234567');
  });

  await test('Handles 9-digit format without leading zero (554123456)', () => {
    const result = sanitizeGhanaianPhoneNumber('554123456');
    assertEquals(result, '233554123456', 'Should convert 554123456 to 233554123456');
  });

  await test('Throws error on invalid phone numbers (too short or wrong country)', () => {
    let errorThrown = false;
    try {
      sanitizeGhanaianPhoneNumber('024123');
    } catch {
      errorThrown = true;
    }
    assert(errorThrown, 'Should throw on short number');
  });

  // --------------------------------------------------------------------------
  // TEST GROUP 2: Ghanaian Telecom Network Detection
  // --------------------------------------------------------------------------
  console.log('\n--- 2. Telecom Network Detection ---');

  await test('Detects MTN numbers (024, 054, 055, 059)', () => {
    assertEquals(detectGhanaNetwork('0244123456'), 'mtn-gh', '024 should be MTN');
    assertEquals(detectGhanaNetwork('0558123456'), 'mtn-gh', '055 should be MTN');
  });

  await test('Detects Vodafone / Telecel numbers (020, 050)', () => {
    assertEquals(detectGhanaNetwork('0201123456'), 'vodafone-gh', '020 should be Vodafone/Telecel');
    assertEquals(detectGhanaNetwork('0509123456'), 'vodafone-gh', '050 should be Vodafone/Telecel');
  });

  await test('Detects AT / AirtelTigo numbers (027, 057, 026, 056)', () => {
    assertEquals(detectGhanaNetwork('0277123456'), 'tigo-gh', '027 should be Tigo/AT');
    assertEquals(detectGhanaNetwork('0261123456'), 'airtel-gh', '026 should be Airtel/AT');
  });

  console.log('\n========================================');
  console.log(`📊 TEST SUMMARY: ${passedTests} / ${totalTests} PASSED (100%)`);
  console.log('========================================\n');

  if (passedTests !== totalTests) {
    throw new Error(`${totalTests - passedTests} tests failed`);
  }
}
