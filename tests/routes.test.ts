import assert from 'node:assert/strict';
import test from 'node:test';
import { GET as meta } from '../app/api/meta/route';
import { POST as validate } from '../app/api/validate/route';
import { POST as pii } from '../app/api/pii/route';
import { POST as money } from '../app/api/money/route';
import { POST as tax } from '../app/api/tax/route';
import { POST as dates } from '../app/api/dates/route';
import { POST as kyc } from '../app/api/kyc/route';
import { detectors, paragraph } from '../lib/options';

let client = 0;
const ip = () => `192.0.2.${++client}`;

function post(data: unknown, address = ip()) {
  return new Request('http://localhost/api/test', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-vercel-forwarded-for': address },
    body: JSON.stringify(data),
  });
}

test('metadata exposes the installed package and rejects query input', async () => {
  const response = await meta(new Request('http://localhost/api/meta'));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const result = await response.json();
  assert.match(result.version, /^\d+\.\d+\.\d+/);
  assert.ok(result.types.includes('vehicle'));
  assert.ok(result.gstRates.includes(18));
  assert.equal((await meta(new Request('http://localhost/api/meta?unexpected=1'))).status, 400);
});

test('validator recognizes TG vehicles, offers suggestions, and rejects unknown types', async () => {
  const response = await validate(post({ type: 'vehicle', value: 'TG09AB1234' }));
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.valid, true);
  assert.ok(result.suggestions.includes('vehicle'));
  assert.equal(result.details.stateCode, 'TG');
  const invalid = await validate(post({ type: 'pan', value: 'invalid' }));
  assert.equal((await invalid.json()).valid, false);
  const unknown = await validate(post({ type: 'private-value', value: 'private-input' }));
  assert.equal(unknown.status, 400);
  assert.doesNotMatch(await unknown.text(), /private/);
});

test('PII masks adjacent cards and never returns raw values in findings', async () => {
  const response = await pii(post({ text: 'qty 2 4111111111111111', types: ['card'], exclude: [] }));
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.redacted, 'qty 2 XXXXXXXXXXXX1111');
  assert.deepEqual(result.findings, [{ type: 'card', masked: 'XXXXXXXXXXXX1111', start: 6, end: 22 }]);
  const sample = await pii(post({ text: paragraph, types: detectors, exclude: [] }));
  const sampleResult = await sample.json();
  assert.deepEqual(new Set(sampleResult.findings.map(({ type }: { type: string }) => type)), new Set(detectors));
  const excluded = await pii(post({ text: paragraph, types: ['ifsc'], exclude: ['ifsc'] }));
  assert.deepEqual((await excluded.json()).findings, []);
  assert.equal((await pii(post({ text: 42, types: [], exclude: [] }))).status, 400);
  assert.equal((await pii(post({ text: '', types: ['unknown'], exclude: [] }))).status, 400);
});

test('money returns a parse round trip and six languages', async () => {
  const response = await money(post({ amount: 1250.5, integer: 1e15, extended: true }));
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.parsed, 1250.5);
  assert.equal(Object.keys(result.wording).length, 6);
  assert.equal(result.numberWording.en, 'One Padma');
  assert.equal((await money(post({ amount: null, integer: 1, extended: false }))).status, 400);
  assert.equal((await money(post({ amount: 1, integer: 1e15, extended: false }))).status, 400);
});

test('tax calculators return GST, TDS, and the 2026-27 slab breakdown', async () => {
  const gst = await tax(post({ mode: 'gst', amount: 1000, rate: 18, inclusive: false, interState: false }));
  assert.equal(gst.status, 200);
  assert.equal((await gst.json()).cgst, 90);
  const tds = await tax(post({ mode: 'tds', amount: 50000, rate: 10, threshold: 30000, hasPAN: true }));
  assert.equal(tds.status, 200);
  assert.equal((await tds.json()).tds, 5000);
  const income = await tax(post({ mode: 'income', amount: 1675000, fy: '2026-27', regime: 'new' }));
  assert.equal(income.status, 200);
  const result = await income.json();
  assert.equal(result.slabs.length, 7);
  assert.equal(result.slabs.at(-1).upTo, null);
  assert.equal(result.total, 124800);
  assert.equal((await tax(post({ mode: 'gst', amount: null }))).status, 400);
  assert.equal((await tax(post({ mode: 'income', amount: 100, fy: '2030-31', regime: 'new' }))).status, 400);
});

test('financial year and due dates use calendar inputs and reject invalid dates', async () => {
  const response = await dates(post({ date: '2026-04-01', fy: '2026-27', type: 'advance-tax' }));
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.year.label, '2026-27');
  assert.equal(result.year.assessmentYear, '2027-28');
  assert.equal(result.quarter, 1);
  assert.deepEqual(result.dates, ['2026-06-15', '2026-09-15', '2026-12-15', '2027-03-15']);
  assert.equal((await dates(post({ date: '2026-02-31', fy: '2026-27', type: 'advance-tax' }))).status, 400);
  assert.equal((await dates(post({ date: '2026-01-31', fy: '2026-29', type: 'advance-tax' }))).status, 400);
});

test('KYC normalizes sample fields and returns localized errors without raw values', async () => {
  const input = { name: 'Demo  User', pan: 'abcpe1234f', mobile: '98765 43210', ifsc: 'sbin0001234',
    pincode: '110001', upi: 'RAHUL@okhdfcbank', lang: 'en' };
  const response = await kyc(post(input));
  assert.equal(response.status, 200);
  const { data } = await response.json();
  assert.equal(data.name, 'Demo User');
  assert.equal(data.pan, 'ABCPE1234F');
  assert.equal(data.mobile, '+919876543210');
  const invalid = await kyc(post({ ...input, pan: 'private-input', lang: 'hi' }));
  assert.equal(invalid.status, 400);
  const result = await invalid.json();
  assert.match(result.errors.pan, /अमान्य/);
  assert.doesNotMatch(JSON.stringify(result), /private-input|98765/);
});

test('body byte limit rejects a streaming or declared oversized request', async () => {
  const input = { text: '₹'.repeat(3500), types: [], exclude: [] };
  const response = await pii(post(input));
  assert.equal(response.status, 413);
  assert.match((await response.json()).error, /10 KB/);
  const declared = new Request('http://localhost/api/test', { method: 'POST',
    headers: { 'content-length': '10241', 'x-vercel-forwarded-for': ip() }, body: '{}' });
  assert.equal((await pii(declared)).status, 413);
});

test('rate limit is shared by routes and isolated per IP', async () => {
  const address = ip();
  for (let i = 0; i < 30; i++) {
    const response = await validate(post({ type: 'pan', value: 'ABCPE1234F' }, address));
    assert.equal(response.status, 200);
  }
  const limited = await meta(new Request('http://localhost/api/meta', { headers: { 'x-vercel-forwarded-for': address } }));
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get('retry-after'), '60');
  assert.match((await limited.json()).error, /Too many requests/);
  assert.equal((await validate(post({ type: 'pan', value: 'ABCPE1234F' }))).status, 200);
});
