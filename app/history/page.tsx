'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getBills } from '@/lib/repo';

export default function HistoryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    getBills().then(({ data, error }) => {
      if (error) setError(error.message);
      setItems(data || []);
    });
  }, []);

  return (
    <main className="page-wrap">
      <section className="hero card">
        <div>
          <div className="eyebrow">History</div>
          <h1>ประวัติบิลย้อนหลัง</h1>
          <p>เลือกบิลเพื่อดูรายละเอียด snapshot และข้อมูลแยกตาราง</p>
        </div>
        <Link className="btn secondary" href="/bill/create">+ สร้างบิลใหม่</Link>
      </section>

      {error ? <p className="message">{error}</p> : null}

      <section className="list">
        {items.map((item) => (
          <div className="list-card" key={item.id}>
            <div>
              <h4>{item.name || 'ไม่มีชื่อบิล'}</h4>
              <p className="muted">วันที่: {item.event_date || '-'} | สร้างเมื่อ: {new Date(item.created_at).toLocaleString('th-TH')}</p>
            </div>
            <Link className="btn primary" href={`/bill/${item.id}`}>เปิดดู</Link>
          </div>
        ))}
        {items.length === 0 ? <div className="list-card"><p className="muted">ยังไม่มีข้อมูลบิล</p></div> : null}
      </section>
    </main>
  );
}
