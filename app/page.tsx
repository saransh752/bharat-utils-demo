import { financialYear } from 'bharat-utils';
import { metadata } from '../lib/metadata';
import Playground from './playground';

export const dynamic = 'force-dynamic';

export default function Home() {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(new Date());
  const date = ['year', 'month', 'day'].map((type) => today.find((part) => part.type === type)?.value).join('-');
  return <Playground {...metadata} date={date} fy={financialYear(date).label} />;
}
