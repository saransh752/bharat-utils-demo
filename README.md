# bharat-utils demo

An interactive Next.js playground for the published `bharat-utils` npm package.

**Live demo** [https://REPLACE-WITH-VERCEL-URL](https://REPLACE-WITH-VERCEL-URL)

> Screenshot placeholder. Add a screenshot of the deployed playground here.

## What the playground demonstrates

- **ID validator** uses `SUPPORTED_TYPES`, `validate`, and `detectType`, with details from `parseGSTIN`, `parseVehicleNumber`, `parseUPI`, `ifscBank`, `pincodeInfo`, `panHolderType`, and `normalizeMobile`.
- **PII redactor** uses `redactPII`, `findPII`, and the library’s masking helpers. Findings show masked values and offsets.
- **Money** uses `formatINR`, `formatCompactINR`, `parseINR`, `amountInWords`, and `numberToWords`. Marathi, Gujarati, Tamil, and Bengali use experimental wording, pending native review.
- **Tax** uses `calculateGST`, `calculateTDS`, and `calculateIncomeTax`, with `GST_RATES` and `LEGACY_GST_RATES` as references. Indicative estimates, not tax advice. Verify with official sources.
- **Financial year and due dates** uses `financialYear`, `quarterOf`, and `dueDates`. Indicative, no holiday or extension adjustment.
- **KYC form** uses `validateData` with English and Hindi errors. The page includes Express, Fastify, and Koa adapter examples.
- **CLI** shows validation, redaction, wording, GST, income tax, and due-date commands.
- **Footer** reads the installed library version from `bharat-utils/package.json` on the server.

## Run locally

With Node.js 20.9+ and npm:

```sh
npm install && npm run dev
```

Open http://localhost:3000. Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` to verify changes.

## From the API handlers

From `app/api/validate/route.ts`:

```ts
const type = choice(input.type, 'identifier type', SUPPORTED_TYPES);
const value = string(input.value, 'identifier', 256);
const valid = validate(type, value);
const parser = parsers[type as keyof typeof parsers];
return { valid, suggestions: detectType(value), details: valid && parser ? parser(value) : null };
```

From `app/api/pii/route.ts`:

```ts
const options = { types, exclude };
const findings = findPII(text, options).map(({ type, value, start, end }) => ({
  type, masked: masks[type](value), start, end,
}));
return { redacted: redactPII(text, options), findings };
```

From `app/api/kyc/route.ts`:

```ts
const { valid, errors, data } = validateData(identifiers, schema, { lang });
```

## Privacy

**Use sample data only. Nothing is stored or logged.**

The app processes input in Node.js and returns results directly to the requesting browser. It has no analytics, request-body logging, or persistent storage. The API applies a 10 KB request-body limit and a 30 requests/minute per-IP limit within each running instance. Vercel supplies the client IP at its edge. Local requests without that header share one rate-limit bucket.

## Links

- [bharat-utils on npm](https://www.npmjs.com/package/bharat-utils)
- [bharat-utils source on GitHub](https://github.com/saransh752/bharat-utils)
