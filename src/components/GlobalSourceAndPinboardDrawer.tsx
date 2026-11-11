import {
  ISOTOPE_QUICK_REF,
  type GlobalSourceContext
} from '../context/RegulatoryContext';
import { evaluateNuclideBroadBeamShielding } from '../utils/canonicalNuclidePhysics';

/**
 * Evaluates global source context dose & shielding metrics using the canonical
 * NIST XCOM mass attenuation + ANSI/ANS-6.4.3 GP broad-beam buildup engine.
 */
export const computeSourceQuickPhysics = (source: GlobalSourceContext, occLimitMSv: number) => {
  const ref = ISOTOPE_QUICK_REF[source.isotope] || ISOTOPE_QUICK_REF['Co-60'];
  const r = Math.max(0.05, source.distanceM);

  const xcomEval = evaluateNuclideBroadBeamShielding(
    source.isotope,
    Math.max(0, source.activityGBq),
    r,
    source.shieldThicknessCm > 0
      ? [{ material: source.shieldMaterial, thicknessCm: source.shieldThicknessCm }]
      : [],
    'GP_ANS643'
  );

  const effectiveHvlCm = Math.max(0.001, xcomEval.effectiveHvlCm || ref.hvlLeadCm);
  const numHvls = xcomEval.opticalMfp > 0 ? xcomEval.opticalMfp / Math.LN2 : 0;
  const unshieldedMSvPerHr = xcomEval.unshieldedMSvHr;
  const shieldedMSvPerHr = xcomEval.shieldedBroadBeamMSvHr;
  const stayTimeHours = shieldedMSvPerHr > 1e-9 ? occLimitMSv / shieldedMSvPerHr : 99999;

  return {
    unshieldedMSvPerHr,
    shieldedMSvPerHr,
    effectiveHvlCm,
    numHvls,
    buildupFactor: xcomEval.buildupFactor,
    broadTransmission: xcomEval.transmissionBroadBeam,
    stayTimeHours,
    halfLifeStr: ref.halfLifeStr
  };
};
