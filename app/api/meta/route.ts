import { route } from '../../../lib/http';
import { metadata } from '../../../lib/metadata';

export const runtime = 'nodejs';
export const GET = route((_, request) => {
  if (new URL(request.url).search) throw new TypeError('Unexpected query');
  return metadata;
});
