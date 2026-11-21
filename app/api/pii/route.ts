import {
  findPII, redactPII, maskKeepLast, maskEmail, maskUPI, maskPassport,
  maskVoterId, maskCard, maskBankAccount,
} from 'bharat-utils';
import { choices, route, string } from '../../../lib/http';
import { detectors } from '../../../lib/options';

export const runtime = 'nodejs';

const keepLastFour = (value: string) => maskKeepLast(value, 4);
const masks: Record<(typeof detectors)[number], (value: string) => string> = {
  gstin: keepLastFour, aadhaar: keepLastFour, pan: keepLastFour, mobile: keepLastFour,
  ifsc: keepLastFour, email: maskEmail, upi: maskUPI, passport: maskPassport,
  voterid: maskVoterId, card: maskCard, bankaccount: maskBankAccount,
};

export const POST = route((input) => {
  const text = string(input.text, 'text', 10 * 1024, { empty: true, trim: false });
  const types = choices(input.types, 'detectors', detectors);
  const exclude = choices(input.exclude, 'excluded detectors', detectors);
  const options = { types, exclude };
  const findings = findPII(text, options).map(({ type, value, start, end }) => ({
    type, masked: masks[type](value), start, end,
  }));
  return { redacted: redactPII(text, options), findings };
});
