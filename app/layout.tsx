import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'bharat-utils playground',
  description: 'Try Indian ID validation, PII redaction, INR formatting, and tax utilities with sample data.',
};

export default function Layout({ children }: { children: ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
