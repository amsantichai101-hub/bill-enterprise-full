'use client';

import { useEffect, useMemo, useState } from 'react';
import { demoState } from '@/data/demo';
import { calculateBill, getNetItemTotal } from '@/lib/calc';
import { saveBill } from '@/lib/repo';
import { BillState, Category, DrinkTier, Item, Person, SplitMode } from '@/lib/types';
import { clone, fmt, uid } from '@/lib/utils';

const categories: Category[] = ['food', 'drink', 'mixer', 'shared', 'personal'];
const splitModes: SplitMode[] = ['all', 'selected', 'owner', 'weighted-tier', 'none'];
const drinkTiers: DrinkTier[] = ['none', 'low', 'mid', 'high', 'heavy'];

function emptyPerson(): Person {
  return { id: uid(), name: '', active: true, drinkTier: 'mid' };
}

function emptyItem(): Item {
  return {
    id: uid(),
    name: '',
    category: 'food',
    qty: 1,
    unitPrice: 0,
    discountPercent: 0,
    splitMode: 'all',
    participantIds: [],
  };
}

export default function BillEditor({
  initialState,
  mode = 'create',
}: {
  initialState?: BillState;
  mode?: 'create' | 'edit';
}) {
  const [state, setState] = useState<BillState>(clone(initialState || demoState));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // สำคัญมาก: sync initialState ตอนหน้า edit โหลดข้อมูลจาก DB แบบ async
  useEffect(() => {
    if (initialState) {
      setState(clone(initialState));
    }
  }, [initialState]);

  const result = useMemo(() => calculateBill(state), [state]);

  const updatePerson = (id: string, patch: Partial<Person>) => {
    setState((prev) => ({
      ...prev,
      people: prev.people.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));
  };

  const updateItem = (id: string, patch: Partial<Item>) => {
    setState((prev) => ({
      ...prev,
      items: prev.items.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    }));
  };

  const onSave = async () => {
    setSaving(true);
    setMessage('');

    try {
      const billId = await saveBill(state);
      setState((prev) => ({ ...prev, id: String(billId) }));
      setMessage(`บันทึกสำเร็จ ✅ Bill ID: ${billId}`);
    } catch (e: any) {
      console.error('SAVE ERROR:', e);
      setMessage(`เกิดข้อผิดพลาด: ${e?.message || 'unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-wrap">
      <div className="hero card">
        <div>
          <div className="eyebrow">Bill Pro Final</div>
          <h1>{mode === 'create' ? 'สร้างบิลใหม่' : 'แก้ไขบิล'}</h1>
          <p>{mode === 'create'
            ? 'สร้างบิลใหม่และบันทึกลง Supabase'
            : 'แก้ไขบิลเดิม และบันทึกทับข้อมูลเดิมลง Supabase'}</p>
        </div>

        <div className="actions-row">
          <button
            className="btn secondary"
            onClick={() => setState(clone(demoState))}
          >
            โหลดตัวอย่าง
          </button>

          <button
            className="btn primary"
            onClick={onSave}
            disabled={saving}
          >
            {saving ? 'กำลังบันทึก...' : mode === 'create' ? 'Save to Supabase' : 'Update Bill'}
          </button>
        </div>
      </div>

      <div className="grid-top">
        <div className="card block">
          <h3>ข้อมูลบิล</h3>
          <div className="grid-form-2">
            <label>
              <span>ชื่อบิล</span>
              <input
                value={state.name}
                onChange={(e) => setState({ ...state, name: e.target.value })}
              />
            </label>

            <label>
              <span>วันที่</span>
              <input
                type="date"
                value={state.eventDate || ''}
                onChange={(e) => setState({ ...state, eventDate: e.target.value })}
              />
            </label>

            <label>
              <span>Tax %</span>
              <input
                type="number"
                value={state.settings.taxPercent}
                onChange={(e) =>
                  setState({
                    ...state,
                    settings: { ...state.settings, taxPercent: Number(e.target.value) },
                  })
                }
              />
            </label>

            <label>
              <span>Service %</span>
              <input
                type="number"
                value={state.settings.servicePercent}
                onChange={(e) =>
                  setState({
                    ...state,
                    settings: { ...state.settings, servicePercent: Number(e.target.value) },
                  })
                }
              />
            </label>

            <label>
              <span>Overall Discount</span>
              <input
                type="number"
                value={state.settings.overallDiscount}
                onChange={(e) =>
                  setState({
                    ...state,
                    settings: { ...state.settings, overallDiscount: Number(e.target.value) },
                  })
                }
              />
            </label>

            <label>
              <span>Shared Pool</span>
              <input
                type="number"
                value={state.settings.sharedPool}
                onChange={(e) =>
                  setState({
                    ...state,
                    settings: { ...state.settings, sharedPool: Number(e.target.value) },
                  })
                }
              />
            </label>
          </div>

          {message ? <p className="message">{message}</p> : null}
        </div>

        <div className="card block">
          <h3>Summary</h3>
          <div className="summary-list">
            <div><span>จำนวนคน active</span><strong>{result.summary.activePeople}</strong></div>
            <div><span>จำนวนรายการ</span><strong>{result.summary.itemCount}</strong></div>
            <div><span>Raw total</span><strong>{fmt(result.summary.rawSubTotal)}</strong></div>
            <div><span>Grand total</span><strong>{fmt(result.summary.grandTotal)}</strong></div>
          </div>
        </div>
      </div>

      <div className="grid-main">
        <section className="card block">
          <div className="section-title-row">
            <h3>รายการคน</h3>
            <button
              className="btn small"
              onClick={() =>
                setState((prev) => ({ ...prev, people: [...prev.people, emptyPerson()] }))
              }
            >
              + เพิ่มคน
            </button>
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>ชื่อ</th>
                  <th>Tier</th>
                  <th>Active</th>
                  <th>หมายเหตุ</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {state.people.map((person) => (
                  <tr key={person.id}>
                    <td>
                      <input
                        value={person.name}
                        onChange={(e) => updatePerson(person.id, { name: e.target.value })}
                      />
                    </td>
                    <td>
                      <select
                        value={person.drinkTier}
                        onChange={(e) =>
                          updatePerson(person.id, { drinkTier: e.target.value as DrinkTier })
                        }
                      >
                        {drinkTiers.map((tier) => (
                          <option key={tier} value={tier}>
                            {tier}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={person.active}
                        onChange={(e) => updatePerson(person.id, { active: e.target.checked })}
                      />
                    </td>
                    <td>
                      <input
                        value={person.note || ''}
                        onChange={(e) => updatePerson(person.id, { note: e.target.value })}
                      />
                    </td>
                    <td>
                      <button
                        className="icon-btn"
                        onClick={() =>
                          setState((prev) => ({
                            ...prev,
                            people: prev.people.filter((p) => p.id !== person.id),
                          }))
                        }
                      >
                        ลบ
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card block">
          <div className="section-title-row">
            <h3>ผลลัพธ์ต่อคน</h3>
          </div>

          <div className="result-list">
            {result.rows.map((row) => (
              <div className="result-card" key={row.personId}>
                <div>
                  <h4>{row.name}</h4>
                  <p>
                    กองกลาง {fmt(row.shared)} • Tier {fmt(row.weighted)} • ส่วนตัว {fmt(row.personal)}
                  </p>
                  <details>
                    <summary>ดูรายละเอียด</summary>
                    <ul>
                      {row.details.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  </details>
                </div>
                <div className="result-amount">{fmt(row.total)}</div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="card block">
        <div className="section-title-row">
          <h3>รายการบิล</h3>
          <button
            className="btn small"
            onClick={() =>
              setState((prev) => ({ ...prev, items: [...prev.items, emptyItem()] }))
            }
          >
            + เพิ่มรายการ
          </button>
        </div>

        <div className="table-wrap">
          <table className="table items-table">
            <thead>
              <tr>
                <th>ชื่อ</th>
                <th>หมวด</th>
                <th>Qty</th>
                <th>ราคา</th>
                <th>Discount %</th>
                <th>Split</th>
                <th>คนที่เกี่ยวข้อง</th>
                <th>สุทธิ</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {state.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <input
                      value={item.name}
                      onChange={(e) => updateItem(item.id, { name: e.target.value })}
                    />
                  </td>

                  <td>
                    <select
                      value={item.category}
                      onChange={(e) => updateItem(item.id, { category: e.target.value as Category })}
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td>
                    <input
                      type="number"
                      value={item.qty}
                      onChange={(e) => updateItem(item.id, { qty: Number(e.target.value) })}
                    />
                  </td>

                  <td>
                    <input
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) =>
                        updateItem(item.id, { unitPrice: Number(e.target.value) })
                      }
                    />
                  </td>

                  <td>
                    <input
                      type="number"
                      value={item.discountPercent}
                      onChange={(e) =>
                        updateItem(item.id, { discountPercent: Number(e.target.value) })
                      }
                    />
                  </td>

                  <td>
                    <select
                      value={item.splitMode}
                      onChange={(e) =>
                        updateItem(item.id, { splitMode: e.target.value as SplitMode })
                      }
                    >
                      {splitModes.map((mode) => (
                        <option key={mode} value={mode}>
                          {mode}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td>
                    {item.splitMode === 'owner' ? (
                      <select
                        value={item.ownerId || ''}
                        onChange={(e) => updateItem(item.id, { ownerId: e.target.value })}
                      >
                        <option value="">-- owner --</option>
                        {state.people.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name || 'ไม่มีชื่อ'}
                          </option>
                        ))}
                      </select>
                    ) : item.splitMode === 'selected' ? (
                      <div className="chips">
                        {state.people.map((p) => (
                          <button
                            type="button"
                            key={p.id}
                            className={`chip ${item.participantIds.includes(p.id) ? 'chip-on' : ''}`}
                            onClick={() =>
                              updateItem(item.id, {
                                participantIds: item.participantIds.includes(p.id)
                                  ? item.participantIds.filter((id) => id !== p.id)
                                  : [...item.participantIds, p.id],
                              })
                            }
                          >
                            {p.name || 'ไม่มีชื่อ'}
                          </button>
                        ))}
                      </div>
                    ) : item.splitMode === 'weighted-tier' ? (
                      <span className="muted">ใช้ drink tier อัตโนมัติ</span>
                    ) : (
                      <span className="muted">ไม่ต้องเลือก</span>
                    )}
                  </td>

                  <td>{fmt(getNetItemTotal(item.qty, item.unitPrice, item.discountPercent))}</td>

                  <td>
                    <button
                      className="icon-btn"
                      onClick={() =>
                        setState((prev) => ({
                          ...prev,
                          items: prev.items.filter((x) => x.id !== item.id),
                        }))
                      }
                    >
                      ลบ
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}