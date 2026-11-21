import {
  SUPPORTED_TYPES, validate, detectType, parseGSTIN, parseVehicleNumber,
  parseUPI, ifscBank, pincodeInfo, panHolderType, normalizeMobile,
} from 'bharat-utils';
import { choice, route, string } from '../../../lib/http';

export const runtime = 'nodejs';

const parsers = {
  gstin: parseGSTIN, vehicle: parseVehicleNumber, upi: parseUPI, ifsc: ifscBank,
  pincode: pincodeInfo, pan: panHolderType, mobile: normalizeMobile,
};

export const POST = route((input) => {
  const type = choice(input.type, 'identifier type', SUPPORTED_TYPES);
  const value = string(input.value, 'identifier', 256);
  const valid = validate(type, value);
  const parser = parsers[type as keyof typeof parsers];
  return { valid, suggestions: detectType(value), details: valid && parser ? parser(value) : null };
});
