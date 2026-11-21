import { dueDates, financialYear, quarterOf } from 'bharat-utils';
import { choice, route, string } from '../../../lib/http';
import { dateTypes } from '../../../lib/options';

export const runtime = 'nodejs';

function dateLabel(date: Date) {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part) => String(part).padStart(2, '0')).join('-');
}

export const POST = route((input) => {
  const date = string(input.date, 'date', 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new RangeError('Expected calendar date');
  const calendar = new Date(date + 'T00:00:00Z');
  if (!Number.isFinite(calendar.getTime()) || calendar.toISOString().slice(0, 10) !== date) {
    throw new RangeError('Invalid calendar date');
  }
  const fy = string(input.fy, 'financial year', 7);
  if (!/^[2-9]\d{3}-\d{2}$/.test(fy)) throw new RangeError('Expected financial year');
  const type = choice(input.type, 'due date type', dateTypes);
  return { year: financialYear(date), quarter: quarterOf(date), dates: dueDates(fy, { type }).map(dateLabel) };
});
