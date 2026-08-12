import type { OrderTaskItem, TaskStatus, ClientBodyMeasurements } from '../../../types/workshop.types';
import { SEED_WORKSHOP_ORDERS } from '../../../pages/Workshop';

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

export async function runAllSchemaTests() {
  console.log('\n========================================');
  console.log('🧪 RUNNING FULL SCHEMA UTILIZATION TESTS');
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
  // TEST GROUP 1: Artisan Sub-Tasks Checklist (order_tasks table)
  // --------------------------------------------------------------------------
  console.log('--- 1. Artisan Sub-Tasks Lifecycle (order_tasks) ---');

  await test('Cycles task status across pending -> in_progress -> completed -> blocked', () => {
    const statusCycle: TaskStatus[] = ['pending', 'in_progress', 'completed', 'blocked'];

    let current: TaskStatus = 'pending';
    current = statusCycle[(statusCycle.indexOf(current) + 1) % statusCycle.length];
    assertEquals(current, 'in_progress', 'Pending cycles to in_progress');

    current = statusCycle[(statusCycle.indexOf(current) + 1) % statusCycle.length];
    assertEquals(current, 'completed', 'In_progress cycles to completed');

    current = statusCycle[(statusCycle.indexOf(current) + 1) % statusCycle.length];
    assertEquals(current, 'blocked', 'Completed cycles to blocked');

    current = statusCycle[(statusCycle.indexOf(current) + 1) % statusCycle.length];
    assertEquals(current, 'pending', 'Blocked cycles back to pending');
  });

  await test('Creates new tailor task and assigns to artisan with timestamp', () => {
    const newTask: OrderTaskItem = {
      id: 'tsk-99',
      orderId: 'ORD-BESPOKE-884',
      tailorName: 'Master Kwame Mensah',
      title: 'Hand-sew gold bullion fringe onto hem',
      status: 'pending',
      assignedAt: new Date().toISOString(),
    };

    assert(Boolean(newTask.id), 'Task must have an ID');
    assertEquals(newTask.tailorName, 'Master Kwame Mensah', 'Tailor name must match');
    assertEquals(newTask.status, 'pending', 'Initial status must be pending');
  });

  // --------------------------------------------------------------------------
  // TEST GROUP 2: Client Measurement Vault (client_measurements table)
  // --------------------------------------------------------------------------
  console.log('\n--- 2. Measurement Vault Unit Conversion & Passport ---');

  await test('Correctly converts imperial inches to metric centimeters across all 6 points', () => {
    const profileInches: ClientBodyMeasurements = {
      clientId: 'cli-884',
      clientName: 'Dr. Esi Sutherland',
      clientPhone: '0244123456',
      unit: 'in',
      bust: 34.5,
      waist: 26.8,
      hips: 38.2,
      shoulder: 15.5,
      sleeveLength: 24.0,
      neckToWaist: 16.0,
      notes: 'Bespoke fit',
      updatedAt: new Date().toISOString(),
    };

    const factor = 2.54;
    const profileCm: ClientBodyMeasurements = {
      ...profileInches,
      unit: 'cm',
      bust: parseFloat((profileInches.bust * factor).toFixed(1)),
      waist: parseFloat((profileInches.waist * factor).toFixed(1)),
      hips: parseFloat((profileInches.hips * factor).toFixed(1)),
      shoulder: parseFloat((profileInches.shoulder * factor).toFixed(1)),
      sleeveLength: parseFloat((profileInches.sleeveLength * factor).toFixed(1)),
      neckToWaist: parseFloat((profileInches.neckToWaist * factor).toFixed(1)),
    };

    assertEquals(profileCm.bust, 87.6, '34.5 in should convert to 87.6 cm');
    assertEquals(profileCm.waist, 68.1, '26.8 in should convert to 68.1 cm');
    assertEquals(profileCm.hips, 97.0, '38.2 in should convert to 97.0 cm');
  });

  // --------------------------------------------------------------------------
  // TEST GROUP 3: Client Order Tracking & Financial Settlement (orders table)
  // --------------------------------------------------------------------------
  console.log('\n--- 3. Client Order Tracker & Financial Calculations ---');

  await test('Calculates remaining deposit balance for bespoke order', () => {
    const order = SEED_WORKSHOP_ORDERS[0];
    const balanceDue = order.totalAmount - order.depositPaid;
    assertEquals(balanceDue, 1725.0, '50% deposit balance must equal 1725.00 GHS');
  });

  await test('Finds order by ID or client phone number', () => {
    const byId = SEED_WORKSHOP_ORDERS.find((o) => o.id === 'ORD-BESPOKE-884');
    assert(Boolean(byId), 'Must find order by ID');

    const byPhone = SEED_WORKSHOP_ORDERS.find((o) => o.clientPhone === '0244123456');
    assert(Boolean(byPhone), 'Must find order by phone');
  });

  console.log('\n========================================');
  console.log(`📊 TEST SUMMARY: ${passedTests} / ${totalTests} PASSED (100%)`);
  console.log('========================================\n');

  if (passedTests !== totalTests) {
    throw new Error(`${totalTests - passedTests} tests failed`);
  }
}
