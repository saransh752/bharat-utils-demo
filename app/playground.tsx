'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { dateTypes, detectors, paragraph, samples, years } from '../lib/options';

type Payload = Record<string, unknown>;
type FieldSpec = { name: string; label: string; sample: string; type?: 'text' | 'number' | 'date' };
type Finding = { type: string; masked: string; start: number; end: number };
type Slab = { from: number; upTo: number | null; rate: number; taxable: number; tax: number };

const labels: Record<string, string> = {
  pan: 'PAN', gstin: 'GSTIN', aadhaar: 'Aadhaar', ifsc: 'IFSC', upi: 'UPI',
  mobile: 'Mobile', vehicle: 'Vehicle registration', pincode: 'PIN code',
  email: 'Email', passport: 'Passport', voterid: 'Voter ID', card: 'Card',
  bankaccount: 'Bank account', dl: 'Driving licence', tan: 'TAN', cin: 'CIN', udyam: 'Udyam',
  cgst: 'CGST', sgst: 'SGST', igst: 'IGST', totalTax: 'Total tax',
  en: 'English', hi: 'Hindi', mr: 'Marathi', gu: 'Gujarati', ta: 'Tamil', bn: 'Bengali',
};

const nav = [
  ['validate', 'ID validator'], ['pii', 'PII redactor'], ['money', 'Money'],
  ['tax', 'Tax'], ['dates', 'Financial year'], ['kyc', 'KYC form'], ['cli', 'CLI'],
];

const labelFor = (key: string) => labels[key] ?? key.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase());
const toNumber = (data: FormData, key: string) => {
  const value = String(data.get(key) ?? '');
  return value.trim() ? Number(value) : null;
};

function Section({ id, title, description, children }: { id: string; title: string; description: string; children: ReactNode }) {
  return <section id={id} className="section" aria-labelledby={`${id}-title`}>
    <header><h2 id={`${id}-title`}>{title}</h2><p>{description}</p></header>
    {children}
  </section>;
}

function Field({ name, label, sample, type = 'text' }: FieldSpec) {
  const [value, setValue] = useState(sample);
  return <div className="field">
    <label>{label}
      <input name={name} value={value} type={type} step={type === 'number' ? 'any' : undefined}
        onChange={(event) => setValue(event.target.value)} autoComplete="off" maxLength={type === 'text' ? 256 : undefined} />
    </label>
    <button type="button" className="sample" aria-label={`Try sample for ${label}`} onClick={() => setValue(sample)}>Try sample</button>
  </div>;
}

function Select({ name, label, options, defaultValue, onChange }: {
  name: string; label: string; options: readonly string[]; defaultValue?: string; onChange?: (value: string) => void;
}) {
  return <label>{label}
    <select name={name} defaultValue={defaultValue} onChange={(event) => onChange?.(event.target.value)}>
      {options.map((option) => <option key={option} value={option}>{labels[option] ?? option}</option>)}
    </select>
  </label>;
}

function Check({ name, children, initial = false, value }: { name: string; children: ReactNode; initial?: boolean; value?: string }) {
  return <label className="check"><input type="checkbox" name={name} value={value} defaultChecked={initial} />{children}</label>;
}

function Results({ data }: { data: Payload }) {
  return <dl className="results">
    {Object.entries(data).map(([key, value]) => <div key={key}>
      <dt>{labelFor(key)}</dt><dd>{value == null ? 'Unavailable' : String(value)}</dd>
    </div>)}
  </dl>;
}

function DataTable({ columns, rows, caption }: { columns: string[]; rows: ReactNode[][]; caption: string }) {
  return <div className="overflow-x-auto"><table>
    <caption>{caption}</caption>
    <thead><tr>{columns.map((column) => <th key={column} scope="col">{column}</th>)}</tr></thead>
    <tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody>
  </table></div>;
}

