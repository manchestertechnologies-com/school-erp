import React, { useState } from 'react';
import { Shell } from '../../components/Shell';
import { api } from '../../lib/api';
import { Bar, Flash, Kpi, StudentSelect, useApi } from './common';

const NAV = [
  { id: 'fees', label: 'Fees & receipts', icon: '💳' }, { id: 'stationery', label: 'Stationery', icon: '✏️' },
  { id: 'students', label: 'Student records', icon: '🗂️' },
];

export function OfficePortal() {
  const [tab, setTab] = useState('fees');
  return (
    <Shell items={NAV} active={tab} onNav={setTab} title="Office" subtitle="Fees, stationery and student records.">
      {tab === 'fees' && <Fees />}
      {tab === 'stationery' && <Stationery />}
      {tab === 'students' && <Records />}
    </Shell>
  );
}

function Fees() {
  const students = useApi<any[]>('/students');
  const [sid, setSid] = useState<number | ''>('');
  const fees = useApi<any>(sid === '' ? null : `/fees/${sid}`, [sid]);
  const [amount, setAmount] = useState<Record<number, string>>({});
  const [msg, setMsg] = useState('');
  const [kind, setKind] = useState<'ok' | 'err'>('ok');

  async function pay(feeId: number) {
    try {
      const r = await api(`/fees/${feeId}/payments`, { method: 'POST', body: { amount: Number(amount[feeId]) } });
      setKind('ok'); setMsg(`Payment recorded. Receipt ${r.receipt_no}.`); setAmount({ ...amount, [feeId]: '' }); fees.reload();
    } catch (e: any) { setKind('err'); setMsg(e.message); }
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div className="card" style={{ maxWidth: 520 }}>
        <label className="field">Student<StudentSelect value={sid} onChange={setSid} students={students.data || []} /></label>
      </div>
      {sid !== '' && fees.data && (
        <>
          <div className="grid-auto">
            <Kpi label="Outstanding (₹)" value={Math.round(fees.data.outstanding)} />
          </div>
          <div className="card">
            <table className="t"><thead><tr><th>Term</th><th>Due</th><th>Amount</th><th>Paid</th><th>Pay now</th></tr></thead>
              <tbody>{fees.data.items.map((f: any) => (
                <tr key={f.id}><td>{f.term}</td><td>{f.due_date}</td><td>₹{f.amount_due}</td><td>₹{f.paid}</td>
                  <td><div className="row">
                    <input className="input" style={{ width: 120 }} type="number" min={1} value={amount[f.id] || ''} onChange={(e) => setAmount({ ...amount, [f.id]: e.target.value })} aria-label={`Amount for ${f.term}`} />
                    <button className="btn primary" disabled={!amount[f.id] || f.paid >= f.amount_due} onClick={() => pay(f.id)}>Record</button>
                  </div></td></tr>
              ))}</tbody></table>
            <div style={{ marginTop: 10 }}><Flash msg={msg} kind={kind} /></div>
          </div>
          <div className="card">
            <h3 style={{ marginBottom: 10 }}>Receipts</h3>
            {fees.data.receipts.length === 0 ? <div className="empty">No receipts yet.</div> : (
              <table className="t"><thead><tr><th>Receipt</th><th>Term</th><th>Amount</th><th>Date</th></tr></thead>
                <tbody>{fees.data.receipts.map((r: any) => <tr key={r.receipt_no}><td>{r.receipt_no}</td><td>{r.term}</td><td>₹{r.amount}</td><td>{String(r.paid_on).slice(0, 10)}</td></tr>)}</tbody></table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Stationery() {
  const items = useApi<any[]>('/stationery');
  const students = useApi<any[]>('/students');
  const [f, setF] = useState({ item_id: '', kind: 'ISSUE', qty: '', class_id: '', note: '' });
  const [msg, setMsg] = useState('');
  const [kind, setKind] = useState<'ok' | 'err'>('ok');
  const classes = Array.from(new Map((students.data || []).map((s) => [s.class_id, s.class_name])).entries());

  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api('/stationery/movements', { method: 'POST', body: { item_id: Number(f.item_id), kind: f.kind, qty: Number(f.qty), class_id: f.class_id ? Number(f.class_id) : null, note: f.note } });
      setKind('ok'); setMsg('Stock updated.'); setF({ ...f, qty: '', note: '' }); items.reload();
    } catch (err: any) { setKind('err'); setMsg(err.message); }
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div className="card" style={{ display: 'grid', gap: 12 }}>
        <div className="spread"><h3>Stock and consumption</h3><span className="muted" style={{ fontSize: 14 }}>Consumption % = issued ÷ total stock × 100</span></div>
        {!items.data ? <div className="skeleton" /> : (
          <table className="t"><thead><tr><th>Item</th><th>Total</th><th>Issued</th><th>Returned</th><th>Damaged</th><th>Available</th><th style={{ minWidth: 160 }}>Consumption</th></tr></thead>
            <tbody>{items.data.map((i) => (
              <tr key={i.id}><td>{i.name}{i.low_stock && <span className="pill bad" style={{ marginLeft: 6 }}>Reorder</span>}</td>
                <td>{i.total_stock}</td><td>{i.issued}</td><td>{i.returned}</td><td>{i.damaged}</td><td>{i.available}</td>
                <td><div className="spread" style={{ fontSize: 13 }}><span>{i.consumption_percent}%</span></div><Bar percent={i.consumption_percent} /></td></tr>
            ))}</tbody></table>
          )}
      </div>
      <form className="card" onSubmit={save} style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', alignItems: 'end' }}>
        <label className="field">Item<select className="select" required value={f.item_id} onChange={(e) => setF({ ...f, item_id: e.target.value })}><option value="">Choose</option>{(items.data || []).map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select></label>
        <label className="field">Movement<select className="select" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
          <option value="IN">Received</option><option value="ISSUE">Issued</option><option value="RETURN">Returned</option><option value="DAMAGE">Damaged</option></select></label>
        <label className="field">Quantity<input className="input" type="number" min={1} required value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value })} /></label>
        <label className="field">Class (optional)<select className="select" value={f.class_id} onChange={(e) => setF({ ...f, class_id: e.target.value })}><option value="">—</option>{classes.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
        <label className="field">Note<input className="input" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></label>
        <button className="btn primary" type="submit">Record movement</button>
        <div style={{ gridColumn: '1 / -1' }}><Flash msg={msg} kind={kind} /></div>
      </form>
    </div>
  );
}

function Records() {
  const s = useApi<any[]>('/students');
  return (
    <div className="card">
      {!s.data ? <div className="skeleton" /> : (
        <table className="t"><thead><tr><th>Admission</th><th>Name</th><th>Gender</th><th>Class</th></tr></thead>
          <tbody>{s.data.map((r) => <tr key={r.id}><td>{r.admission_no}</td><td>{r.name}</td><td>{r.gender}</td><td>{r.class_name}</td></tr>)}</tbody></table>
      )}
    </div>
  );
}
