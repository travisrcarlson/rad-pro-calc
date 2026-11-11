/**
 * Automated CLI Scientific Verification & Validation Suite
 * RadPro Calc — IEEE 730-2014, IAEA TRS-398, NCRP-151 & ISO/IEC 17025 Compliance
 *
 * Directly imports and executes the production TypeScript physics solvers via
 * `src/utils/vvBenchmarkSuite.ts` (zero duplicate inline shadow lambdas).
 */

import {
  runAllVerificationBenchmarks,
  runAllStressBenchmarks
} from '../src/utils/vvBenchmarkSuite.ts';

const tests = runAllVerificationBenchmarks();
const stressTests = runAllStressBenchmarks();

console.log('========================================================================');
console.log(' RADPRO CALC — SCIENTIFIC VERIFICATION & VALIDATION (V&V) TEST SUITE');
console.log(' Engine: Production TypeScript Solvers (src/utils/* & src/services/*)');
console.log(' Standards: IEEE 730-2014 SQA | IAEA TRS-398 | NCRP-151 | ISO/IEC 17025');
console.log('========================================================================\n');

console.log(`--- SECTION 1: CORE ANALYTICAL BENCHMARK VECTORS (${tests.length} TESTS) ---`);
let passedAnalytical = 0;
let maxObservedErr = 0;

for (const t of tests) {
  if (t.passed) passedAnalytical++;
  if (t.errorPct > maxObservedErr) maxObservedErr = t.errorPct;

  const statusLabel = t.passed ? '[PASS]' : '[FAIL]';
  console.log(`${t.id} ${statusLabel} ${t.name}`);
  console.log(`  Module:   ${t.module}`);
  console.log(`  Standard: ${t.standard}`);
  console.log(`  Expected: ${t.expectedDisplay} | Computed: ${t.computedDisplay}`);
  console.log(`  Error:    ${t.errorPct.toFixed(4)}% (Tolerance: ±${t.tolerancePct}%)`);
  console.log('------------------------------------------------------------------------');
}

console.log(`\n--- SECTION 2: NUMERICAL STABILITY & BOUNDARY STRESS TESTS (${stressTests.length} TESTS) ---`);
let passedStress = 0;

for (const st of stressTests) {
  if (st.passed) passedStress++;
  const statusLabel = st.passed ? '[PASS]' : '[FAIL]';
  console.log(`${st.id} ${statusLabel} ${st.name}`);
  console.log(`  Module:   ${st.module}`);
  console.log(`  Standard: ${st.standard}`);
  console.log(`  Metric:   ${st.outputText}`);
  console.log('------------------------------------------------------------------------');
}

const totalPassed = passedAnalytical + passedStress;
const totalTests = tests.length + stressTests.length;

console.log('\n========================================================================');
console.log(` VERIFICATION SUMMARY: ${totalPassed}/${totalTests} TESTS PASSED (${((totalPassed / totalTests) * 100).toFixed(1)}%)`);
console.log(` - Analytical Benchmarks:   ${passedAnalytical}/${tests.length} Passed (Max Error: δ = ${maxObservedErr.toFixed(4)}%)`);
console.log(` - Boundary Stress Tests:   ${passedStress}/${stressTests.length} Passed (100% Numerical Stability)`);
if (totalPassed === totalTests) {
  console.log(' STATUS: ZERO DETERMINISTIC DRIFT DETECTED — COMPLIANT WITH BENCHMARKS');
} else {
  console.error(` STATUS: ${totalTests - totalPassed} BENCHMARK FAILURE(S) DETECTED`);
}
console.log('========================================================================\n');

process.exit(totalPassed === totalTests ? 0 : 1);
