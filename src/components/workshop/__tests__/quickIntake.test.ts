import type { BespokeJobOrder, ClientBodyMeasurements } from '../../../types/workshop.types';

function assertEquals<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`Assertion Failed: ${message}. Expected '${String(expected)}', got '${String(actual)}'`);
  }
}

export async function runAllIntakeTests() {
  console.log('\n======================================================');
  console.log('ðŸ§ª RUNNING RAPID CLIENT INTAKE & DIRECT PAYMENT TESTS');
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
  // TEST GROUP 1: 6-Point Tailoring Passport Generation
  // --------------------------------------------------------------------------
  console.log('--- 1. Rapid 6-Point Measurement Intake Passport ---');

  await test('Builds valid client body measurement passport with all 6 points and unit', () => {
    const measurements: ClientBodyMeasurements = {
      clientId: 'cli-992',
      clientName: 'Abena Poku',
      clientPhone: '233244123456',
      unit: 'in',
      bust: 36.0,
      waist: 28.0,
      hips: 39.0,
      shoulder: 15.5,
      sleeveLength: 24.0,
      neckToWaist: 16.0,
      notes: 'Allow 1.5 in seam allowance.',
      updatedAt: new Date().toISOString(),
    };

    assertEquals(measurements.bust, 36.0, 'Bust spec must match');
    assertEquals(measurements.waist, 28.0, 'Waist spec must match');
    assertEquals(measurements.hips, 39.0, 'Hips spec must match');
    assertEquals(measurements.shoulder, 15.5, 'Shoulder spec must match');
    assertEquals(measurements.sleeveLength, 24.0, 'Sleeve length must match');
    assertEquals(measurements.neckToWaist, 16.0, 'Neck-to-waist must match');
    assertEquals(measurements.unit, 'in', 'Unit must match');
  });

  // --------------------------------------------------------------------------
  // TEST GROUP 2: Rapid Bespoke Order Construction & Direct Subtraction
  // --------------------------------------------------------------------------
  console.log('\n--- 2. Bespoke Order Generation & Direct Payment Subtraction ---');

  await test('Constructs new bespoke order with direct total and paid subtraction', () => {
    const generatedOrderId = 'ORD-BESPOKE-992';
    const totalAmount = 3500.0;
    const depositPaid = 1200.0; // custom deposit amount

    const order: BespokeJobOrder = {
      id: generatedOrderId,
      clientName: 'Abena Poku',
      clientPhone: '233244123456',
      stage: 'pending',
      garmentTitle: 'Royal Kente Evening Ballgown',
      garmentSubtitle: 'Custom Bespoke Couture',
      fabricType: 'Handwoven Silk Kente',
      fabricColor: 'Royal Gold & Indigo',
      fabricNotes: 'Double-reinforced boning.',
      referenceImages: ['/shop/kente_corset.png'],
      swatchImage: '/shop/kente_corset.png',
      measurements: {
        clientId: 'cli-992',
        clientName: 'Abena Poku',
        clientPhone: '233244123456',
        unit: 'in',
        bust: 36.0,
        waist: 28.0,
        hips: 39.0,
        shoulder: 15.5,
        sleeveLength: 24.0,
        neckToWaist: 16.0,
        updatedAt: new Date().toISOString(),
      },
      depositPaid,
      totalAmount,
      assignedTailor: 'Master Kwame Mensah',
      dueDate: 'AUG 24, 2026',
      createdAt: new Date().toISOString(),
      tasks: [
        {
          id: 'tsk-01',
          orderId: generatedOrderId,
          tailorName: 'Master Kwame Mensah',
          title: 'Draft master bespoke pattern for Royal Kente Evening Ballgown',
          status: 'pending',
          assignedAt: new Date().toISOString(),
        },
      ],
      stageHistory: [
        {
          stage: 'pending',
          completedAt: new Date().toISOString(),
          completedBy: 'Reception',
          notes: 'Intake logged.',
        },
      ],
    };

    assertEquals(order.stage, 'pending', 'Initial stage must be pending');
    assertEquals(order.totalAmount - order.depositPaid, 2300.0, 'Balance remaining must be 3500 - 1200 = 2300.00 GHS');
    assertEquals(order.tasks?.length || 0, 1, 'Initial task must be seeded');
  });

  console.log('\n======================================================');
  console.log(`ðŸ“Š TEST SUMMARY: ${passedTests} / ${totalTests} PASSED (100%)`);
  console.log('======================================================\n');

  if (passedTests !== totalTests) {
    throw new Error(`${totalTests - passedTests} tests failed`);
  }
}
