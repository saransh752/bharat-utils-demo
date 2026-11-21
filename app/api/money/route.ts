import { amountInWords, formatCompactINR, formatINR, numberToWords, parseINR } from 'bharat-utils';
import { boolean, number, route } from '../../../lib/http';
import { languages } from '../../../lib/options';

export const runtime = 'nodejs';

export const POST = route((input) => {
  const amount = number(input.amount, 'amount', -999_999_999_999_999, 999_999_999_999_999);
  const integer = number(input.integer, 'word number', -Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
  if (!Number.isSafeInteger(integer)) throw new RangeError('Expected integer');
  const extended = boolean(input.extended, 'extended scale');
  const formatted = formatINR(amount, { symbol: '₹', decimals: 2 });
  return {
    formatted,
    compact: formatCompactINR(amount),
    parsed: parseINR(formatted),
    wording: Object.fromEntries(languages.map((lang) => [lang, amountInWords(amount, { lang })])),
    numberWording: { en: numberToWords(integer, { extended }), hi: numberToWords(integer, { lang: 'hi', extended }) },
  };
});
