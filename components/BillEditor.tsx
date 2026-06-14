'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { demoState } from '@/data/demo';
import { calculateBill, getNetItemTotal } from '@/lib/calc';
import { saveBill } from '@/lib/repo';
import { BillState, Category, DrinkTier, Item, Person, SplitMode } from '@/lib/types';
import { clone, fmt, uid } from '@/lib/utils';

const categories: Category[] = ['food', 'drink', 'mixer', 'shared', 'personal'];
const splitModes: SplitMode[] = ['all', 'selected', 'owner', 'weighted-tier', 'none'];
const drinkTiers: DrinkTier[] = ['none', 'low', 'mid', 'high', 'heavy'];

const categoryLabels: Record<Category, string> = {
  food: 'อาหาร',
  drink: 'เครื่องดื่ม',
  mixer: 'มิกเซอร์',
  shared: 'กองกลาง',
  personal: 'ส่วนตัว',
};

const splitModeLabels: Record<SplitMode, string> = {
  all: 'หารทุกคน',
  selected: 'เลือกเฉพาะคน',
  owner: 'เฉพาะเจ้าของ',
  'weighted-tier': 'ตามระดับการดื่ม',
  none: 'ไม่ต้องหาร',
};

const drinkTierLabels: Record<DrinkTier, string> = {
  none: 'ไม่ดื่ม',
  low: 'น้อย',
  mid: 'ปานกลาง',
  high: 'มาก',
  heavy: 'มากเป็นพิเศษ',
};

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

function todayString() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function newBlankBill(): BillState {
  const base: any = clone(demoState);
  delete base.id;

  return {
    ...base,
    name: '',
    eventDate: todayString(),
    people: [],
    items: [],
    settings: {
      ...base.settings,
      overallDiscount: 0,
      sharedPool: 0,
    },
  } as BillState;
}

