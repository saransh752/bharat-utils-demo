import { createRequire } from 'node:module';
import { GST_RATES, LEGACY_GST_RATES, SUPPORTED_TYPES } from 'bharat-utils';

const requirePackage = createRequire(import.meta.url);
export const metadata = {
  version: (requirePackage('bharat-utils/package.json') as { version: string }).version,
  types: SUPPORTED_TYPES,
  gstRates: GST_RATES,
  legacyGstRates: LEGACY_GST_RATES,
};
