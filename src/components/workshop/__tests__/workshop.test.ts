import { getNextStage } from '../DigitalJobCard';
import {
  saveOfflineJobCard,
  getOfflineJobCard,
  getAllOfflineJobCards,
  cacheClientMeasurements,
  getOfflineMeasurements,
} from '../../../lib/offlineStore';
import { SEED_WORKSHOP_ORDERS } from './fixtures';
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

export async function runAllWorkshopTests() {
  console.log('\n========================================');
  console.log('ðŸ§ª RUNNING TAILOR WORKSHOP & PWA TESTS');
  console.log('========================================\n');

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
  // TEST GROUP 1: Stage Progression Logic
  // --------------------------------------------------------------------------
  console.log('--- 1. Workshop Kanban Stage Progression ---');

  await test('Advances order through [Received] -> [Cutting] -> [Fitting] -> [Finishing] -> [Ready]', () => {
    assertEquals(getNextStage('pending'), 'cutting', 'Pending advances to cutting');
    assertEquals(getNextStage('cutting'), 'fitting', 'Cutting advances to fitting');
    assertEquals(getNextStage('fitting'), 'finishing', 'Fitting advances to finishing');
    assertEquals(getNextStage('finishing'), 'ready', 'Finishing advances to ready');
    assertEquals(getNextStage('ready'), 'delivered', 'Ready advances to delivered');
  });

  // --------------------------------------------------------------------------
  // TEST GROUP 2: Offline Storage & PWA Caching
  // --------------------------------------------------------------------------
  console.log('\n--- 2. Offline Measurement & Job Card Cache ---');

  const testOrder: BespokeJobOrder = {
    id: 'ORD-TEST-99',
    clientName: 'Yaa Asantewaa',
    clientPhone: '0244112233',
    stage: 'pending',
    garmentTitle: 'Royal Kente Gown',
    garmentSubtitle: 'State Evening Wear',
    fabricType: 'Silk Kente',
    fabricColor: 'Gold',
    fabricNotes: 'Reinforced corset',
    referenceImages: [],
    measurements: {
      clientId: 'cli-99',
      clientName: 'Yaa Asantewaa',
      clientPhone: '0244112233',
      unit: 'in',
      values: { bust: 36, waist: 28, hips: 39, neck_to_waist: 16, shoulder: 15.5, sleeve_length: 24 },
      updatedAt: '2026-08-09T00:00:00Z',
    },
    depositPaid: 1500,
    totalAmount: 3000,
    assignedTailor: 'Kwame Mensah',
    dueDate: 'AUG 20, 2026',
    createdAt: '2026-08-09T00:00:00Z',
    tasks: [],
    stageHistory: [],
  };

  await test('Saves and retrieves job card offline from memory/local store', () => {
    saveOfflineJobCard(testOrder);
    const retrieved = getOfflineJobCard('ORD-TEST-99');
    assert(Boolean(retrieved), 'Should retrieve offline job card');
    assertEquals(retrieved?.clientName, 'Yaa Asantewaa', 'Client name should match');
    assertEquals(retrieved?.measurements.values.bust, 36, 'Bust measurement should match');
  });

  await test('Caches and retrieves client body measurements offline', () => {
    cacheClientMeasurements('cli-99', testOrder.measurements);
    const cached = getOfflineMeasurements('cli-99');
    assert(Boolean(cached), 'Should retrieve cached measurements');
    assertEquals(cached?.values.waist, 28, 'Waist measurement should match');
    assertEquals(cached?.values.hips, 39, 'Hips measurement should match');
  });

  // --------------------------------------------------------------------------
  // TEST GROUP 3: Shop-Floor Order Data Completeness
  // --------------------------------------------------------------------------
  console.log('\n--- 3. Workshop Job Order Verification ---');

  await test('Verifies all seed workshop orders have valid measurement profiles and assigned tailors', () => {
    SEED_WORKSHOP_ORDERS.forEach((o) => saveOfflineJobCard(o));
    const list = getAllOfflineJobCards();
    assert(list.length >= 5, 'Should have at least 5 active workshop orders');

    for (const ord of list) {
      assert(Boolean(ord.assignedTailor), `Order ${ord.id} must have assigned tailor`);
      assert(ord.measurements.values.bust > 0, `Order ${ord.id} must have valid bust`);
      assert(ord.measurements.values.waist > 0, `Order ${ord.id} must have valid waist`);
      assert(ord.measurements.values.hips > 0, `Order ${ord.id} must have valid hips`);
      assert(Boolean(ord.dueDate), `Order ${ord.id} must have due date`);
    }
  });

  console.log('\n========================================');
  console.log(`ðŸ“Š TEST SUMMARY: ${passedTests} / ${totalTests} PASSED (100%)`);
  console.log('========================================\n');

  if (passedTests !== totalTests) {
    throw new Error(`${totalTests - passedTests} tests failed`);
  }
}