function normalizeImportedBill(raw: any): BillState {
  const base: any = clone(demoState);

  const normalized: any = {
    ...base,
    ...raw,
    settings: {
      ...base.settings,
      ...(raw?.settings || {}),
    },
    people: Array.isArray(raw?.people)
      ? raw.people.map((p: any) => ({
          id: p?.id || uid(),
          name: p?.name || '',
          active: typeof p?.active === 'boolean' ? p.active : true,
          drinkTier: drinkTiers.includes(p?.drinkTier) ? p.drinkTier : 'mid',
          note: p?.note || '',
        }))
      : [],
    items: Array.isArray(raw?.items)
      ? raw.items.map((it: any) => ({
          id: it?.id || uid(),
          name: it?.name || '',
          category: categories.includes(it?.category) ? it.category : 'food',
          qty: Number(it?.qty || 0),
          unitPrice: Number(it?.unitPrice || 0),
          discountPercent: Number(it?.discountPercent || 0),
          splitMode: splitModes.includes(it?.splitMode) ? it.splitMode : 'all',
          participantIds: Array.isArray(it?.participantIds) ? it.participantIds : [],
          ownerId: it?.ownerId || '',
        }))
      : [],
  };

  return normalized as BillState;
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

function dataUrlToImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(' ');
  let line = '';
  let currentY = y;

  for (let i = 0; i < words.length; i += 1) {
    const testLine = line + words[i] + ' ';
    const width = ctx.measureText(testLine).width;

    if (width > maxWidth && i > 0) {
      ctx.fillText(line.trim(), x, currentY);
      line = `${words[i]} `;
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }

  if (line.trim()) {
    ctx.fillText(line.trim(), x, currentY);
    currentY += lineHeight;
  }

  return currentY;
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
  const [shareImageDataUrl, setShareImageDataUrl] = useState<string>('');
  const [exportingImage, setExportingImage] = useState(false);

  const importJsonRef = useRef<HTMLInputElement | null>(null);
  const attachImageRef = useRef<HTMLInputElement | null>(null);

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
      setState((prev) => ({ ...prev, id: String(billId) } as BillState));
      setMessage(`บันทึกสำเร็จ ✅ Bill ID: ${billId}`);
    } catch (e: any) {
      console.error('SAVE ERROR:', e);
      setMessage(`เกิดข้อผิดพลาด: ${e?.message || 'unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const onClearAll = () => {
    const confirmed = window.confirm(
      'ต้องการล้างข้อมูลทั้งหมดในหน้านี้ใช่หรือไม่?\nข้อมูลที่ยังไม่ได้บันทึกจะหายไป',
    );
    if (!confirmed) return;

    setState(newBlankBill());
    setShareImageDataUrl('');
    setMessage('ล้างข้อมูลทั้งหมดแล้ว');
  };

  const onRollForward = () => {
    const next: any = clone(state);
    delete next.id;
    next.eventDate = todayString();
    next.name = state.name ? `${state.name} - ต่อรอบ ${todayString()}` : `บิลใหม่ ${todayString()}`;
    setState(next as BillState);
    setMessage('สร้างร่างบิลใหม่จากข้อมูลเดิมแล้ว (Roll Forward)');
  };

  const onImportJsonClick = () => {
    importJsonRef.current?.click();
  };

  const onAttachImageClick = () => {
    attachImageRef.current?.click();
  };

  const onImportJson = async (file?: File) => {
    if (!file) return;

    try {
      const text = await file.text();
      const raw = JSON.parse(text);
      const nextState = normalizeImportedBill(raw);
      setState(nextState);
      setMessage(`นำเข้า JSON สำเร็จ: ${file.name}`);
    } catch (e: any) {
      console.error(e);
      setMessage(`นำเข้า JSON ไม่สำเร็จ: ${e?.message || 'invalid file'}`);
    }
  };

  const onAttachImage = async (file?: File) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setShareImageDataUrl(String(reader.result || ''));
      setMessage(`แนบรูปเรียบร้อย: ${file.name}`);
    };
    reader.onerror = () => {
      setMessage('ไม่สามารถอ่านไฟล์รูปได้');
    };
    reader.readAsDataURL(file);
  };

  const onExportJson = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      state,
      result,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const name = `${(state.name || 'bill').replace(/[^\wก-๙-]+/g, '_')}_export.json`;
    downloadBlob(blob, name);
    setMessage('ส่งออก JSON เรียบร้อยแล้ว');
  };

  const onExportShareImage = async () => {
    try {
      setExportingImage(true);

      const width = 1400;
      const padding = 44;
      const rowHeight = 42;
      const headerHeight = 220;
      const summaryHeight = 180;
      const rowsHeight = Math.max(result.rows.length, 1) * rowHeight + 120;
      const attachAreaHeight = shareImageDataUrl ? 240 : 80;
      const height = headerHeight + summaryHeight + rowsHeight + attachAreaHeight + 80;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not available');

      // background
      ctx.fillStyle = '#f5f7fb';
      ctx.fillRect(0, 0, width, height);

      // main white card
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(24, 24, width - 48, height - 48, 28);
      ctx.fill();

      // header
      ctx.fillStyle = '#2563eb';
      ctx.beginPath();
      ctx.roundRect(24, 24, width - 48, 170, 28);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font =
        '700 24px -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", Arial, sans-serif';
      ctx.fillText('สรุปผลบิล', padding + 10, 82);

      ctx.font =
        '800 44px -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", Arial, sans-serif';
      ctx.fillText(state.name || 'ไม่ระบุชื่อบิล', padding + 10, 140);

      ctx.font =
        '400 22px -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Arial, sans-serif';
      ctx.fillText(`วันที่: ${state.eventDate || '-'}`, padding + 10, 180);

      // summary cards
      const boxY = 220;
      const boxW = (width - padding * 2 - 24) / 4;
      const summaryItems = [
        { label: 'จำนวนคน', value: String(result.summary.activePeople) },
        { label: 'จำนวนรายการ', value: String(result.summary.itemCount) },
        { label: 'ยอดรวมก่อนคำนวณ', value: fmt(result.summary.rawSubTotal) },
        { label: 'ยอดรวมสุทธิ', value: fmt(result.summary.grandTotal) },
      ];

      summaryItems.forEach((s, i) => {
        const x = padding + i * (boxW + 8);
        ctx.fillStyle = '#f8fbff';
        ctx.beginPath();
        ctx.roundRect(x, boxY, boxW, 120, 22);
        ctx.fill();

        ctx.strokeStyle = '#dbeafe';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(x, boxY, boxW, 120, 22);
        ctx.stroke();

        ctx.fillStyle = '#64748b';
        ctx.font =
          '500 18px -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Arial, sans-serif';
        ctx.fillText(s.label, x + 18, boxY + 36);

        ctx.fillStyle = '#0f172a';
        ctx.font =
          '800 30px -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", Arial, sans-serif';
        ctx.fillText(s.value, x + 18, boxY + 84);
      });

      // section title
      const tableStartY = 390;
      ctx.fillStyle = '#111827';
      ctx.font =
        '800 28px -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", Arial, sans-serif';
      ctx.fillText('ผลลัพธ์รายบุคคล', padding, tableStartY);

      // table header
      const tableY = tableStartY + 34;
      ctx.fillStyle = '#eff6ff';
      ctx.beginPath();
      ctx.roundRect(padding, tableY, width - padding * 2, 46, 16);
      ctx.fill();

      ctx.fillStyle = '#1e3a8a';
      ctx.font =
        '700 18px -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Arial, sans-serif';
      ctx.fillText('ชื่อ', padding + 18, tableY + 30);
      ctx.fillText('รายละเอียด', padding + 260, tableY + 30);
      ctx.fillText('ยอดรวม', width - padding - 160, tableY + 30);

      let currentY = tableY + 74;

      result.rows.forEach((row, index) => {
        const y = currentY + index * rowHeight;

        if (index % 2 === 0) {
          ctx.fillStyle = '#fafcff';
          ctx.fillRect(padding, y - 24, width - padding * 2, rowHeight);
        }

        ctx.fillStyle = '#111827';
        ctx.font =
          '700 18px -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Arial, sans-serif';
        ctx.fillText(row.name || 'ไม่มีชื่อ', padding + 18, y);

        ctx.fillStyle = '#6b7280';
        ctx.font =
          '400 16px -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Arial, sans-serif';
        const detailText = `กองกลาง ${fmt(row.shared)} • Tier ${fmt(row.weighted)} • ส่วนตัว ${fmt(row.personal)}`;
        wrapText(ctx, detailText, padding + 260, y, width - 580, 20);

        ctx.fillStyle = '#111827';
        ctx.font =
          '800 18px -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", Arial, sans-serif';
        ctx.fillText(fmt(row.total), width - padding - 160, y);
      });

      let footerY = tableY + 74 + result.rows.length * rowHeight + 40;

      // attached image area
      ctx.fillStyle = '#111827';
      ctx.font =
        '800 24px -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", Arial, sans-serif';
      ctx.fillText('ข้อมูลเพิ่มเติม', padding, footerY);

      footerY += 20;

      ctx.fillStyle = '#64748b';
      ctx.font =
        '400 18px -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Arial, sans-serif';

      if (shareImageDataUrl) {
        ctx.fillText('แนบรูปประกอบเรียบร้อย', padding, footerY + 28);

        const qr = await dataUrlToImage(shareImageDataUrl);
        const qrSize = 180;
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.roundRect(padding, footerY + 50, qrSize + 24, qrSize + 24, 18);
        ctx.fill();

        ctx.drawImage(qr, padding + 12, footerY + 62, qrSize, qrSize);
      } else {
        ctx.fillText('ไม่มีรูปประกอบ', padding, footerY + 28);
      }

      ctx.fillStyle = '#94a3b8';
      ctx.font =
        '400 16px -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Arial, sans-serif';
      ctx.fillText(
        `ส่งออกเมื่อ ${new Date().toLocaleString('th-TH')}`,
        padding,
        height - 40,
      );

      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${(state.name || 'bill').replace(/[^\wก-๙-]+/g, '_')}_result.png`;
      a.click();

      setMessage('ส่งออกผลลัพธ์เป็นรูปภาพเรียบร้อยแล้ว');
    } catch (e: any) {
      console.error(e);
      setMessage(`ส่งออกรูปภาพไม่สำเร็จ: ${e?.message || 'unknown error'}`);
    } finally {
      setExportingImage(false);
    }
  };

  return (
    <div className="page-shell">
      <div className="page-wrap">
        <div className="hero card">
          <div className="hero-content">
            <div className="eyebrow">Bill Pro Final</div>
            <h1>{mode === 'create' ? 'ระบบจัดการบิล' : 'แก้ไขบิล'}</h1>
            <p>
              {mode === 'create'
                ? 'กรอกข้อมูล คำนวณค่าใช้จ่าย และส่งออกผลลัพธ์เพื่อแชร์ได้ในหน้าเดียว'
                : 'แก้ไขข้อมูลเดิม พร้อมสร้างบิลรอบใหม่หรือส่งออกผลลัพธ์ได้ทันที'}
            </p>
          </div>

          <div className="actions-row actions-row-mobile">
            <button className="btn secondary" onClick={onClearAll} type="button">
              เคลียร์ทั้งหมด
            </button>
            <button className="btn secondary" onClick={onRollForward} type="button">
              Roll Forward
            </button>
            <button className="btn secondary" onClick={onExportShareImage} type="button" disabled={exportingImage}>
              {exportingImage ? 'กำลังสร้างรูป...' : 'ส่งออกเป็นรูป'}
            </button>
            <button className="btn primary" onClick={onSave} disabled={saving} type="button">
              {saving ? 'กำลังบันทึก...' : mode === 'create' ? 'บันทึกบิล' : 'อัปเดตบิล'}
            </button>
          </div>
        </div>

        <section className="card block tools-panel">
          <div className="section-title-row">
            <h3>เครื่องมือเพิ่มเติม</h3>
          </div>

          <div className="tools-grid">
            <button className="btn secondary" type="button" onClick={onImportJsonClick}>
              Import JSON
            </button>

            <button className="btn secondary" type="button" onClick={onExportJson}>
              Export JSON
            </button>

            <button className="btn secondary" type="button" onClick={onAttachImageClick}>
              แนบรูปประกอบ / QR
            </button>

            <button
              className="btn secondary"
              type="button"
              onClick={() => {
                setShareImageDataUrl('');
                setMessage('ลบรูปประกอบแล้ว');
              }}
              disabled={!shareImageDataUrl}
            >
              ลบรูปแนบ
            </button>
          </div>

          <input
            ref={importJsonRef}
            type="file"
            accept=".json,application/json"
            style={{ display: 'none' }}
            onChange={(e) => onImportJson(e.target.files?.[0])}
          />

          <input
            ref={attachImageRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => onAttachImage(e.target.files?.[0])}
          />

          {shareImageDataUrl ? (
            <div className="attached-preview">
              <div className="attached-preview-text">
                <strong>รูปประกอบที่แนบไว้</strong>
                <span>ระบบจะนำรูปนี้ไปวางในไฟล์รูปที่ส่งออก เช่น QR สำหรับชำระเงิน</span>
              </div>
              <img src={shareImageDataUrl} alt="Attached share image" className="attached-preview-img" />
            </div>
          ) : (
            <p className="muted">
              ยังไม่ได้แนบรูปประกอบ หากต้องการส่ง QR ให้เพื่อน ให้แนบรูปก่อนกดส่งออกเป็นรูป
            </p>
          )}
        </section>

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
                <span>ภาษี (%)</span>
                <input
                  type="number"
                  value={state.settings.taxPercent}
                  onChange={(e) =>
                    setState({
                      ...state,
                      settings: {
                        ...state.settings,
                        taxPercent: Number(e.target.value),
                      },
                    })
                  }
                />
              </label>

              <label>
                <span>Service Charge (%)</span>
                <input
                  type="number"
                  value={state.settings.servicePercent}
                  onChange={(e) =>
                    setState({
                      ...state,
                      settings: {
                        ...state.settings,
                        servicePercent: Number(e.target.value),
                      },
                    })
                  }
                />
              </label>

              <label>
                <span>ส่วนลดรวม</span>
                <input
                  type="number"
                  value={state.settings.overallDiscount}
                  onChange={(e) =>
                    setState({
                      ...state,
                      settings: {
                        ...state.settings,
                        overallDiscount: Number(e.target.value),
                      },
                    })
                  }
                />
              </label>

              <label>
                <span>กองกลางเพิ่มเติม</span>
                <input
                  type="number"
                  value={state.settings.sharedPool}
                  onChange={(e) =>
                    setState({
                      ...state,
                      settings: {
                        ...state.settings,
                        sharedPool: Number(e.target.value),
                      },
                    })
                  }
                />
              </label>
            </div>

            {message ? <p className="message">{message}</p> : null}
          </div>

          <div className="card block">
            <h3>สรุปผล</h3>
            <div className="summary-list">
              <div>
                <span>จำนวนคนที่ใช้งาน</span>
                <strong>{result.summary.activePeople}</strong>
              </div>
              <div>
                <span>จำนวนรายการ</span>
                <strong>{result.summary.itemCount}</strong>
              </div>
              <div>
                <span>ยอดรวมก่อนคำนวณ</span>
                <strong>{fmt(result.summary.rawSubTotal)}</strong>
              </div>
              <div>
                <span>ยอดรวมสุทธิ</span>
                <strong>{fmt(result.summary.grandTotal)}</strong>
              </div>
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
                  setState((prev) => ({
                    ...prev,
                    people: [...prev.people, emptyPerson()],
                  }))
                }
                type="button"
              >
                + เพิ่มคน
              </button>
            </div>

            {/* Desktop / Tablet */}
            <div className="table-wrap desktop-only">
              <table className="table">
                <thead>
                  <tr>
                    <th>ชื่อ</th>
                    <th>ระดับ</th>
                    <th>ใช้งาน</th>
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
                            updatePerson(person.id, {
                              drinkTier: e.target.value as DrinkTier,
                            })
                          }
                        >
                          {drinkTiers.map((tier) => (
                            <option key={tier} value={tier}>
                              {drinkTierLabels[tier]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <div className="check-center">
                          <input
                            type="checkbox"
                            checked={person.active}
                            onChange={(e) =>
                              updatePerson(person.id, {
                                active: e.target.checked,
                              })
                            }
                          />
                        </div>
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
                          type="button"
                        >
                          ลบ
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="mobile-only mobile-stack">
              {state.people.map((person, index) => (
                <details className="mobile-card mobile-collapse-card" key={person.id} open={index === 0}>
                  <summary className="mobile-card-summary">
                    <div>
                      <strong>{person.name || `คนที่ ${index + 1}`}</strong>
                      <span>{drinkTierLabels[person.drinkTier]}</span>
                    </div>
                    <span className="mobile-summary-toggle">เปิด / ปิด</span>
                  </summary>

                  <div className="mobile-card-head">
                    <h4>ข้อมูลผู้ร่วมรายการ</h4>
                    <button
                      className="icon-btn"
                      onClick={() =>
                        setState((prev) => ({
                          ...prev,
                          people: prev.people.filter((p) => p.id !== person.id),
                        }))
                      }
                      type="button"
                    >
                      ลบ
                    </button>
                  </div>

                  <div className="mobile-form-grid">
                    <label>
                      <span>ชื่อ</span>
                      <input
                        value={person.name}
                        onChange={(e) => updatePerson(person.id, { name: e.target.value })}
                      />
                    </label>

                    <label>
                      <span>ระดับการดื่ม</span>
                      <select
                        value={person.drinkTier}
                        onChange={(e) =>
                          updatePerson(person.id, {
                            drinkTier: e.target.value as DrinkTier,
                          })
                        }
                      >
                        {drinkTiers.map((tier) => (
                          <option key={tier} value={tier}>
                            {drinkTierLabels[tier]}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      <span>หมายเหตุ</span>
                      <input
                        value={person.note || ''}
                        onChange={(e) => updatePerson(person.id, { note: e.target.value })}
                      />
                    </label>

                    <label className="mobile-checkbox-row">
                      <span>ใช้งานอยู่</span>
                      <input
                        type="checkbox"
                        checked={person.active}
                        onChange={(e) =>
                          updatePerson(person.id, {
                            active: e.target.checked,
                          })
                        }
                      />
                    </label>
                  </div>
                </details>
              ))}
            </div>
          </section>

          <section className="card block">
            <div className="section-title-row">
              <h3>ผลลัพธ์ต่อคน</h3>
            </div>

            <div className="result-list">
              {result.rows.map((row) => (
                <div className="result-card" key={row.personId}>
                  <div className="result-card-main">
                    <h4>{row.name}</h4>
                    <p>
                      กองกลาง {fmt(row.shared)} • ระดับ {fmt(row.weighted)} • ส่วนตัว {fmt(row.personal)}
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
                setState((prev) => ({
                  ...prev,
                  items: [...prev.items, emptyItem()],
                }))
              }
              type="button"
            >
              + เพิ่มรายการ
            </button>
          </div>

          {/* Desktop / Tablet */}
          <div className="table-wrap desktop-only">
            <table className="table items-table">
              <thead>
                <tr>
                  <th>ชื่อ</th>
                  <th>หมวด</th>
                  <th>Qty</th>
                  <th>ราคา</th>
                  <th>Discount %</th>
                  <th>การคำนวณ</th>
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
                        onChange={(e) =>
                          updateItem(item.id, {
                            category: e.target.value as Category,
                          })
                        }
                      >
                        {categories.map((cat) => (
                          <option key={cat} value={cat}>
                            {categoryLabels[cat]}
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
                          updateItem(item.id, {
                            unitPrice: Number(e.target.value),
                          })
                        }
                      />
                    </td>

                    <td>
                      <input
                        type="number"
                        value={item.discountPercent}
                        onChange={(e) =>
                          updateItem(item.id, {
                            discountPercent: Number(e.target.value),
                          })
                        }
                      />
                    </td>

                    <td>
                      <select
                        value={item.splitMode}
                        onChange={(e) =>
                          updateItem(item.id, {
                            splitMode: e.target.value as SplitMode,
                          })
                        }
                      >
                        {splitModes.map((modeValue) => (
                          <option key={modeValue} value={modeValue}>
                            {splitModeLabels[modeValue]}
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
                        <span className="muted">ใช้ระดับการดื่มอัตโนมัติ</span>
                      ) : (
                        <span className="muted">ไม่ต้องเลือกเพิ่มเติม</span>
                      )}
                    </td>

                    <td>
                      {fmt(
                        getNetItemTotal(
                          item.qty,
                          item.unitPrice,
                          item.discountPercent,
                        ),
                      )}
                    </td>

                    <td>
                      <button
                        className="icon-btn"
                        onClick={() =>
                          setState((prev) => ({
                            ...prev,
                            items: prev.items.filter((x) => x.id !== item.id),
                          }))
                        }
                        type="button"
                      >
                        ลบ
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="mobile-only mobile-stack">
            {state.items.map((item, index) => (
              <details className="mobile-card mobile-collapse-card" key={item.id} open={index === 0}>
                <summary className="mobile-card-summary">
                  <div>
                    <strong>{item.name || `รายการที่ ${index + 1}`}</strong>
                    <span>{categoryLabels[item.category]}</span>
                  </div>
                  <span className="mobile-summary-toggle">เปิด / ปิด</span>
                </summary>

                <div className="mobile-card-head">
                  <h4>ข้อมูลรายการ</h4>
                  <button
                    className="icon-btn"
                    onClick={() =>
                      setState((prev) => ({
                        ...prev,
                        items: prev.items.filter((x) => x.id !== item.id),
                      }))
                    }
                    type="button"
                  >
                    ลบ
                  </button>
                </div>

                <div className="mobile-form-grid">
                  <label>
                    <span>ชื่อรายการ</span>
                    <input
                      value={item.name}
                      onChange={(e) => updateItem(item.id, { name: e.target.value })}
                    />
                  </label>

                  <label>
                    <span>หมวด</span>
                    <select
                      value={item.category}
                      onChange={(e) =>
                        updateItem(item.id, { category: e.target.value as Category })
                      }
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {categoryLabels[cat]}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="mobile-inline-2">
                    <label>
                      <span>จำนวน</span>
                      <input
                        type="number"
                        value={item.qty}
                        onChange={(e) => updateItem(item.id, { qty: Number(e.target.value) })}
                      />
                    </label>

                    <label>
                      <span>ราคา</span>
                      <input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) =>
                          updateItem(item.id, { unitPrice: Number(e.target.value) })
                        }
                      />
                    </label>
                  </div>

                  <div className="mobile-inline-2">
                    <label>
                      <span>ส่วนลด (%)</span>
                      <input
                        type="number"
                        value={item.discountPercent}
                        onChange={(e) =>
                          updateItem(item.id, { discountPercent: Number(e.target.value) })
                        }
                      />
                    </label>

                    <label>
                      <span>ยอดสุทธิ</span>
                      <input
                        value={fmt(getNetItemTotal(item.qty, item.unitPrice, item.discountPercent))}
                        readOnly
                      />
                    </label>
                  </div>

                  <label>
                    <span>รูปแบบการคำนวณ</span>
                    <select
                      value={item.splitMode}
                      onChange={(e) =>
                        updateItem(item.id, { splitMode: e.target.value as SplitMode })
                      }
                    >
                      {splitModes.map((modeValue) => (
                        <option key={modeValue} value={modeValue}>
                          {splitModeLabels[modeValue]}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="mobile-extra-block">
                    <span className="mobile-block-title">ผู้ที่เกี่ยวข้อง</span>

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
                      <span className="muted">ใช้ระดับการดื่มอัตโนมัติ</span>
                    ) : (
                      <span className="muted">ไม่ต้องเลือกเพิ่มเติม</span>
                    )}
                  </div>
                </div>
              </details>
            ))}
          </div>
        </section>

        <div className="mobile-sticky-actions">
          <button className="btn secondary" type="button" onClick={onExportShareImage} disabled={exportingImage}>
            {exportingImage ? 'กำลังสร้างรูป...' : 'ส่งออกรูป'}
          </button>
          <button className="btn primary" type="button" onClick={onSave} disabled={saving}>
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
      </div>
    </div>
  );
}