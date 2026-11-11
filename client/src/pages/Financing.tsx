// =============================================================================
// Pre-qualification — /financing
//
// A 3-step "soft pull" style form: About you → Income → Review & consent.
// Breaking a long form into steps raises completion rates (an important
// metric for dealers) and lets us validate as we go.
//
// The server passes the answers to a CreditProvider adapter. In this demo it's
// a mock; in production it'd be 700Credit / RouteOne / Dealertrack.
// We deliberately DON'T ask for SSN or date of birth: a soft pre-qual doesn't
// need them, and not collecting sensitive data is the safest way to protect it.
// =============================================================================
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../api';
import { Field } from '../components/LeadForm';
import { money } from '../lib/format';
import { calculatePayment } from '../lib/payment';
import type { PrequalResult, Vehicle } from '../types';

// All form fields in one object. Strings because <input> values are strings;
// we convert to numbers when sending.
const EMPTY = {
  firstName: '', lastName: '', email: '', phone: '', zip: '',
  employmentStatus: 'employed', monthlyIncome: '', monthlyHousing: '', creditBand: 'good',
  consent: false,
};
type Form = typeof EMPTY;

const STEPS = ['About you', 'Income', 'Review'];

export default function Financing() {
  // Optional ?vehicleId=12 — if the shopper came from a car page, we show that car.
  const [params] = useSearchParams();
  const vehicleId = params.get('vehicleId') ? Number(params.get('vehicleId')) : undefined;

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<PrequalResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = 'Get pre-qualified · Northline Motors';
    if (vehicleId) api.vehicle(vehicleId).then((r) => setVehicle(r.vehicle)).catch(() => {});
  }, [vehicleId]);

  // Small helper that returns an onChange handler for a given field name.
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value });

  /** Client-side validation for the current step. Returns true if OK to continue.
   *  (The server validates again — never trust the browser alone.) */
  const validate = (s: number) => {
    const e: Record<string, string> = {};
    if (s === 0) {
      if (!form.firstName.trim()) e.firstName = 'Required';
      if (!form.lastName.trim()) e.lastName = 'Required';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email';
      if (form.zip && !/^\d{5}$/.test(form.zip)) e.zip = '5-digit ZIP';
    }
    if (s === 1) {
      if (!(Number(form.monthlyIncome) > 0)) e.monthlyIncome = 'Enter your gross monthly income';
      if (form.monthlyHousing && Number(form.monthlyHousing) < 0) e.monthlyHousing = 'Must be 0 or more';
    }
    if (s === 2 && !form.consent) e.consent = 'Please agree to continue';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => validate(step) && setStep(step + 1);

  const submit = async () => {
    if (!validate(2)) return;
    setSubmitting(true);
    try {
      const r = await api.prequal({ ...form, vehicleId, monthlyIncome: Number(form.monthlyIncome), monthlyHousing: Number(form.monthlyHousing) || 0 });
      setResult(r);
    } catch (err) {
      // Server-side validation errors come back as { field: message }.
      // Other errors (e.g. 429 from the rate limiter) are shown as one message.
      if (err instanceof ApiError && Object.keys(err.fields).length) setErrors(err.fields);
      else setErrors({ form: err instanceof Error ? err.message : 'Something went wrong. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  // ---------- Result screen ----------
  if (result) {
    // If they came from a vehicle, estimate that car's payment at their APR.
    const est = vehicle && calculatePayment({ price: vehicle.price, downPayment: vehicle.price * 0.1, tradeInValue: 0, tradeInPayoff: 0, aprPercent: result.estimatedApr, termMonths: 72, taxRatePercent: 6, fees: 450 });
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="card p-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-green-700">{result.approved ? "You're pre-qualified!" : 'Thanks for applying'}</p>
          <h1 className="mt-2 text-3xl font-bold text-ink">Up to {money(result.maxAmount)}</h1>
          <p className="mt-1 text-slate-500">Estimated APR {result.estimatedApr}% · {result.tier} credit tier · up to {money(result.maxPayment)}/mo</p>
          {est && (
            <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">
              The <strong>{vehicle!.year} {vehicle!.make} {vehicle!.model}</strong> would be about <strong>{money(est.monthly)}/mo</strong> (10% down, 72 months).
            </p>
          )}
          <p className="mt-4 text-xs text-slate-400">Reference {result.reference}. Simulated decision for demo purposes — no credit bureau was contacted.</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link to={vehicle ? `/vehicles/${vehicle.id}` : '/inventory'} className="btn-dark">{vehicle ? 'Back to vehicle' : 'Shop within budget'}</Link>
            <Link to={`/inventory?maxPrice=${result.maxAmount}`} className="btn-ghost">See cars under {money(result.maxAmount)}</Link>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Form ----------
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold text-ink">Get pre-qualified</h1>
      <p className="mt-1 text-slate-500">See your rate in about 2 minutes. Checking won't affect your credit score.</p>

      {vehicle && (
        <div className="card mt-5 flex items-center gap-4 p-3">
          <img src={vehicle.photos[0]} alt="" className="h-14 w-20 rounded object-cover" />
          <div className="text-sm"><p className="font-semibold text-ink">{vehicle.year} {vehicle.make} {vehicle.model}</p><p className="text-slate-500">{money(vehicle.price)}</p></div>
        </div>
      )}

      {/* Step indicator */}
      <ol className="mt-6 flex gap-2" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li key={s} className="flex-1">
            <div className={`h-1.5 rounded-full ${i <= step ? 'bg-ink' : 'bg-slate-200'}`} />
            <p className={`mt-1 text-xs ${i === step ? 'font-semibold text-ink' : 'text-slate-400'}`} aria-current={i === step ? 'step' : undefined}>{i + 1}. {s}</p>
          </li>
        ))}
      </ol>

      <div className="card mt-6 space-y-4 p-6">
        {step === 0 && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First name" error={errors.firstName}><input className="input" value={form.firstName} onChange={set('firstName')} autoComplete="given-name" /></Field>
              <Field label="Last name" error={errors.lastName}><input className="input" value={form.lastName} onChange={set('lastName')} autoComplete="family-name" /></Field>
            </div>
            <Field label="Email" error={errors.email}><input className="input" type="email" value={form.email} onChange={set('email')} autoComplete="email" /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Mobile phone (optional)"><input className="input" type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" /></Field>
              <Field label="ZIP code" error={errors.zip}><input className="input" inputMode="numeric" maxLength={5} value={form.zip} onChange={set('zip')} autoComplete="postal-code" /></Field>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <Field label="Employment status">
              <select className="input" value={form.employmentStatus} onChange={set('employmentStatus')}>
                <option value="employed">Employed</option><option value="self">Self-employed</option><option value="retired">Retired</option><option value="other">Other</option>
              </select>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Gross monthly income ($)" error={errors.monthlyIncome}><input className="input" inputMode="numeric" value={form.monthlyIncome} onChange={set('monthlyIncome')} placeholder="e.g. 4500" /></Field>
              <Field label="Monthly rent / mortgage ($)" error={errors.monthlyHousing}><input className="input" inputMode="numeric" value={form.monthlyHousing} onChange={set('monthlyHousing')} placeholder="e.g. 1200" /></Field>
            </div>
            <Field label="How would you rate your credit?">
              <select className="input" value={form.creditBand} onChange={set('creditBand')}>
                <option value="excellent">Excellent (720+)</option><option value="good">Good (660–719)</option><option value="fair">Fair (600–659)</option><option value="poor">Rebuilding (below 600)</option>
              </select>
            </Field>
          </>
        )}

        {step === 2 && (
          <>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <Review k="Name" v={`${form.firstName} ${form.lastName}`} />
              <Review k="Email" v={form.email} />
              <Review k="Monthly income" v={money(Number(form.monthlyIncome) || 0)} />
              <Review k="Housing" v={money(Number(form.monthlyHousing) || 0)} />
            </dl>
            {/* Consent language is required for real credit pulls (FCRA). Real copy comes from the lender/compliance team. */}
            <label className="flex items-start gap-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
              <input type="checkbox" className="mt-0.5 h-4 w-4 accent-ink" checked={form.consent} onChange={set('consent')} />
              <span>I authorize Northline Motors and its lending partners to obtain my credit report for pre-qualification. This is a soft inquiry and will not affect my credit score. <em>(Demo text.)</em></span>
            </label>
            {errors.consent && <p className="text-xs text-red-600">{errors.consent}</p>}
            {errors.form && <p className="text-sm text-red-600">{errors.form}</p>}
          </>
        )}

        <div className="flex justify-between pt-2">
          <button className="btn-ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>Back</button>
          {step < STEPS.length - 1
            ? <button className="btn-dark" onClick={next}>Continue</button>
            : <button className="btn-primary" onClick={submit} disabled={submitting}>{submitting ? 'Checking…' : 'See my rate'}</button>}
        </div>
      </div>
    </div>
  );
}

function Review({ k, v }: { k: string; v: string }) {
  return <div><dt className="text-xs text-slate-500">{k}</dt><dd className="font-medium text-ink">{v}</dd></div>;
}