function ToolForm({ api, action, build, show, children }: {
  api: string; action: string; build: (data: FormData) => Payload; show: (data: Payload) => ReactNode; children: ReactNode;
}) {
  const [result, setResult] = useState<Payload>();
  const [error, setError] = useState<Payload>();
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = build(new FormData(event.currentTarget));
    setBusy(true);
    setResult(undefined);
    setError(undefined);
    try {
      const response = await fetch(`/api/${api}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store',
      });
      const payload = await response.json() as Payload;
      if (response.ok) setResult(payload);
      else setError(payload);
    } catch {
      setError({ error: 'Request failed. Please try again.' });
    } finally {
      setBusy(false);
    }
  }

  return <form method="post" action={`/api/${api}`} onSubmit={submit} autoComplete="off" className="tool-form">
    {children}
    <button disabled={busy} className="primary">{busy ? 'Working…' : action}</button>
    <div aria-live="polite" aria-atomic="true">
      {error && <div className="error"><p>{String(error.error)}</p>
        {error.errors ? <Results data={error.errors as Payload} /> : null}</div>}
      {result && <div className="output">{show(result)}</div>}
    </div>
  </form>;
}

function Validator({ types }: { types: readonly string[] }) {
  const [type, setType] = useState('pan');
  return <ToolForm api="validate" action="Validate identifier"
    build={(data) => ({ type: data.get('type'), value: data.get('value') })}
    show={({ valid, suggestions, details }) => <>
      <strong className={valid ? 'valid' : 'invalid'}>{valid ? 'Valid identifier' : 'Invalid identifier'}</strong>
      <p>Detected types: {(suggestions as string[]).map(labelFor).join(', ') || 'None'}</p>
      {details !== null && <Results data={typeof details === 'object' ? details as Payload : { details }} />}
    </>}>
    <div className="fields">
      <Select name="type" label="Identifier type" options={types} defaultValue={type} onChange={setType} />
      <Field key={type} name="value" label="Identifier" sample={samples[type] ?? ''} />
    </div>
  </ToolForm>;
}

function Redactor() {
  const [text, setText] = useState(paragraph);
  return <ToolForm api="pii" action="Redact text"
    build={(data) => ({ text, types: data.getAll('types'), exclude: data.getAll('exclude') })}
    show={({ redacted, findings }) => <>
      <h3>Redacted text</h3><pre className="text-output">{String(redacted)}</pre>
      {(findings as Finding[]).length ? <DataTable caption="Masked findings"
        columns={['Type', 'Masked value', 'Start', 'End']}
        rows={(findings as Finding[]).map(({ type, masked, start, end }) => [labelFor(type), masked, start, end])}
      /> : <p>No identifiers detected.</p>}
    </>}>
    <div className="field"><label>Text to redact
      <textarea rows={6} maxLength={10240} value={text} onChange={(event) => setText(event.target.value)} />
    </label><button className="sample" type="button" onClick={() => setText(paragraph)}>Try sample</button></div>
    <fieldset><legend>Detectors</legend><div className="checks">
      {detectors.map((type) => <Check key={type} name="types" value={type} initial={type !== 'ifsc'}>{labelFor(type)}{type === 'ifsc' ? ' (opt-in)' : ''}</Check>)}
    </div></fieldset>
    <label>Exclude detectors
      <select name="exclude" multiple size={4}>
        {detectors.map((type) => <option key={type} value={type}>{labelFor(type)}</option>)}
      </select>
    </label>
    <p className="muted">Excluded or unchecked identifiers can remain visible in the redacted text.</p>
  </ToolForm>;
}

function Money() {
  return <ToolForm api="money" action="Format and convert"
    build={(data) => ({ amount: toNumber(data, 'amount'), integer: toNumber(data, 'integer'), extended: data.has('extended') })}
    show={({ formatted, compact, parsed, wording, numberWording }) => <>
      <Results data={{ formatted, compact, 'Parse round trip': parsed }} />
      <DataTable caption="Amount in words" columns={['Language', 'Wording']}
        rows={Object.entries(wording as Payload).map(([lang, value]) => [labelFor(lang), String(value)])} />
      <h3>Number in words</h3><Results data={numberWording as Payload} />
    </>}>
    <div className="fields">
      <Field name="amount" label="Amount (INR)" type="number" sample="1250.50" />
      <Field name="integer" label="Integer for number wording" type="number" sample="1000000000" />
    </div>
    <Check name="extended">Extended scales (Arab, Kharab, Neel, Padma)</Check>
    <p className="muted">Marathi, Gujarati, Tamil, and Bengali use experimental wording, pending native review.</p>
  </ToolForm>;
}

function Taxes({ gstRates, legacyGstRates }: { gstRates: readonly number[]; legacyGstRates: readonly number[] }) {
  return <>
    <p className="notice">Indicative estimates, not tax advice. Verify with official sources.</p>
    <div className="rates">
      <span>GST rates</span>{gstRates.map((rate) => <span className="chip" key={rate}>{rate}%</span>)}
      <span>Legacy</span>{legacyGstRates.map((rate) => <span className="chip" key={rate}>{rate}%</span>)}
    </div>
    <div className="calculator-grid">
      <div className="calculator"><h3>GST</h3>
        <ToolForm api="tax" action="Calculate GST" show={(data) => <Results data={data} />}
          build={(data) => ({ mode: 'gst', amount: toNumber(data, 'amount'), rate: toNumber(data, 'rate'),
            inclusive: data.has('inclusive'), interState: data.has('interState') })}>
          <Field name="amount" label="Amount (INR)" type="number" sample="1000" />
          <Field name="rate" label="Rate (%)" type="number" sample="18" />
          <Check name="inclusive">Tax-inclusive amount</Check><Check name="interState">Interstate supply</Check>
        </ToolForm>
      </div>
      <div className="calculator"><h3>TDS</h3>
        <ToolForm api="tax" action="Calculate TDS" show={(data) => <Results data={data} />}
          build={(data) => ({ mode: 'tds', amount: toNumber(data, 'amount'), rate: toNumber(data, 'rate'),
            threshold: toNumber(data, 'threshold'), hasPAN: data.has('hasPAN') })}>
          <Field name="amount" label="Amount (INR)" type="number" sample="50000" />
          <Field name="rate" label="Rate (%)" type="number" sample="10" />
          <Field name="threshold" label="Threshold (INR)" type="number" sample="30000" />
          <Check name="hasPAN" initial>PAN available</Check>
        </ToolForm>
      </div>
    </div>
    <div className="calculator"><h3>Income tax</h3>
      <ToolForm api="tax" action="Estimate income tax"
        build={(data) => ({ mode: 'income', amount: toNumber(data, 'amount'), fy: data.get('fy'), regime: data.get('regime') })}
        show={({ slabs, ...totals }) => <>
          <DataTable caption="Slab breakdown" columns={['From', 'Up to', 'Rate', 'Taxable', 'Tax']}
            rows={(slabs as Slab[]).map(({ from, upTo, rate, taxable, tax }) => [from, upTo ?? 'No limit', `${rate}%`, taxable, tax])} />
          <Results data={totals} />
        </>}>
        <div className="fields">
          <Field name="amount" label="Annual income (INR)" type="number" sample="1675000" />
          <Select name="fy" label="Year" options={years} defaultValue="2026-27" />
          <Select name="regime" label="Regime" options={['new', 'old']} />
        </div>
      </ToolForm>
    </div>
  </>;
}

function Dates({ date, fy }: { date: string; fy: string }) {
  return <ToolForm api="dates" action="Show financial dates"
    build={(data) => ({ date: data.get('date'), fy: data.get('fy'), type: data.get('type') })}
    show={({ year, quarter, dates }) => {
      const info = year as { label: string; assessmentYear: string };
      return <><Results data={{ 'Financial year': info.label, assessmentYear: info.assessmentYear, quarter }} />
        <DataTable caption="Due dates" columns={['Date']} rows={(dates as string[]).map((day) => [day])} /></>;
    }}>
    <div className="fields">
      <Field name="date" label="Calendar date" type="date" sample={date} />
      <Field name="fy" label="Financial year for due dates" sample={fy} />
      <Select name="type" label="Due date type" options={dateTypes} />
    </div>
    <p className="muted">Indicative, no holiday or extension adjustment</p>
  </ToolForm>;
}

const schemaExample = "const schema = { pan: 'pan', mobile: 'mobile' };";
const adapters = {
  Express: `const { validateRequest } = require('bharat-utils/express');
${schemaExample}
app.use(express.json());
app.post('/kyc', validateRequest(schema), (req, res) => {
  res.json(req.validated);
});`,
  Fastify: `const { validateRequest } = require('bharat-utils/fastify');
${schemaExample}
app.post('/kyc', { preHandler: validateRequest(schema) },
  async (request) => request.validated);`,
  Koa: `const { validateRequest } = require('bharat-utils/koa');
${schemaExample}
// Mount a JSON body parser before the router.
router.post('/kyc', validateRequest(schema), (ctx) => {
  ctx.body = ctx.state.validated;
});`,
};

function Kyc() {
  return <>
    <ToolForm api="kyc" action="Validate KYC form"
      build={(data) => Object.fromEntries(data)}
      show={({ data }) => <><h3>Normalized data</h3><Results data={data as Payload} /></>}>
      <div className="fields">
        <Field name="name" label="Name" sample="Demo User" />
        {['pan', 'mobile', 'ifsc', 'pincode', 'upi'].map((name) => <Field name={name} key={name} label={labelFor(name)} sample={samples[name]} />)}
        <Select name="lang" label="Error language" options={['en', 'hi']} />
      </div>
    </ToolForm>
    <div className="adapters">{Object.entries(adapters).map(([framework, snippet]) =>
      <details key={framework}><summary>{framework} middleware</summary><pre><code>{snippet}</code></pre></details>)}</div>
  </>;
}

const cli = [
  'npx bharat-utils validate pan ABCPE1234F',
  'npx bharat-utils redact "PAN ABCPE1234F"',
  'npx bharat-utils words 1250.50 --lang hi',
  'npx bharat-utils gst 1000 18',
  'npx bharat-utils tax 1200000 2026-27',
  'npx bharat-utils due 2026-27 advance-tax',
];

export default function Playground({ version, types, gstRates, legacyGstRates, date, fy }: {
  version: string; types: readonly string[]; gstRates: readonly number[]; legacyGstRates: readonly number[]; date: string; fy: string;
}) {
  const [theme, setTheme] = useState('system');
  return <div className="site" data-theme={theme}>
    <a className="skip" href="#main">Skip to tools</a>
    <div className="privacy">Use sample data only. Nothing is stored or logged.</div>
    <header className="hero wrap">
      <div className="brand"><span className="mark" aria-hidden="true">{'{ }'}</span><span>bharat-utils</span></div>
      <Select name="theme" label="Appearance" options={['system', 'light', 'dark']} onChange={setTheme} />
      <div className="intro">
        <h1>bharat-utils <span>playground</span></h1>
        <p>Validate Indian IDs, redact sensitive text, and explore rupee, tax, and financial-year tools.</p>
      </div>
    </header>
    <nav className="section-nav" aria-label="Playground sections">
      <div className="wrap">{nav.map(([id, title]) => <a href={`#${id}`} key={id}>{title}</a>)}</div>
    </nav>
    <main id="main" className="wrap main">
      <Section id="validate" title="ID validator" description="Check identifiers and inspect parsed details when available."><Validator types={types} /></Section>
      <Section id="pii" title="PII redactor" description="Mask selected identifiers and inspect findings with their original text offsets."><Redactor /></Section>
      <Section id="money" title="Money" description="Format rupees, parse the formatted value, and spell out amounts in six languages."><Money /></Section>
      <Section id="tax" title="GST, TDS and income tax" description="Calculate invoice tax, withholding, and income tax by year and regime."><Taxes gstRates={gstRates} legacyGstRates={legacyGstRates} /></Section>
      <Section id="dates" title="Financial year and due dates" description="Look up the financial year, assessment year, quarter, and due dates."><Dates date={date} fy={fy} /></Section>
      <Section id="kyc" title="KYC form validation" description="Validate and normalize a sample KYC submission through the API."><Kyc /></Section>
      <Section id="cli" title="Command line" description="Run the same utilities from a terminal."><pre className="cli"><code>{cli.join('\n')}</code></pre></Section>
    </main>
    <footer className="wrap footer">
      <span>{`Powered by bharat-utils v${version}`}</span>
      <a href="https://www.npmjs.com/package/bharat-utils">npm package</a>
      <a href="https://github.com/saransh752/bharat-utils">Library on GitHub</a>
    </footer>
  </div>;
}
