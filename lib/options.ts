export const detectors = [
  'gstin', 'aadhaar', 'pan', 'mobile', 'email', 'upi', 'passport', 'voterid', 'card', 'bankaccount', 'ifsc',
] as const;
export const languages = ['en', 'hi', 'mr', 'gu', 'ta', 'bn'] as const;
export const years = ['2025-26', '2026-27'] as const;
export const dateTypes = ['gstr-1', 'gstr-3b', 'tds-deposit', 'tds-return', 'advance-tax'] as const;
export const samples: Record<string, string> = {
  pan: 'ABCPE1234F', gstin: '27AAPFU0939F1ZV', aadhaar: '234567890124',
  mobile: '98765 43210', upi: 'rahul@okhdfcbank', card: '4111 1111 1111 1111',
  ifsc: 'SBIN0001234', vehicle: 'TG09AB1234', pincode: '110001',
  email: 'demo@example.com', passport: 'A1234567', voterid: 'ABC1234567',
  dl: 'DL0420110149646', tan: 'DELA12345B', cin: 'L17110MH1973PLC019786',
  udyam: 'UDYAM-MH-01-0000001',
};
export const paragraph = 'PAN ABCPE1234F. GSTIN 27AAPFU0939F1ZV. Aadhaar 234567890124. Mobile 98765 43210. Email demo@example.com. UPI rahul@okhdfcbank. Passport A1234567. Voter ABC1234567. Card 4111 1111 1111 1111. Account: 123456789012. IFSC SBIN0001234.';
