import { calculateGST, calculateIncomeTax, calculateTDS } from 'bharat-utils';
import { boolean, choice, number, route } from '../../../lib/http';
import { years } from '../../../lib/options';

export const runtime = 'nodejs';

export const POST = route((input) => {
  const mode = choice(input.mode, 'calculator', ['gst', 'tds', 'income'] as const);
  const amount = number(input.amount, 'amount', 0, 1e12);
  if (mode === 'gst') {
    const rate = number(input.rate, 'rate', 0, 100);
    return calculateGST(amount, rate, {
      inclusive: boolean(input.inclusive, 'inclusive'),
      interState: boolean(input.interState, 'interstate'),
    });
  }
  if (mode === 'tds') {
    return calculateTDS(amount, number(input.rate, 'rate', 0, 100), {
      hasPAN: boolean(input.hasPAN, 'PAN available'),
      threshold: number(input.threshold, 'threshold', 0, 1e12),
    });
  }
  const fy = choice(input.fy, 'financial year', years);
  const regime = choice(input.regime, 'regime', ['new', 'old'] as const);
  const result = calculateIncomeTax(amount, { fy, regime });
  return { ...result, slabs: result.slabs.map((slab) => ({
    ...slab, upTo: Number.isFinite(slab.upTo) ? slab.upTo : null,
  })) };
});
