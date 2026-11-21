import { validateData } from 'bharat-utils';
import { choice, reply, route, string } from '../../../lib/http';

export const runtime = 'nodejs';

const schema = { pan: 'pan', mobile: 'mobile', ifsc: 'ifsc', pincode: 'pincode', upi: 'upi' } as const;

export const POST = route((input) => {
  const lang = choice(input.lang, 'language', ['en', 'hi'] as const);
  const name = string(input.name, 'name', 100, { empty: true });
  const identifiers = Object.fromEntries(Object.keys(schema).map((field) => [
    field, string(input[field], field, 128, { empty: true }),
  ]));
  const { valid, errors, data } = validateData(identifiers, schema, { lang });
  const validName = /^[\p{L}\p{M}][\p{L}\p{M} .’'-]*$/u.test(name);
  if (!valid || !validName) {
    return reply({ error: lang === 'hi' ? 'सत्यापन विफल' : 'Validation failed', errors: {
      ...errors,
      ...(!validName ? { name: lang === 'hi' ? 'मान्य नाम दर्ज करें' : 'Enter a valid name' } : {}),
    } }, 400);
  }
  return { valid, data: { name: name.replace(/ +/g, ' '), ...data } };
});
