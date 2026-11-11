// =============================================================================
// LeadForm — "Ask a question" / "Book test drive" on the vehicle page.
// Leads are the main business goal of a dealer site: every submission is
// saved to the database and appears in the dealer dashboard's Leads tab.
// =============================================================================
import { useState } from 'react';
import { api, ApiError } from '../api';

type LeadType = 'inquiry' | 'test_drive';

export default function LeadForm({ vehicleId, vehicleTitle }: { vehicleId: number; vehicleTitle: string }) {
  const [type, setType] = useState<LeadType>('inquiry');
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: `Hi, I'm interested in the ${vehicleTitle}. Is it still available?` });
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Form "state machine": idle → sending → sent (or back to idle on error).
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');

  // Returns an onChange handler that updates one field of the form object.
  const set =(k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); // stop the browser's default full-page form submit
    setState('sending');
    try {
      await api.createLead({ ...form, type, vehicleId });
      setState('sent');
    } catch (err) {
      setErrors(err instanceof ApiError ? err.fields : { form: 'Something went wrong' });
      setState('idle');
    }
  };

  if (state === 'sent') {
    return (
      <div className="card p-5 text-center">
        <p className="text-2xl">✓</p>
        <p className="mt-1 font-semibold text-ink">Thanks, {form.name.split(' ')[0]}!</p>
        <p className="text-sm text-slate-500">A specialist will reach out shortly. (Demo: your lead now shows in the dealer dashboard.)</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card space-y-3 p-5" noValidate>
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
        {(['inquiry', 'test_drive'] as LeadType[]).map((t) => (
          <button type="button" key={t} onClick={() => setType(t)}
            className={`rounded-md py-1.5 text-sm font-medium ${type === t ? 'bg-white text-ink shadow' : 'text-slate-500'}`}>
            {t === 'inquiry' ? 'Ask a question' : 'Book test drive'}
          </button>
        ))}
      </div>
      <Field label="Name" error={errors.name}><input className="input" value={form.name} onChange={set('name')} autoComplete="name" /></Field>
      <Field label="Email" error={errors.email}><input className="input" type="email" value={form.email} onChange={set('email')} autoComplete="email" /></Field>
      <Field label="Phone (optional)"><input className="input" type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" /></Field>
      <Field label="Message"><textarea className="input" rows={3} value={form.message} onChange={set('message')} /></Field>
      {errors.form && <p className="text-sm text-red-600">{errors.form}</p>}
      <button className="btn-dark w-full" disabled={state === 'sending'}>{state === 'sending' ? 'Sending…' : type === 'inquiry' ? 'Send message' : 'Request test drive'}</button>
    </form>
  );
}

/** Label + input + error message. Exported so other forms (Financing) reuse it. */
export function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}
